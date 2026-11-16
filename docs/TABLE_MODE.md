# Table Mode prototype

Table Mode is an experimental touchscreen-first control surface served by the existing TTS Mobile Helper companion at `/table`. It keeps TTS as the renderer, physics engine, Workshop loader, save format, and Lua runtime.

## Current proof of concept

- Responsive shared-screen UI with large touch targets.
- The overhead preset uses `Player[color].setCameraMode("TopDown")`; the four angled presets use `Player[color].lookAt(...)`.
- Read-only top-down scene map built from a Lua snapshot of public tabletop objects.
- Object snapshot includes GUID, display-safe label, type, X/Z position, yaw, bounds footprint, and lock state.
- Objects in player hands and actively held by a player are filtered out before the snapshot is sent; face-down cards receive a generic label.
- Object snapshots are sent after initial sync and after pick-up/drop, spawn/destroy, rotate, state, zone, and container events; actively held objects and private hand objects are omitted. The UI can request a manual refresh.
- The existing phone-based player interface remains separate and continues to own private hand display and hand actions.

## Run

1. Use the matching Python companion server and `helper_object_mobile_actions.lua` from this branch. The helper protocol is now version 2. Protocol-aware older builds report a version mismatch; older protocol-less builds may continue syncing existing hand features but will not publish the new scene-object stream.
2. Start TTS and load the Mobile Helper Lua object into the active table using Additive Load, or paste the matching script into a scripted helper object.
3. Start the Python companion server on the TTS PC.
4. Open `http://127.0.0.1:5001/table` on the host PC, or the host's LAN address from a touchscreen on the same trusted network.
5. Choose a player camera. Use Refresh map to request a fresh scene snapshot.

The four angled camera presets currently center on world origin. The TopDown preset uses the native camera mode. The labels North/East/South/West are provisional world-axis labels and need visual confirmation in TTS. The scene map is a read-only X/Z projection; it is not a live 3D render and does not yet move TTS objects.

## Architecture and compatibility

- **TTS engine:** remains authoritative for object identity, transforms, physics, collisions, scripts, and rendering.
- **Lua helper:** uses documented `getAllObjects()`, `Object.getGUID()`, `getPosition()`, `getRotation()`, `getBounds()`, and `Player.getHandObjects()` APIs to collect a sanitized scene snapshot. It uses TTS object events to refresh the snapshot.
- **Python companion:** validates loopback-only Lua updates, bounds the snapshot size and field ranges, stores the current public scene, and emits it only to admin sessions.
- **Touchscreen UI:** renders a 2D read-only map and camera controls; it does not inject mouse events or simulate native TTS dragging.
- **Private player interfaces:** player hands remain on the existing per-color mobile UI. Hand-object GUIDs are removed from the shared scene snapshot, and face-down cards are labelled generically.
- **Workshop compatibility:** the helper is additive; no existing Workshop object or script is modified. Compatibility still needs live testing because some games use custom hand logic, unusual objects, fog-of-war, or large scripted tables.

## Verified API facts

- The External Editor API accepts a custom table message and forwards it to the loaded game's `onExternalMessage(data)` handler.
- `Player.setCameraMode("TopDown")` selects TTS's native TopDown camera mode. `Player.lookAt(parameters)` accepts a center position, pitch, yaw, and distance, and forces third-person camera mode.
- `getAllObjects()` returns the game's objects except hand zones; `getObjects()` includes hand zones.
- Object APIs expose world position, rotation, and bounds suitable for a 2D scene projection. Player APIs expose both hand objects and objects currently being held, allowing the helper to omit them from the shared map.
- The official TTS knowledge base lists touchscreen optimization and local hot-seat multiplayer. That does not establish that the current client exposes a general multitouch API to Lua.

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
5. Game with custom hand zones, fog-of-war, and scripted object movement.

For each, verify initial snapshot, object spawn/drop/rotate/destroy refresh, no private hand leakage, map accuracy, camera targeting for seated and spectator colors, and that existing Workshop scripts and mobile hand actions still work.

## Current limitations and next milestones

1. **Current:** read-only object map and camera presets. Object updates are event-driven, not frame-by-frame; an object is omitted while held and reappears after drop. Physics-driven movement between tracked events can leave the map temporarily stale.
2. **Next:** add a tap-to-select command path and one-object move/rotate controls with strict server-side allowlisting, stale-position checks, and explicit Lua result acknowledgements.
3. Add table bounds and center detection to make camera framing adapt to different Workshop tables.
4. Evaluate native multitouch and physics dragging separately; Lua transforms are not equivalent to native TTS grabbing.
5. Test compatibility against a representative set of real Workshop games before adding more controls.

## Security note

The existing companion is designed for a trusted local network. Its admin role is a client-declared session flag rather than strong authentication. Do not expose port 5001 to an untrusted network or the public internet.
