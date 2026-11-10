---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: BLOOPPAD-MAXX companion (all tracks)

Mode: Operate on the pad map and tools (browser games, flasher); Read on Hardware and Hack.
Audience: makers who own a pad. Jobs: understand the hardware, play the built-in firmware games, put the pad in MIDI mode for browser games, flash firmware, hack the protocol.
Constraints: facts only from phyx-be/BLOOPPAD-MAXX (README, GAMES.md, firmware source) and this repo. Flashing safety unchanged.

## Direction contract

THESIS: The pad is the map. The home screen is the real firmware menu, rendered pixel-for-pixel, so learning the site and learning the pad are the same act. Refuses the "game launcher with a flasher button" layout.
OWN-WORLD: Clean black and white, user-pinned. Pure black on white or white on black following prefers-color-scheme; rectangles only, no radii; hairline borders; active states invert (fg fill, bg text); color exists only in the LEDs, and the simulated pad stays a dark object in both schemes.
STORY: Visitor sees their own pad's menu, taps a button, learns what it does and how to start and leave it; finds the white MIDI button leads to browser games; flashes firmware with one click; digs into PCB files and protocol.
FIRST VIEWPORT: Top bar with the five tracks. Left: large simulated pad showing the firmware menu (top row originals, bottom row newer + MIDI, "CHOOSE GAME" scrolling in rows 2–6). Right: manual panel for the selected button, defaulting to how the menu works. Primary action: tap a pad button.
FORM: Pad as map, structure 5 of 7 on the ordered list (dealt 4, 3, 5; user locked 5). seed:66e511d91fd77e85
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
