# Table Mode prototype

Table Mode is an experimental touchscreen-oriented control surface served by the existing Mobile Helper application at `/table`.

## Current proof of concept

- Separate responsive page designed for a large horizontal touch display.
- Admin-only Socket.IO event for camera commands.
- Camera presets sent through the existing External Editor API custom-message channel.
- Lua helper applies presets with the documented `Player[color].lookAt(...)` method.
- Existing phone-based player interface remains unchanged.

## Run

1. Start the Mobile Helper server on the PC running Tabletop Simulator.
2. Load the matching Mobile Helper Lua object into the active TTS table.
3. Open `http://127.0.0.1:5001/table` on the TTS PC, or use the PC's LAN address from the touchscreen.
4. Select the player color whose camera should move and choose a camera preset.

The camera command currently centers on the TTS world origin (0, 0, 0). It does not yet discover the board bounds or move tabletop objects.

## Security and compatibility

The existing helper is designed for a trusted local network. The Table Mode page joins using an admin session, consistent with the existing companion admin model. Do not expose port 5001 to an untrusted network.

This feature does not alter Workshop game objects or game scripts. It requires the matching Mobile Helper Lua object. Camera control is implemented using the documented TTS Player API; actual behavior should be verified in a live TTS session for seated and spectator views.

## Next milestones

1. Add a Lua table-object snapshot stream with GUID, name, position, rotation, and bounds.
2. Render a lightweight 2D top-down object map in Table Mode.
3. Add validated move/rotate commands for selected objects, with server-side bounds and payload validation.
4. Evaluate native multitouch and physics dragging separately; Lua-mediated transforms are not equivalent to native TTS grabbing.
