import assert from "node:assert/strict";
import { test } from "node:test";
import { Engine } from "../src/lib/engine.ts";
import {
  cleared,
  mineCount,
  newMines,
  placeMines,
  renderMines,
  reveal,
  toggleFlag,
} from "../src/lib/minesweeper.ts";

/** Deterministic random: walks a fixed list of cell indices. */
function cells(...indices: number[]) {
  let n = 0;
  return () => (indices[n++ % indices.length] + 0.5) / 64;
}

test("mine counts match the firmware per 8x8 pad and scale with area", () => {
  assert.equal(mineCount("easy", 8, 8), 8);
  assert.equal(mineCount("normal", 8, 8), 12);
  assert.equal(mineCount("hard", 8, 8), 16);
  assert.equal(mineCount("normal", 16, 8), 24);
});

test("the first reveal is always safe and numbers count neighbours", () => {
  const m = newMines(8, 8, 2);
  // The random source tries the safe cell 0 first; it must be skipped.
  assert.equal(reveal(m, 0, cells(0, 9, 63)), "ok");
  assert.equal(m.mines[0], false);
  assert.deepEqual(
    m.mines.flatMap((x, i) => (x ? [i] : [])),
    [9, 63],
  );
  assert.equal(m.numbers[0], 1);
  assert.equal(m.numbers[18], 1);
  assert.equal(m.numbers[62], 1);
});

test("empty cells flood open, flags block reveals, and clearing every safe cell wins", () => {
  const m = newMines(8, 8, 1);
  placeMines(m, 0, cells(63));
  assert.equal(reveal(m, 0), "ok");
  assert.equal(m.revealed.filter(Boolean).length, 63);
  assert.ok(cleared(m));
  const f = newMines(8, 8, 1);
  assert.equal(toggleFlag(f, 5), false, "no flags before the first reveal");
  placeMines(f, 0, cells(63));
  assert.ok(toggleFlag(f, 62));
  assert.equal(reveal(f, 62), "ignored");
  assert.equal(reveal(f, 63), "boom");
});

test("flags blink and hidden cells stay dim", () => {
  const m = newMines(8, 8, 1);
  placeMines(m, 0, cells(63));
  toggleFlag(m, 63);
  assert.deepEqual(renderMines(m, 0)[63], [255, 255, 0]);
  assert.deepEqual(renderMines(m, 0.2)[63], [0, 0, 0]);
  assert.deepEqual(renderMines(m, 0)[10], [56, 56, 56]);
});

test("engine: a short press reveals, a 0.4 s hold flags, and a mine ends the game", () => {
  const e = new Engine();
  e.configure("mines", 8, 8);
  e.onPad(0, 0, true, "t");
  e.update(0.1);
  e.onPad(0, 0, false, "t");
  assert.ok(e.mines.placed);
  assert.ok(e.mines.revealed[0]);
  const hidden = e.mines.revealed.findIndex((r) => !r);
  const [row, col] = [Math.floor(hidden / 8), hidden % 8];
  e.onPad(row, col, true, "t");
  e.update(0.45);
  assert.ok(e.mines.flags[hidden], "hold plants a flag");
  e.onPad(row, col, false, "t");
  assert.equal(e.mines.revealed[hidden], false, "releasing a hold does not reveal");
  toggleFlag(e.mines, hidden);
  const mine = e.mines.mines.findIndex(Boolean);
  e.onPad(Math.floor(mine / 8), mine % 8, true, "t");
  e.onPad(Math.floor(mine / 8), mine % 8, false, "t");
  assert.equal(e.minesResult, "boom");
  assert.ok(e.over);
});
