# BLOOPPAD-MAXX Playground

A browser arcade and pixel studio for one to four BLOOPPAD-MAXX units. Everything works without hardware.

## Run

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Use a Chromium browser on HTTPS or localhost for Web MIDI. Click **Connect BLOOPPAD** to request MIDI SysEx permission.

## Flash firmware

Click **Flash firmware** to install an official release or a local `.bin` file. Disconnect the pad, hold its board boot button while reconnecting USB, then select the WCH bootloader when prompted. The app checks for the CH32X035G8U6 ISP ID before writing and verifies the flash after installation. WebUSB requires a compatible browser on HTTPS or localhost. On Windows, the bootloader may require a WinUSB driver.

Published versions are listed live from the [BLOOPPAD-MAXX GitHub releases API](https://github.com/phyx-be/BLOOPPAD-MAXX/releases). The browser verifies each downloaded binary against GitHub's release size and SHA-256 digest. GitHub's binary host does not allow the browser to read release assets across origins, so a narrow Vercel Function in `proxy/api/firmware.ts` retrieves only official `firmware.bin` assets by ID. Firmware is not bundled with the site. Local files never leave the browser.

The proxy is deployed at `https://blooppad-maxx-firmware-proxy.vercel.app` from the `proxy/` directory. The GitHub Actions repository variable `FIRMWARE_PROXY_ORIGIN` points to this origin; the Pages build passes it to Vite as `VITE_FIRMWARE_PROXY_ORIGIN`. For local development, add `VITE_FIRMWARE_PROXY_ORIGIN=http://localhost:3000` to `.env.local` and run `vercel dev` from `proxy/` alongside the Vite dev server. The Vercel Function accepts requests from `https://drskunk.github.io` and local Vite on port 5173. No GitHub token is needed for the public releases.

```sh
npm run build  # TypeScript + production bundle
npm run lint
npm test      # Node 22.6+; simulated protocol and engine tests
```

## Experiences

- **Tetris:** seven tetrominoes, rotation with wall kicks, soft/hard drops, next piece, score, line clearing and increasing difficulty.
- **Marquee:** editable scrolling text using a 5×7 font, plus rainbow waves and color ripples. Supports A–Z, digits, spaces and basic punctuation; other characters use a question-mark glyph.
- **Snake:** food, growth, score and self collision. Wrapping around the outer edges of the playfield is on by default; turn it off in the score panel to make walls end the game.
- **Game of Life:** toggle cells directly on the simulator or hardware, even while running. Start/pause evolution, step a generation, load a glider or random seed, clear the grid, and save/restore a custom starting pattern. Uses Conway’s B3/S23 rules with non-wrapping edges; adjacent pads share neighbors.
- **Lights Out:** press a cell to flip it and its four orthogonal neighbors. Turn all lights off to win. Tracks moves, generates solvable puzzles, supports retrying the same puzzle, and scrolls the result on the pads. Pause blocks moves; New puzzle and Reset generate another puzzle.
- **Rainbow:** a continuous animated color field.
- **Pixel studio:** paint or erase pixels, save up to 200 frames, play the sequence, import/export JSON. Export frames before resetting or changing modes/layouts; edits are held in memory.

At the end of Tetris or Snake, a brief pink impact pulse expands across the pads, followed by a colorful `SCORE <total>` reveal and a gently pulsing `PLAY AGAIN` marquee. The score and replay prompt alternate across the simulator and connected pads, including multi-pad layouts. After the opening flash, press any pad or click Play again to restart; Reset and mode/layout changes also stop the animation. The final score stays in the score panel until restart.

Use Start/Pause and Reset. Arrow keys move; Tetris uses Up to rotate, Down to soft drop and Space to hard drop. P toggles pause. Onscreen/hardware grid presses map the top third to Up, middle left/right to movement, and bottom third to Down. In Pixel studio, press a cell to paint; Enter also paints a focused cell. The app pauses on window blur.

When a pad first connects, it shows a game menu on its LEDs. Tap the red top band for **Tug of war (two players)**, the blue middle band for **Connect four (two players)**, or the amber bottom band for **Tetris**. Both two-player choices use human players, with red as player one and blue as player two. Press both top corner buttons together during a game to reopen the menu, or use **Game menu** in the browser. The simulator mirrors the menu, and each connected pad shows the same three choices. The browser must remain connected; this menu does not run in the pad firmware.

## Multiple pads

Choose 1–4 pads and a horizontal or vertical layout (8×8 through 32×8 or 8×32). Layout changes reset the experience. Pads are numbered left-to-right or top-to-bottom, without rotation.

Assign each physical unit's input and output explicitly in the connection panel. Assignments are exclusive. Only a single unambiguous input/output pair is selected automatically. Port names alone cannot pair multiple identical devices. The panel reports input and output discovery separately and preserves port IDs for reconnection.

Use the corner test to verify orientation: top-left red, top-right green, bottom-left blue, bottom-right white. This temporarily replaces the mirrored frame; uncheck to return to the experience.

## Architecture and protocol

- `src/lib/engine.ts`: browser-only experience state, `onPad`, elapsed-time `update`, and row-major RGB `render`.
- `src/lib/midi.ts`: independent Web MIDI adapter, explicit assignments, hotplug/listener cleanup, held-state deduplication and releases, successful-send-only caching and error reporting.
- `src/App.tsx`: one animation scheduler, simulator/input routing, UI, brightness/saturation and per-pad frame slicing.

Protocol follows the supplied integration guide and `~/github.com/Fri3dCamp/fri3d-scratcher/src/lib/midi.ts`. Inputs accept only `B0 address value`; button coordinates are the address nibbles. LEDs use `F0 13 37 [address R G B]… F7`, with address `(row << 4) | (8 + column)` and 8-bit channels clamped then shifted right once. Full frames are 260 bytes. Changed cells are batched; a reconnect or failed send invalidates the cache. The flasher uses a separate WebUSB bootloader connection; the playground still has no MIDI handshake, server, audio or competing startup animation.

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

## GitHub Pages CI/CD

`.github/workflows/pages.yml` runs on pull requests to `main`, pushes to `main`, and manual dispatches. It installs the lockfile dependencies with Node 24, treats lint warnings as failures, runs the tests, and builds the production app. Successful pushes or manual runs on `main` upload `dist` and deploy to the `github-pages` environment. Pull requests never deploy or receive deployment permissions. Deployments are serialized without interrupting an active publish.

To activate it after pushing this folder to a GitHub repository:

1. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
2. Push to `main`, or run **CI and GitHub Pages** from the Actions tab on `main`.
3. Open the URL shown by the deployment job. No personal access token or extra secrets are required.

If the default branch has another name, update the branch filters and both `refs/heads/main` guards in the workflow. Vite emits relative asset URLs, so the same build works under `/blooppad-maxx-playground/`, another repository path, or a custom domain. GitHub Pages HTTPS also provides the secure context needed for Web MIDI.

GitHub Pages is configured to publish via Actions at https://drskunk.github.io/blooppad-maxx-playground/.

References: [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite deployment guide](https://vite.dev/guide/static-deploy.html).
