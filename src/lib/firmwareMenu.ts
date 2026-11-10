import type { Mode, RGB } from "./engine.ts";
import { firmwareFont } from "./firmwareFont.ts";

/* The game menu built into the BLOOPPAD-MAXX firmware (firmware/src/main.c and GAMES.md in
 * github.com/phyx-be/BLOOPPAD-MAXX). Row 0 is the top row of the pad, row 1 the bottom row. */
export interface FirmwareGame {
  id: string;
  name: string;
  /** Text the pad scrolls when the button is selected. */
  padName: string;
  row: 0 | 1;
  col: number;
  color: RGB;
  colorName: string;
  players: string;
  play: string[];
  ends: string;
  browser?: Mode;
}

const anyButtonToMenu =
  "When it ends, the result scrolls by. Press any button to return to the menu.";

export const firmwareGames: FirmwareGame[] = [
  {
    id: "connect-four",
    name: "Connect 4",
    padName: "CONNECT 4",
    row: 0,
    col: 0,
    color: [255, 255, 0],
    colorName: "yellow",
    players: "1 vs computer or 2 players",
    play: [
      "Press any button in a column to drop a piece there.",
      "Four in a row across, down or diagonally wins.",
    ],
    ends: anyButtonToMenu,
    browser: "connect",
  },
  {
    id: "masher",
    name: "Masher",
    padName: "MASHER",
    row: 0,
    col: 1,
    color: [255, 0, 255],
    colorName: "magenta",
    players: "1 vs computer or 2 players",
    play: [
      "Red owns the columns left of the rope, blue the columns right of it.",
      "Every press in your half pulls the rope your way; idle hands let it slide back.",
      "Pull it all the way to the other edge to win.",
    ],
    ends: anyButtonToMenu,
    browser: "masher",
  },
  {
    id: "tug-of-war",
    name: "Tug of war",
    padName: "TUG OF WAR",
    row: 0,
    col: 2,
    color: [0, 255, 255],
    colorName: "cyan",
    players: "1 vs computer or 2 players",
    play: [
      "After a random wait a white light appears in each half.",
      "First to press the light in their own half wins the round and pulls the rope one column.",
      "Pressing early or pressing the wrong button loses the round.",
    ],
    ends: anyButtonToMenu,
    browser: "tug",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    padName: "RAINBOW",
    row: 0,
    col: 3,
    color: [0, 255, 0],
    colorName: "green",
    players: "No players, just light",
    play: [
      "The buttons of the top row pick one of 8 animations: rainbow wave, plasma, fire, matrix rain, sparkles and more.",
    ],
    ends: "Press any button outside the top row to return to the menu.",
    browser: "rainbow",
  },
  {
    id: "life",
    name: "Game of life",
    padName: "GAME OF LIFE",
    row: 0,
    col: 4,
    color: [255, 100, 0],
    colorName: "orange",
    players: "1 player",
    play: [
      "Tap a button to toggle that cell, also while it runs.",
      "Hold one button for 1 s to start or pause. Starting an empty board seeds a random one.",
      "Conway's rules, no wrapping, a new generation every 0.3 s.",
    ],
    ends: "Hold two buttons for 1 s to return to the menu.",
    browser: "life",
  },
  {
    id: "tetris",
    name: "Tetris",
    padName: "TETRIS",
    row: 0,
    col: 5,
    color: [255, 0, 0],
    colorName: "red",
    players: "1 player",
    play: [
      "The whole board is the playing field; the bottom row is the controller.",
      "Bottom row, left to right: move left, turn counterclockwise, four buttons to move down, turn clockwise, move right.",
      "Hold a move button to repeat it.",
    ],
    ends: "The game is over when a new block does not fit. The score scrolls by; press any button to return to the menu.",
    browser: "tetris",
  },
  {
    id: "battleships",
    name: "Battleships",
    padName: "BATTLESHIPS",
    row: 0,
    col: 6,
    color: [0, 0, 255],
    colorName: "blue",
    players: "1 vs computer or 2 players",
    play: [
      "Each player gets a random fleet of 4 ships. Tap for a new fleet, hold a button for 1 s to accept it.",
      "Take turns firing at the other half of the board. Sink the whole fleet first.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "othello",
    name: "Othello",
    padName: "OTHELLO",
    row: 0,
    col: 7,
    color: [0, 255, 128],
    colorName: "spring green",
    players: "1 vs computer or 2 players",
    play: [
      "Press a dim cell of your color to place a disc and flip every trapped opponent disc.",
      "A player who cannot move passes. Most discs at the end wins.",
    ],
    ends: anyButtonToMenu,
    browser: "reversi",
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    padName: "MINESWEEPER",
    row: 1,
    col: 0,
    color: [255, 0, 128],
    colorName: "pink",
    players: "1 player, 3 difficulties",
    play: [
      "Press a cell to reveal it. Press and hold about 0.4 s to plant or remove a flag.",
      "The first reveal is always safe. Numbers use the classic colors: 1 blue, 2 green, 3 red.",
      "8, 12 or 16 mines depending on difficulty.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "lights-out",
    name: "Lights out",
    padName: "LIGHTS OUT",
    row: 1,
    col: 1,
    color: [128, 128, 255],
    colorName: "lavender",
    players: "1 player, 3 difficulties",
    play: [
      "Pressing a button toggles it and its four neighbors. Turn every light off.",
      "Every puzzle is solvable; harder levels scramble with 3, 6 or 10 presses.",
    ],
    ends: "The result shows how many moves you needed. Press any button to return to the menu.",
    browser: "lights",
  },
  {
    id: "mastermind",
    name: "Mastermind",
    padName: "MASTERMIND",
    row: 1,
    col: 2,
    color: [160, 0, 255],
    colorName: "purple",
    players: "1 or 2 players",
    play: [
      "Crack a code of 4 pegs in 6 colors within 7 guesses.",
      "Bottom row: columns 1–4 cycle a peg's color, column 8 (green) submits.",
      "Feedback on the right: bright white is right color, right place; dim white is right color, wrong place.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "paddle",
    name: "Paddle duel",
    padName: "PADDLE DUEL",
    row: 1,
    col: 3,
    color: [255, 128, 128],
    colorName: "salmon",
    players: "2 players",
    play: [
      "Hold the button on your edge where the ball arrives. Hold two neighbors for a bigger paddle.",
      "Where the ball hits sets the angle; every hit speeds the rally up. First to 5 points wins.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "whack-a-mole",
    name: "Whack-a-mole",
    padName: "WHACK A MOLE",
    row: 1,
    col: 4,
    color: [128, 255, 0],
    colorName: "lime",
    players: "1 or 2 players",
    play: [
      "Moles pop up in your half in your color. Hit them before they hide.",
      "Pressing an empty button costs a point. Rounds last 30 seconds and speed up.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "rhythm",
    name: "Rhythm tap",
    padName: "RHYTHM TAP",
    row: 1,
    col: 5,
    color: [255, 200, 0],
    colorName: "amber",
    players: "1 player, 3 difficulties",
    play: [
      "Lights race along the rows toward the green target column on the left.",
      "Press the target as the light arrives: green is perfect (+100), yellow is good (+50).",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "twister",
    name: "Finger twister",
    padName: "FINGER TWISTER",
    row: 1,
    col: 6,
    color: [0, 200, 255],
    colorName: "azure",
    players: "1 player, 3 difficulties",
    play: [
      "Hold every lit button at the same time while new ones keep appearing.",
      "A blinking button may be grabbed at leisure; a held one may not be let go.",
      "Hold 4, 6 or 8 at once to win.",
    ],
    ends: anyButtonToMenu,
  },
  {
    id: "midi",
    name: "MIDI mode",
    padName: "MIDI",
    row: 1,
    col: 7,
    color: [255, 255, 255],
    colorName: "white",
    players: "Controlled by your computer",
    play: [
      "Turns the pad into a USB-MIDI controller: buttons send Control Change messages and the computer sets the LEDs.",
      "This is the mode the browser games, Fri3d Scratcher and your own code need.",
    ],
    ends: "MIDI mode never returns to the menu on its own. Unplug and replug the pad to leave it.",
  },
];

export const gameAt = (row: number, col: number) =>
  firmwareGames.find((g) => (g.row === 0 ? 0 : 7) === row && g.col === col) ??
  null;

const TEXT_TOP = 2;
const SCROLL_SPEED = 8; // columns per second, as in the firmware
const BLINK_MS = 500;

function glyph(c: string) {
  return firmwareFont[c] ?? firmwareFont["?"];
}

/** Scroll text through rows 2–6 like the firmware's game_render_text. */
export function renderFirmwareText(
  frame: RGB[],
  text: string,
  ms: number,
  color: RGB,
) {
  const chars = Array.from(text.toUpperCase());
  const width = chars.reduce((w, c) => w + glyph(c).width + 1, 0);
  const offset = (Math.floor((ms * SCROLL_SPEED) / 1000) + 8) % (width + 8);
  const left = offset - 8;
  let start = 0;
  for (const c of chars) {
    const g = glyph(c);
    for (let gx = 0; gx < g.width; gx++) {
      const x = start + gx - left;
      if (x < 0 || x >= 8) continue;
      for (let y = 0; y < 5; y++)
        if (g.rows[y] & (1 << (4 - gx))) frame[(TEXT_TOP + y) * 8 + x] = color;
    }
    start += g.width + 1;
  }
}

/** One 8×8 frame of the firmware menu: games on the top and bottom row, text in between. */
export function renderFirmwareMenu(
  selected: FirmwareGame | null,
  ms: number,
): RGB[] {
  const frame: RGB[] = Array.from({ length: 64 }, () => [0, 0, 0]);
  renderFirmwareText(
    frame,
    selected ? selected.padName : "CHOOSE GAME",
    ms,
    [255, 255, 255],
  );
  for (const g of firmwareGames) {
    const blinkOff = selected === g && ms % BLINK_MS >= BLINK_MS / 2;
    if (!blinkOff) frame[(g.row === 0 ? 0 : 7) * 8 + g.col] = g.color;
  }
  return frame;
}
