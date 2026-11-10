import type { RGB } from "./engine.ts";
import type { Difficulty } from "./games.ts";

/* Minesweeper with the rules of the BLOOPPAD-MAXX firmware (firmware/src/game_minesweeper.c):
 * press to reveal, hold to flag, the first reveal is always safe, empty cells open their
 * neighbours, and every safe cell revealed wins. */

export const HOLD_TO_FLAG = 0.4; // seconds
export const FLAG_BLINK = 0.3; // seconds per blink cycle

/** Mines per difficulty on one 8×8 pad, as in the firmware. Larger canvases scale by area. */
const minesPer64: Record<Difficulty, number> = {
  easy: 8,
  normal: 12,
  hard: 16,
};

export const NUMBER_COLORS: RGB[] = [
  [0, 0, 0],
  [30, 60, 255],
  [0, 255, 0],
  [255, 0, 0],
  [200, 0, 255],
  [255, 120, 0],
  [0, 255, 255],
  [255, 255, 255],
  [120, 120, 120],
];
/** The firmware uses 25; on screen that matches an unlit cell, so hidden cells glow a little brighter. */
export const HIDDEN: RGB = [56, 56, 56];
export const FLAG: RGB = [255, 255, 0];
export const MINE: RGB = [255, 0, 0];
export const CLEAR: RGB = [0, 255, 0];

export interface Mines {
  width: number;
  height: number;
  count: number;
  placed: boolean;
  mines: boolean[];
  numbers: number[];
  revealed: boolean[];
  flags: boolean[];
}

export function mineCount(
  difficulty: Difficulty,
  width: number,
  height: number,
) {
  return Math.round((minesPer64[difficulty] * width * height) / 64);
}

export function newMines(width: number, height: number, count: number): Mines {
  const n = width * height;
  return {
    width,
    height,
    count: Math.min(count, n - 1),
    placed: false,
    mines: Array(n).fill(false),
    numbers: Array(n).fill(0),
    revealed: Array(n).fill(false),
    flags: Array(n).fill(false),
  };
}

function neighbours(m: Mines, i: number): number[] {
  const r = Math.floor(i / m.width),
    c = i % m.width,
    out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr,
        cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < m.height && cc >= 0 && cc < m.width)
        out.push(rr * m.width + cc);
    }
  return out;
}

/** Place the mines anywhere except `safe`, then count each cell's neighbouring mines. */
export function placeMines(m: Mines, safe: number, random = Math.random) {
  let left = m.count;
  while (left > 0) {
    const i = Math.floor(random() * m.mines.length);
    if (m.mines[i] || i === safe) continue;
    m.mines[i] = true;
    left--;
  }
  m.numbers = m.mines.map(
    (_, i) => neighbours(m, i).filter((j) => m.mines[j]).length,
  );
  m.placed = true;
}

/** Reveal a cell; empty cells open their neighbours. Returns "boom" on a mine. */
export function reveal(
  m: Mines,
  i: number,
  random = Math.random,
): "boom" | "ok" | "ignored" {
  if (m.revealed[i] || m.flags[i]) return "ignored";
  if (!m.placed) placeMines(m, i, random);
  if (m.mines[i]) return "boom";
  const stack = [i];
  while (stack.length) {
    const j = stack.pop()!;
    if (m.revealed[j] || m.flags[j] || m.mines[j]) continue;
    m.revealed[j] = true;
    if (m.numbers[j] === 0)
      stack.push(...neighbours(m, j).filter((k) => !m.revealed[k]));
  }
  return "ok";
}

/** Plant or remove a flag. Flagging before the first reveal does nothing, as on the pad. */
export function toggleFlag(m: Mines, i: number) {
  if (!m.placed || m.revealed[i]) return false;
  m.flags[i] = !m.flags[i];
  return true;
}

export function cleared(m: Mines) {
  return (
    m.placed && m.revealed.filter(Boolean).length === m.mines.length - m.count
  );
}

export function flagCount(m: Mines) {
  return m.flags.filter(Boolean).length;
}

/** One frame of the board while playing; `clock` drives the flag blink. */
export function renderMines(m: Mines, clock: number): RGB[] {
  const blinkOn = clock % FLAG_BLINK < FLAG_BLINK / 2;
  return m.mines.map((_, i): RGB => {
    if (m.flags[i] && !m.revealed[i]) return blinkOn ? [...FLAG] : [0, 0, 0];
    if (m.revealed[i]) return [...NUMBER_COLORS[m.numbers[i]]];
    return [...HIDDEN];
  });
}

/** End flash: mines in red after a loss, every safe cell in green after a win. */
export function renderMinesEnding(m: Mines, won: boolean, on: boolean): RGB[] {
  return m.mines.map((mine): RGB =>
    on && (won ? !mine : mine) ? [...(won ? CLEAR : MINE)] : [0, 0, 0],
  );
}
