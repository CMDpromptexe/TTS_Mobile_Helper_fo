# Table Mode prototype

Table Mode is an experimental touchscreen-first control surface served by the existing TTS Mobile Helper companion at `/table`. It keeps TTS as the renderer, physics engine, Workshop loader, save format, and Lua runtime.

## Current proof of concept

- Responsive shared-screen UI with large touch targets.
- The overhead preset uses `Player[color].setCameraMode("TopDown")`; the four angled presets use `Player[color].lookAt(...)`.
- Read-only top-down scene map built from a Lua snapshot of table objects; it is currently a host-level view, not a per-player visibility-filtered view.
- Object snapshot includes GUID, display-safe label, type, X/Z position, yaw, bounds footprint, and lock state.
- Objects in player hands and actively held by a player are filtered out before the snapshot is sent; face-down cards receive a generic label. Fog of War, hidden zones, and arbitrary per-player invisible hiders are not filtered.
- Object snapshots are sent after initial sync and after pick-up/drop, spawn/destroy, rotate, state, zone, and container events; actively held objects and private hand objects are omitted. The UI can request a manual refresh.
- The existing phone-based player interface remains separate and continues to own private hand display and hand actions.

## Run

1. Use the matching Python companion server and `helper_object_mobile_actions.lua` from this branch. The helper protocol is version 2. Protocol-aware older builds report a version mismatch; older protocol-less builds may continue syncing hand features but will not publish the scene-object stream.
2. Start TTS and additively load the Mobile Helper Lua object, or paste the matching script into a scripted helper object.
3. Start the Python companion server on the TTS PC.
4. Scan the **Table Mode (Host Surface)** QR code printed in the companion console. The token is generated for that server process, exchanged for an HttpOnly cookie, and changes on restart. Do not distribute it outside the trusted play group.
5. Choose a player camera. The scene map remains disabled until the host explicitly enables it; use Refresh map only after enabling it.

The four angled camera presets currently center on world origin. The TopDown preset uses the native camera mode. The labels North/East/South/West are provisional world-axis labels and need visual confirmation in TTS. The scene map is a read-only X/Z projection; it is not a live 3D render and does not yet move TTS objects.

## Architecture and compatibility

- **TTS engine:** remains authoritative for object identity, transforms, physics, collisions, scripts, and rendering.
- **Network boundary:** the companion's LAN connection serves browser interfaces to the host PC; it does not create LAN multiplayer for TTS itself. The TTS session remains one local hot-seat instance or uses TTS's normal Steam peer-to-peer multiplayer.
- **Lua helper:** uses documented `getAllObjects()`, `Object.getGUID()`, `getPosition()`, `getRotation()`, `getBounds()`, and `Player.getHandObjects()` APIs to collect a sanitized scene snapshot. It uses TTS object events to refresh the snapshot.
- **Python companion:** validates loopback-only Lua updates, bounds the snapshot size and field ranges, stores the host-level scene snapshot, and emits it only to a Table Mode session authorized by the startup token cookie. The scene inventory is withheld server-side until the host enables the map.
- **Touchscreen UI:** renders a 2D read-only map and camera controls; it does not inject mouse events or simulate native TTS dragging.
- **Private player interfaces:** player hands remain on the existing per-color mobile UI. Hand-object GUIDs are removed from the shared scene snapshot, and face-down cards are labelled generically.
- **Workshop compatibility:** the helper is additive; no existing Workshop object or script is modified. Compatibility still needs live testing because some games use custom hand logic, unusual objects, fog-of-war, or large scripted tables.

## Verified API facts

- The External Editor API accepts a custom table message and forwards it to the loaded game's `onExternalMessage(data)` handler.
- `Player.setCameraMode("TopDown")` selects TTS's native TopDown camera mode. `Player.lookAt(parameters)` accepts a center position, pitch, yaw, and distance, and forces third-person camera mode.
- TTS's Lua implementation is based on Lua 5.2. CI runs `luac5.2 -p` against the helper for syntax validation; this does not execute TTS API calls or prove runtime compatibility.
- `getAllObjects()` returns the game's objects except hand zones; `getObjects()` includes hand zones.
- Object APIs expose world position, rotation, and bounds suitable for a 2D scene projection. Player APIs expose both hand objects and objects currently being held, allowing the helper to omit them from the shared map.
- Current official v14.2 patch notes (October 2, 2026) document the Unity 6.3 engine update and hotseat overhaul, but do not describe a new general multitouch or raw touch-event API. The scripting API exposes pointer state and object transforms, not a general multi-contact input surface. This is an API-surface finding, not proof that every device's OS-level touch emulation fails.

## What does not require a TTS engine modification

- Companion web UI, LAN communication, camera presets, object snapshots, filtering private hand objects, and selected-object commands that call supported Lua transforms.
- A simple tap-to-select interface can be built from the map without touching TTS input.

## What likely requires engine-level input support (or a separate input bridge)

- Reliable multi-contact tracking inside the native TTS viewport.
- Two-finger gestures that control the native camera while another finger manipulates an object.
- Native physics grabbing, hover, context menus, and drag/drop from the browser's touch surface without translating into fragile mouse emulation.
- Per-player simultaneous native object grabs with correct ownership and collision behavior.

Public TTS feedback includes a touchscreen feature request for pinch zoom, two-finger rotation, tap context menus, and long-press dragging, plus a separate archived report of single-touch/offset problems. These reports are evidence of longstanding friction, not a definitive statement about every current device or build.

## Compatibility test matrix

Run the same helper against an unmodified vanilla table and unmodified Workshop saves:

1. Vanilla table with dice, blocks, cards, decks, and tokens.
2. Scripted Workshop game with custom object buttons and snap points.
3. Game with hidden/face-down cards and private player hands.
4. Game with bags/decks, custom models, and a large object count.
5. Game with custom hand zones, fog-of-war, hidden zones, and scripted object movement. Treat this as a negative privacy test until visibility filtering exists.

For each, verify initial snapshot, object spawn/drop/rotate/destroy refresh, no private hand leakage, map accuracy, camera targeting for seated and spectator colors, and that existing Workshop scripts and mobile hand actions still work.

## Current limitations and next milestones

1. **Current:** read-only host-level object map and camera presets. It omits hand/held objects and masks face-down card names, but does not respect Fog of War, hidden zones, or custom invisibility rules. Do not use the map for hidden-information games yet. Object updates are event-driven, not frame-by-frame; physics-driven movement between tracked events can leave it temporarily stale.
2. **Next:** add one-object move/rotate controls for explicitly enabled public-information tables. Require the authorized host session, a current snapshot, an unlocked non-card/non-container/non-zone object, stale-position checks in both Python and Lua, and an explicit Lua result acknowledgement.
3. Add table bounds and center detection to make camera framing adapt to different Workshop tables.
4. Design a per-player visibility strategy before ever treating the map as safe for hidden-information games; the current host acknowledgement is not a visibility filter.
5. Evaluate native multitouch and physics dragging separately; Lua transforms are not equivalent to native TTS grabbing.
6. Test compatibility against a representative set of unmodified Workshop games before adding more controls.

## Visibility limitation

The object map is not yet safe for hidden-information games. TTS exposes object hiding and Fog of War configuration, but the reviewed public API does not provide a general per-player visibility query for arbitrary custom hiders. The map is therefore a host-level inventory of scene objects, not a faithful projection of what each player is allowed to see. The host acknowledgement is now enforced by the companion: while disabled, no scene-object inventory is sent to Table Mode browsers. Enabling it is still an explicit trust decision, not a technical visibility filter. Keep it disabled when a Workshop game relies on Fog of War, hidden zones, or custom `setHiddenFrom`/`setInvisibleTo` behavior.

## Security note

Table Mode has a separate random per-process token distributed through the startup QR code. The browser exchanges it for an HttpOnly, SameSite=Strict cookie; the token is not embedded in the Table Mode JavaScript, and Table Mode socket events require both the cookie-authorized session and the admin flag. The scene-map enable/disable decision is enforced by the server and resets when the helper syncs a new TTS session.

This is a lightweight shared-secret gate for a trusted LAN, not full user authentication: the initial link is delivered over local HTTP, so someone able to observe the LAN traffic could capture it. The original mobile admin interface retains its existing client-declared admin behavior. Do not expose port 5001 to an untrusted network or the public internet.

## References

- [TTS External Editor API](https://api.tabletopsimulator.com/externaleditorapi/) — localhost TCP messaging and custom messages forwarded to `onExternalMessage(data)`.
- [TTS Events API](https://api.tabletopsimulator.com/events/) — `onExternalMessage` and object lifecycle events.
- [TTS Base API](https://api.tabletopsimulator.com/base/) — `getAllObjects()`, `getObjects()`, and `getObjectFromGUID()`.
- [TTS Object API](https://api.tabletopsimulator.com/object/) — object transforms, bounds, lock state, zones, and object hiding methods.
- [TTS Player Instance API](https://api.tabletopsimulator.com/player/instance/) — hand objects, held objects, pointer state, `setCameraMode()`, and `lookAt()`.
- [TTS v14.2 patch notes](https://tabletopsimulator.com/news/patch-notes) — October 2, 2026 engine and hotseat update.
- [Touchscreen interface request #2172](https://tabletopsimulator.nolt.io/2172) — requested pinch zoom, two-finger rotation, tap context menus, and long-press dragging.
- [Archived single-touch/offset report #2784](https://tabletopsimulator.nolt.io/2784) — user-reported single-touch limitation and pointer offset; not a definitive test of current builds.
- [TouchOSC camera-controller experiment](https://www.reddit.com/r/tabletopsimulator/comments/h80jwb/) — external touch controls mapped through TouchOSC Bridge and OSCulator to TTS camera keybinds.
