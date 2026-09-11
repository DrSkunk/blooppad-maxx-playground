# BLOOPPAD-MAXX Playground

A browser arcade and pixel studio for one to four BLOOPPAD-MAXX units. Everything works without hardware.

## Run

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Use a Chromium browser on HTTPS or localhost for Web MIDI. Click **Connect BLOOPPAD** to request MIDI SysEx permission.

```sh
npm run build  # TypeScript + production bundle
npm run lint
npm test      # Node 22.6+; simulated protocol and engine tests
```

## Experiences

- **Tetris:** seven tetrominoes, rotation with wall kicks, ghost landing preview, soft/hard drops, next piece, score, line clearing and increasing difficulty.
- **Lichtkrant:** editable scrolling text using a 5×7 font, plus rainbow waves and color ripples. Supports A–Z, digits, spaces and basic punctuation; other characters use a question-mark glyph.
- **Snake:** food, growth, score and wall/self collision.
- **Rainbow:** a continuous animated color field.
- **Pixel studio:** paint or erase pixels, save up to 200 frames, play the sequence, import/export JSON. Export frames before resetting or changing modes/layouts; edits are held in memory.

Use Start/Pause and Reset. Arrow keys move; Tetris uses Up to rotate, Down to soft drop and Space to hard drop. P toggles pause. Onscreen/hardware grid presses map the top third to Up, middle left/right to movement, and bottom third to Down. In Pixel studio, press a cell to paint; Enter also paints a focused cell. The app pauses on window blur.

## Multiple pads

Choose 1–4 pads and a horizontal or vertical layout (8×8 through 32×8 or 8×32). Layout changes reset the experience. Pads are numbered left-to-right or top-to-bottom, without rotation.

Assign each physical unit's input and output explicitly in the connection panel. Assignments are exclusive. Only a single unambiguous input/output pair is selected automatically. Port names alone cannot pair multiple identical devices. The panel reports input and output discovery separately and preserves port IDs for reconnection.

Use the corner test to verify orientation: top-left red, top-right green, bottom-left blue, bottom-right white. This temporarily replaces the mirrored frame; uncheck to return to the experience.

## Architecture and protocol

- `src/lib/engine.ts`: browser-only experience state, `onPad`, elapsed-time `update`, and row-major RGB `render`.
- `src/lib/midi.ts`: independent Web MIDI adapter, explicit assignments, hotplug/listener cleanup, held-state deduplication and releases, successful-send-only caching and error reporting.
- `src/App.tsx`: one animation scheduler, simulator/input routing, UI, brightness/saturation and per-pad frame slicing.

Protocol follows the supplied integration guide and `~/github.com/Fri3dCamp/fri3d-scratcher/src/lib/midi.ts`. Inputs accept only `B0 address value`; button coordinates are the address nibbles. LEDs use `F0 13 37 [address R G B]… F7`, with address `(row << 4) | (8 + column)` and 8-bit channels clamped then shifted right once. Full frames are 260 bytes. Changed cells are batched; a reconnect or failed send invalidates the cache. No firmware upload, handshake, server, audio or competing startup animation is used.

Brightness affects the simulator and hardware equally. Optional saturation boost defaults off. The default output rate of 30 fps is an application setting, not a measured hardware limit.

## Animation JSON

```json
{
  "version": 1,
  "width": 8,
  "height": 8,
  "frames": ["replace with an array of 64 [red, green, blue] tuples"]
}
```

Each frame must contain `width × height` RGB tuples, with finite channels from 0–255. Import dimensions must match the current canvas. The file limit is 5 MB, and the frame limit is 200. Playback is 4 frames per second multiplied by the speed setting.

## Verification limits

Automated tests use mock MIDI ports, not physical devices. They check exact bytes, corner addresses, 260-byte full frames, batching, duplicate suppression/releases, exclusive assignment, reconnect repaint, send failure recovery, listener cleanup, game rules and all supported canvas sizes. Browser verification checks the simulator, keyboard controls, mode switching, scroller, painting/frame playback and multi-pad layouts.

Physical orientation, real device pairing, USB/MIDI throughput and hardware reconnect behavior still need checking on BLOOPPAD-MAXX units.
