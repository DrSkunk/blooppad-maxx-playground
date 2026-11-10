---
name: BLOOPPAD-MAXX Playground
description: A clean black-and-white workbench for flashing, wiring and playing BLOOPPAD-MAXX pads in the browser.
colors:
  app: "#ffffff"
  app-light: "#000000"
  canvas: "#000000"
  canvas-light: "#ffffff"
  sidebar: "#000000"
  sidebar-light: "#ffffff"
  panel: "#000000"
  panel-light: "#ffffff"
  card: "#0a0a0a"
  card-light: "#ffffff"
  surface: "#171717"
  surface-light: "#f2f2f2"
  line: "#2e2e2e"
  line-light: "#d4d4d4"
  line-soft: "#1f1f1f"
  line-soft-light: "#e5e5e5"
  line-strong: "#ffffff"
  line-strong-light: "#000000"
  nav: "#a3a3a3"
  nav-light: "#404040"
  muted: "#a3a3a3"
  muted-light: "#525252"
  dim: "#8a8a8a"
  dim-light: "#6b6b6b"
  success: "#ffffff"
  success-light: "#000000"
  danger: "#ff6b6b"
  danger-light: "#b91c1c"
  pad: "#333333"
  pad-light: "#000000"
  pad-shell: "#0d0d0d"
  pad-shell-light: "#141414"
  pad-bed: "#000000"
  pixel: "#1a1a1a"
  pad-text: "#8a8a8a"
  led-red: "#ff0000"
  led-blue: "#6799ff"
  led-amber: "#ffb74d"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  score:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    letterSpacing: "0.025em"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  nav:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  lead:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5rem
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.25rem
  control:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.5rem"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  page-max: "1400px"
  side-column: "264px"
components:
  button-primary:
    backgroundColor: "{colors.app}"
    textColor: "{colors.canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.app}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  choice-active:
    backgroundColor: "{colors.app}"
    textColor: "{colors.canvas}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.nav}"
    typography: "{typography.nav}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  nav-item-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.app}"
  nav-item-active:
    backgroundColor: "{colors.app}"
    textColor: "{colors.canvas}"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.app}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.app}"
    rounded: "{rounded.none}"
    padding: "20px"
  hardware-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.app}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "24px"
  segmented-active:
    backgroundColor: "{colors.app}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.none}"
    padding: "8px 4px"
  value-chip:
    backgroundColor: "{colors.app}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.none}"
    padding: "4px 6px"
  pad-shell:
    backgroundColor: "{colors.pad-shell}"
    rounded: "{rounded.none}"
    padding: "24px 24px 12px"
  pad-pixel:
    backgroundColor: "{colors.pixel}"
    rounded: "{rounded.none}"
---

# Design System: BLOOPPAD-MAXX Playground

## Overview

**Creative North Star: "The Black Rectangle"**

Clean black and white, built from rectangles. The chrome is pure monochrome: a black page with white type in the dark scheme, a white page with black type in the light scheme, chosen by the visitor's `prefers-color-scheme` and nothing else. There is no accent hue. State is shown by inversion: the current track, the chosen option and the primary action are filled with the foreground color and lettered in the background color. Every corner is square, enforced globally.

The pads are the exception that makes the system work. The simulated BLOOPPAD-MAXX is a dark object in both schemes, so its LEDs read true on a white page as well as a black one, and the LEDs carry all the color on screen. The only other place color appears is the text label that names an LED choice. Depth is flat: hairlines and a few grey steps separate surfaces; nothing casts a shadow, and the one glow is the halo of a lit LED.

Controls stay dense and exact: dimensions, pad counts, port IDs, versions and scores sit up front as data. Rejected on the chrome: neon or cyberpunk styling (glowing gradients, scanlines, synthwave palettes).

**Key Characteristics:**
- Monochrome chrome with paired dark and light values that follow the system color scheme.
- Selection and primary actions invert: foreground fill, background-colored text.
- Square corners everywhere (`border-radius: 0` on every element and pseudo-element).
- Hardware-task panels marked by a full-contrast hairline, not by a tint.
- A dark simulated pad in both schemes; color lives only in LED pixels and the labels that name LED colors.
- Space Grotesk for headings and numbers, DM Sans for everything else.

## Colors

Black, white and a short grey ladder, with every token defined twice: the unsuffixed value is the dark default, the `-light` value applies under `prefers-color-scheme: light`. A manual override sets `data-theme="light"` or `"dark"` on the root element and wins over the system; without it the system decides.

### Primary
- **Foreground** (`app` / `app-light`): body text, headings, the primary button fill, the inverted active state (track bar, experience strip, segmented options, source choices, value chips), the focus outline, `accent-color` for ranges and checkboxes, and text selection.

### Tertiary
- **LED Red / LED Blue / LED Amber** (`led-red`, `led-blue`, `led-amber`): player one, player two and the Tetris band. They appear on lit pixels and on the text labels that name those choices. The paint palette and the firmware game colors behave the same way: on pixels and on swatches only.

### Neutral
- **Canvas** (`canvas` / `canvas-light`): page background, hardware-panel background, segmented-control trough, code blocks; also the text color on inverted fills.
- **Sidebar / Panel** (`sidebar`, `panel` and their `-light` pairs): track bar and stage panel. Same value as Canvas in both schemes; separated by hairlines, not tone.
- **Card** (`card` / `card-light`): side cards, the manual panel, pin cards, row-link hover. One step off black in dark, white in light.
- **Surface** (`surface` / `surface-light`): selects and the hover fill of nav items and secondary buttons.
- **Line** (`line` / `line-light`): 1px borders on cards, controls, swatches and secondary buttons.
- **Line Soft** (`line-soft` / `line-soft-light`): the track-bar and footer rules, section dividers, step dividers inside panels.
- **Line Strong** (`line-strong` / `line-strong-light`): full-contrast hairline for hardware-task panels and the buttons inside them.
- **Nav / Muted / Dim** (`nav`, `muted`, `dim` and their `-light` pairs): inactive nav links and secondary text, descriptions and leads, captions and tertiary hints.
- **Success** (`success` / `success-light`): equals the foreground. Connected and flashed states are monochrome: a square status dot and plain text.
- **Danger** (`danger` / `danger-light`): error text in `role="alert"` messages, and nothing else.

### Pad object
- **Pad** (`pad` / `pad-light`), **Pad Shell** (`pad-shell` / `pad-shell-light`): border and body of the simulated unit. The light pair stays near-black.
- **Pad Bed** (`pad-bed`), **Pixel** (`pixel`), **Pad Text** (`pad-text`): the recessed bed, unlit pixels and the silkscreen caption. Single values, identical in both schemes.

### Named Rules
**The Monochrome Chrome Rule.** The interface around the pads has no hue. If a color is not black, white, a token grey or `danger` on an error, it belongs on an LED pixel or on the label that names that LED color.

**The Inversion Rule.** Selected, current and primary are shown by swapping foreground and background (`app` fill, `canvas` text). Never introduce a tint or accent for state.

**The Dark Object Rule.** The pad tokens stay dark in both schemes so LED colors render true. Do not theme the pad to the page.

## Typography

**Display Font:** Space Grotesk (with sans-serif)
**Body Font:** DM Sans (with sans-serif), loaded at 400–700 including 450/550/650.
**Mono:** the system monospace stack, for code blocks, SysEx bytes and terminal commands only.

**Character:** Space Grotesk's squared, slightly mechanical forms give headings and readouts a hardware-label feel and suit the square geometry; DM Sans stays neutral and legible at the small sizes the panels use.

### Hierarchy
- **Display** (`display`): the page title on every track, ending in a full stop set in the foreground color. Drops to 2.25rem on compact.
- **Headline** (`headline`): section headings on reading pages and the selected game name in the manual panel; track sub-headings step up to 1.875rem.
- **Score** (`score`): zero-padded score readouts (`0420`) in the side cards.
- **Title** (`title`): step titles in the flasher and step lists, aside headings, row-link titles. Side-card headings use the same weight at 12px.
- **Nav** (`nav`): track bar and experience strip.
- **Lead** (`lead`): the paragraph under the page title, max 42rem.
- **Body** (`body`): panel copy, descriptions, steps.
- **Control** (`control`): buttons, selects, captions, footer.
- **Label** (`label`): tracked status labels (stage status bar, unit captions). Tracked uppercase list labels in the manual go up to 10px at 0.16em.

### Named Rules
**The Instrument Label Rule.** Status and context speak in small, tracked uppercase; actions and explanations speak in sentence case. Never set a button or a sentence in tracked caps.

**The Numbers Are Display Rule.** Scores, step numbers, pin names and counts read as data use Space Grotesk with tabular figures, so values do not jitter as they change.

## Layout

A sticky 64px track bar (Sidebar tone, Line Soft bottom rule) over a single main column capped at 1400px with 24px gutters (16px compact), closed by a Line Soft footer rule. Each track is a hash route: Pad menu (home), Browser games, Flash firmware, Hardware, Hack.

- **Page head:** display title and one lead paragraph, 40px top padding (28px compact). No label above the heading.
- **Pad menu:** two columns from 1024px: the simulated pad (max 34rem) and the manual panel; a row list of the other tracks below.
- **Browser games:** a hardware step panel, a wrapping experience strip, then the workspace: fluid stage plus a side column (264px; 235px laptop; 225px tablet; stacked two-up on compact).
- **Flash firmware:** the flasher panel with a 22rem aside of fallbacks and terminal commands.
- **Hardware / Hack:** reading pages. Sections separated by Line Soft rules with 40px vertical padding; tables, definition lists and small pin cards.

Breakpoints: Tailwind `sm` 640px, `md` 768px, `lg` 1024px for track layouts; custom variants `wide` ≥1450px, `laptop` <1150px, `tablet` <850px, `compact` <650px for the workspace and the shell. On compact the wordmark hides and the track links scroll horizontally.

Spacing rhythm is 4/8/12/16/20/24px, with 20–24px panel padding. Density is high; whitespace is spent around the pads, not around controls.

## Elevation & Depth

Fully flat. Surfaces separate by hairlines (Line Soft, Line, Line Strong in rising contrast) and a small grey ladder (Canvas, Card, Surface). No surface casts a shadow and no surface carries a gradient.

### Shadow Vocabulary
- **LED halo** (`box-shadow: 0 0 15px rgba(<led rgb>, .16)`): lit pixels only, computed from the pixel's own color.

### Named Rules
**The Flat Rule.** Nothing casts a shadow: not panels, not pad shells, not pixels, not toggles. No gradients on surfaces. Use a hairline or a grey step instead.

**The LED Light Exception.** A lit pixel keeps a soft halo in its own color. It is light, not elevation, and it is the only glow anywhere.

## Shapes

Rectangles only. An unlayered global rule sets `border-radius: 0` on every element, pseudo-element and file-selector button, so it beats any rounding utility in the markup. Status dots, the pad's corner screws, pin markers and swatches are all squares. Borders are 1px (2px on pin markers and the active tab underline). Four small square screws in the pad shell corners echo the physical unit.

## Components

### Buttons
Plain, square and compact; the label is the whole button.
- **Shape:** square corners (0px).
- **Primary:** Foreground fill, Canvas text, bold 12px, 12px × 20px padding (10px × 16px in the manual panel). One per region (Start/Pause, Flash firmware, Open in the browser).
- **Hover / Focus:** primary hover drops the fill to 85% opacity. Focus is a 2px Foreground outline offset 3px, global for buttons, links, summary, selects and inputs. Disabled drops to 40% opacity with a not-allowed cursor.
- **Secondary:** transparent, 1px Line border, 11px text, 8px × 12px padding; hover fills Surface (Reset, All games, Hardware repo).
- **Hardware action:** the secondary shape with a Line Strong border, inside hardware panels (Find pad, Connect, Load file).
- **Choice:** paired option buttons with `aria-pressed`; the pressed one inverts (Foreground fill and border, Canvas text).

### Chips
- **Value chip:** inverted (Foreground fill, Canvas text), 9px medium, 4px × 6px, attached to slider labels ("1.5×", "80%").
- **Swatch:** a solid square of an LED color with a 1px Line hairline, so white and black swatches read in both schemes. The selected paint swatch takes a 2px Foreground outline offset 3px.

### Cards / Containers
- **Corner Style:** square.
- **Background:** Card for side cards and the manual panel; Panel for the stage; Canvas for hardware panels.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Line; Line Strong on hardware panels.
- **Internal Padding:** 20px side cards (16px compact), 24px manual and flasher panels.

### Hardware Panel
Any panel where the user acts on a physical device (MIDI connection, device mapping, firmware flashing, the power note, the MIDI-mode manual) sits on Canvas with a full-contrast Line Strong hairline. Contrast, not tint, says "this touches real hardware". Steps inside are numbered in Space Grotesk tabular figures with a 13px semibold title, separated by Line Soft rules (step label column 12rem from 768px).

### Inputs / Fields
- **Select:** Surface fill, 1px Line border, 10px padding, 11px Foreground text.
- **Range:** 4px track tinted by `accent-color: app`, a value chip in the label, dim end captions.
- **Segmented control:** Canvas trough with 4px padding; the active option inverts.
- **Error:** inline `role="alert"` text in Danger; no field outline change.

### Navigation
- **Track bar:** 12px medium Nav links, 8px × 12px. Hover fills Surface with Foreground text; the current track inverts (`aria-current="page"`). The brand lockup (a drawn 4 × 4 square mark: top and bottom rows solid, middle rows at 35%, echoing the firmware menu) sits left. On the right: the theme button (Auto / Light / Dark, a half-filled square icon) and a bordered "Hardware repo ↗" link above 1150px.
- **Experience strip (Browser games):** the same treatment at 10px × 12px, wrapping, under a Line Soft rule.
- **Row links:** full-width rows (title →, description, dim meta) whose hover fills Card.

### Firmware Menu Map (signature)
The home screen. A simulated pad renders the real firmware menu frame: the 8 original games on the top row and 7 newer games plus MIDI on the bottom row, in their firmware colors, with the firmware's own 5-row font scrolling "CHOOSE GAME" or the selected name. Only the 16 menu cells are buttons, with a single tab stop: arrow keys move between them (Up/Down jump between the two menu rows), Enter or Space selects. The selected one blinks and carries a 2px white outline, white in both schemes because the pad is always dark. The manual panel beside it names position, players, how to play and how it ends, with a square swatch beside the color name; a status line inverts once the game is "started". MIDI switches the panel to the Hardware Panel treatment. Reduced motion freezes the scroll.

### Simulated Pad (signature)
One component (`PadShell` and `PadBed` in `src/components/PadShell.tsx`) for every simulated pad: home, browser games and the Hack address picker. A Pad Shell body with a 1px Pad border and four corner screws, a recessed Pad Bed with a black hairline, and an 8 × 8 grid of square Pixel buttons with a white/5 hairline, captioned "BLOOPPAD MAXX" in tracked Space Grotesk with Pad Text. Lit pixels take the exact LED RGB plus the LED halo. Hover brightens the pixel; press scales it to 90%. The simulator shows the same frame the hardware receives. Grids of pixel buttons use one tab stop with arrow-key movement.

### Stage Status Bar
A 52px strip above the pads under a Line Soft rule: a square Success dot and the state in tracked label type on the left, canvas dimensions and pad count on the right.

## Do's and Don'ts

### Do:
- **Do** keep the chrome monochrome: `app`, `canvas`, the grey tokens, and `danger` for errors only.
- **Do** define every chrome color as a dark default with a `prefers-color-scheme: light` override; never hard-code black or white.
- **Do** show selected, current and primary by inverting: Foreground fill, Canvas text.
- **Do** put hardware-facing panels on Canvas with a Line Strong hairline.
- **Do** keep the simulated pad dark in both schemes, and keep color on LED pixels and the labels that name LED colors.
- **Do** give every color swatch a 1px Line hairline so white and black swatches stay visible in either scheme.
- **Do** show state as data: dimensions, pad counts, port IDs, versions, numeric readouts.
- **Do** keep the 2px Foreground focus outline, offset 3px, on every interactive element.

### Don't:
- **Don't** round a corner; the global zero radius is the shape language.
- **Don't** add shadows or gradients to any surface; the lit-LED halo is the only glow.
- **Don't** put an eyebrow or kicker label above a heading.
- **Don't** introduce an accent hue for UI state, links or success; success is the foreground color.
- **Don't** use `danger` for anything but error messages.
- **Don't** use neon or cyberpunk styling on the chrome: no glowing gradients, scanlines or synthwave palettes.
- **Don't** set buttons or body sentences in tracked capitals.
