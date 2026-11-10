import type { KeyboardEvent } from "react";

/**
 * Arrow-key movement for a grid of buttons with a single tab stop.
 * `rows` lists the row numbers that hold buttons. Returns the next cell, focused, or null.
 */
export function moveInGrid(
  e: KeyboardEvent<HTMLElement>,
  row: number,
  col: number,
  rows: number[],
  cols = 8,
): { row: number; col: number } | null {
  const r = rows.indexOf(row);
  let next: { row: number; col: number } | null = null;
  if (e.key === "ArrowLeft") next = { row, col: Math.max(0, col - 1) };
  else if (e.key === "ArrowRight")
    next = { row, col: Math.min(cols - 1, col + 1) };
  else if (e.key === "ArrowUp") next = { row: rows[Math.max(0, r - 1)], col };
  else if (e.key === "ArrowDown")
    next = { row: rows[Math.min(rows.length - 1, r + 1)], col };
  else if (e.key === "Home") next = { row, col: 0 };
  else if (e.key === "End") next = { row, col: cols - 1 };
  if (!next) return null;
  e.preventDefault();
  e.currentTarget.parentElement
    ?.querySelector<HTMLElement>(`[data-cell="${next.row}-${next.col}"]`)
    ?.focus();
  return next;
}
