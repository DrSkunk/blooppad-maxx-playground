# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: makers and hackers who own one or more BLOOPPAD-MAXX units. They open the playground to flash firmware, test the MIDI/SysEx protocol and LED orientation, wire up multi-pad layouts, and run the built-in games and pixel tools on real hardware. Casual players and visitors without a pad are a secondary audience the simulator still serves.

## Product Purpose

A browser companion for the BLOOPPAD-MAXX, organised as journeys: learn the pad's built-in firmware menu, play browser games with the pad in MIDI mode, flash firmware, understand the hardware, and hack the protocol. Runs entirely client-side. Success means a maker can go from a fresh pad to verified firmware, correctly assigned and oriented devices, and a running experience without installing anything.

## Positioning

Endorsed companion to the BLOOPPAD-MAXX hardware project (github.com/phyx-be/BLOOPPAD-MAXX). It speaks the pad's own Web MIDI protocol and WCH bootloader directly from the browser, so firmware, device management and play live in one page with no native tooling.

## Operating Context

- Chromium browser on HTTPS or localhost; Web MIDI with SysEx permission for play, WebUSB for flashing.
- Firmware menu: plugging in shows the version, then CHOOSE GAME. Top row holds the original games, bottom row the newer ones with MIDI mode at bottom-right. Press once to select, again to start. Games return to the menu after their result screen; MIDI mode only leaves on replug.
- Browser games require the pad in MIDI mode.
- Flashing: from the menu or MIDI mode the firmware accepts the reboot SysEx `F0 13 37 00 42 4F 4F F7` and enters the WCH bootloader (LEDs dim purple, times out after a few seconds). Fallback: hold the board boot button while reconnecting USB. Windows may need a WinUSB driver.
- Multi-pad setups: 1–4 pads, horizontal or vertical (8×8 up to 32×8 / 8×32), explicit per-unit input/output assignment, corner test for orientation.
- Browser menu on the pad (tug of war, connect four, Tetris), driven by the connected browser in MIDI mode. Always labelled as the browser's menu so it is not confused with the firmware menu.
- Deployed on GitHub Pages; firmware releases fetched through a cached Vercel proxy.

## Capabilities and Constraints

- Experiences: Tetris, Marquee, Snake, Game of Life, Lights Out, Rainbow, Pixel studio (up to 200 frames, JSON import/export), plus two-player tug of war and connect four.
- Everything is playable in the simulator without hardware (current behavior; not marked by the user as a binding commitment).
- No server, accounts, audio or MIDI handshake. Edits are held in memory; export before reset.
- Physical orientation, real pairing, throughput and reconnect behavior remain unverified on hardware.
- Tracks: Pad menu, Browser games, Flash firmware, Hardware, Hack.
- Terminology: "pad", "BLOOPPAD-MAXX", "game menu" (firmware), "browser menu" (this site), "MIDI mode", "bootloader", "simulator", "layout", "corner test".

## Brand Commitments

- Name: BLOOPPAD-MAXX, written in caps with hyphen.
- Endorsed by the hardware project: may present itself as its companion playground.
- Existing playful copy ("Small grid. Big ideas.", "Made for curious fingers") exists but the user did not make the voice binding.

## Evidence on Hand

- Official firmware releases via the BLOOPPAD-MAXX GitHub releases API.
- Hardware photos from the hardware repo's `media/` folder (Exposed and PCB), resized to WebP in `public/media/` and credited in captions.
- Firmware facts come from the hardware repo's README, GAMES.md and firmware source; the firmware font and menu table are ported in `src/lib/firmwareFont.ts` and `src/lib/firmwareMenu.ts` (Apache-2.0).
- No testimonials, user counts, press or benchmarks; do not invent them.

## Product Principles

1. Flashing is safe by construction: official release assets only, size and SHA-256 verified, chip ID checked before write, flash verified after; local `.bin` files never leave the browser. Never weaken this.
2. Hardware truth over guesswork: show real device state, explicit assignments and clear errors rather than auto-magic.
3. Maker depth without friction: protocol, layout and firmware tools are first-class, but a pad should still light up in a few clicks.
4. Fully client-side: no install, no account, no data leaves the browser except fetching official firmware.
