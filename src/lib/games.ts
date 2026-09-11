/* Pure board-game rules and opponents. No rendering, timing or hardware concerns. */
export type Cells = number[];
export type Player = 1 | 2;
export type Difficulty = "easy" | "normal" | "hard";
export const other = (player: Player): Player => (player === 1 ? 2 : 1);
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}
export function reversiInit(width: number, height: number): Cells {
  const cells = Array.from({ length: width * height }, () => 0);
  const x = Math.floor(width / 2),
    y = Math.floor(height / 2);
  cells[(y - 1) * width + x - 1] = 2;
  cells[(y - 1) * width + x] = 1;
  cells[y * width + x - 1] = 1;
  cells[y * width + x] = 2;
  return cells;
}
export function reversiFlips(
  cells: Cells,
  width: number,
  height: number,
  index: number,
  player: Player,
): number[] {
  if (cells[index]) return [];
  const row = Math.floor(index / width),
    col = index % width,
    flips: number[] = [];
  for (const [dy, dx] of directions) {
    const run: number[] = [];
    let y = row + dy,
      x = col + dx,
      closed = false;
    while (y >= 0 && y < height && x >= 0 && x < width) {
      const value = cells[y * width + x];
      if (!value) break;
      if (value === player) {
        closed = true;
        break;
      }
      run.push(y * width + x);
      y += dy;
      x += dx;
    }
    if (closed) flips.push(...run);
  }
  return flips;
}
export function reversiMoves(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
): Map<number, number[]> {
  const moves = new Map<number, number[]>();
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) continue;
    const flips = reversiFlips(cells, width, height, i, player);
    if (flips.length) moves.set(i, flips);
  }
  return moves;
}
export function reversiApply(
  cells: Cells,
  index: number,
  player: Player,
  flips: number[],
): Cells {
  const next = cells.slice();
  next[index] = player;
  for (const i of flips) next[i] = player;
  return next;
}
export function reversiCount(cells: Cells): [number, number] {
  let one = 0,
    two = 0;
  for (const cell of cells) {
    if (cell === 1) one++;
    else if (cell === 2) two++;
  }
  return [one, two];
}
function squareWeight(x: number, y: number, width: number, height: number) {
  const edgeX = x === 0 || x === width - 1,
    edgeY = y === 0 || y === height - 1,
    nearX = x === 1 || x === width - 2,
    nearY = y === 1 || y === height - 2;
  if (edgeX && edgeY) return 120;
  if ((edgeX && nearY) || (edgeY && nearX) || (nearX && nearY)) return -35;
  if (edgeX || edgeY) return 18;
  return 4;
}
function reversiEvaluate(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
) {
  let score = 0;
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    const weight = squareWeight(i % width, Math.floor(i / width), width, height);
    score += cells[i] === player ? weight : -weight;
  }
  const mine = reversiMoves(cells, width, height, player).size,
    theirs = reversiMoves(cells, width, height, other(player)).size;
  return score + (mine - theirs) * 6;
}
function reversiNegamax(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
  passed: boolean,
): number {
  const moves = reversiMoves(cells, width, height, player);
  if (!moves.size) {
    if (passed) {
      const [one, two] = reversiCount(cells),
        mine = player === 1 ? one : two;
      return (mine * 2 - one - two) * 1000;
    }
    return -reversiNegamax(
      cells,
      width,
      height,
      other(player),
      depth,
      -beta,
      -alpha,
      true,
    );
  }
  if (depth === 0) return reversiEvaluate(cells, width, height, player);
  let best = -Infinity;
  const ordered = [...moves.entries()].sort(
    (a, b) =>
      squareWeight(b[0] % width, Math.floor(b[0] / width), width, height) -
      squareWeight(a[0] % width, Math.floor(a[0] / width), width, height),
  );
  for (const [index, flips] of ordered) {
    const value = -reversiNegamax(
      reversiApply(cells, index, player, flips),
      width,
      height,
      other(player),
      depth - 1,
      -beta,
      -alpha,
      false,
    );
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export function reversiDepth(difficulty: Difficulty, cells: number) {
  const budget = cells > 64 ? 2 : 4;
  return difficulty === "easy" ? 1 : Math.min(budget, difficulty === "hard" ? 4 : 2);
}
export function reversiBest(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
  difficulty: Difficulty = "normal",
): number {
  const moves = reversiMoves(cells, width, height, player);
  if (!moves.size) return -1;
  if (difficulty === "easy" && Math.random() < 0.35)
    return pick([...moves.keys()]);
  const depth = reversiDepth(difficulty, cells.length);
  let best = -Infinity,
    choices: number[] = [];
  for (const [index, flips] of moves) {
    const value = -reversiNegamax(
      reversiApply(cells, index, player, flips),
      width,
      height,
      other(player),
      depth - 1,
      -Infinity,
      Infinity,
      false,
    );
    if (value > best) {
      best = value;
      choices = [index];
    } else if (value === best) choices.push(index);
  }
  return pick(choices);
}
export function connectDrop(
  cells: Cells,
  width: number,
  height: number,
  column: number,
): number {
  if (column < 0 || column >= width) return -1;
  for (let row = height - 1; row >= 0; row--)
    if (!cells[row * width + column]) return row * width + column;
  return -1;
}
export function connectLine(
  cells: Cells,
  width: number,
  height: number,
  index: number,
): number[] | null {
  const player = cells[index];
  if (!player) return null;
  const row = Math.floor(index / width),
    col = index % width;
  for (const [dy, dx] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const line = [index];
    for (const sign of [1, -1]) {
      let y = row + dy * sign,
        x = col + dx * sign;
      while (
        y >= 0 &&
        y < height &&
        x >= 0 &&
        x < width &&
        cells[y * width + x] === player
      ) {
        line.push(y * width + x);
        y += dy * sign;
        x += dx * sign;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}
export function connectColumns(width: number): number[] {
  return Array.from({ length: width }, (_, i) => i).sort(
    (a, b) =>
      Math.abs(a - (width - 1) / 2) - Math.abs(b - (width - 1) / 2),
  );
}
function connectEvaluate(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
) {
  let score = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (const [dy, dx] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const endY = y + 3 * dy,
          endX = x + 3 * dx;
        if (endY < 0 || endY >= height || endX < 0 || endX >= width) continue;
        let mine = 0,
          theirs = 0;
        for (let k = 0; k < 4; k++) {
          const value = cells[(y + k * dy) * width + x + k * dx];
          if (value === player) mine++;
          else if (value) theirs++;
        }
        if (mine && theirs) continue;
        score += [0, 1, 12, 90][mine] - [0, 1, 12, 90][theirs];
      }
  return score;
}
function connectNegamax(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const columns = connectColumns(width).filter(
    (column) => connectDrop(cells, width, height, column) >= 0,
  );
  if (!columns.length) return 0;
  if (depth === 0) return connectEvaluate(cells, width, height, player);
  let best = -Infinity;
  for (const column of columns) {
    const index = connectDrop(cells, width, height, column);
    cells[index] = player;
    const value = connectLine(cells, width, height, index)
      ? 100000 + depth
      : -connectNegamax(
          cells,
          width,
          height,
          other(player),
          depth - 1,
          -beta,
          -alpha,
        );
    cells[index] = 0;
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export function connectDepth(difficulty: Difficulty, width: number) {
  const budget = width > 8 ? 4 : 5;
  return difficulty === "easy" ? 1 : Math.min(budget, difficulty === "hard" ? 5 : 3);
}
export function connectBest(
  cells: Cells,
  width: number,
  height: number,
  player: Player,
  difficulty: Difficulty = "normal",
): number {
  const columns = connectColumns(width).filter(
    (column) => connectDrop(cells, width, height, column) >= 0,
  );
  if (!columns.length) return -1;
  if (difficulty === "easy" && Math.random() < 0.4) return pick(columns);
  const working = cells.slice(),
    depth = connectDepth(difficulty, width);
  let best = -Infinity,
    choices: number[] = [];
  for (const column of columns) {
    const index = connectDrop(working, width, height, column);
    working[index] = player;
    const value = connectLine(working, width, height, index)
      ? 1000000
      : -connectNegamax(
          working,
          width,
          height,
          other(player),
          depth - 1,
          -Infinity,
          Infinity,
        );
    working[index] = 0;
    if (value > best) {
      best = value;
      choices = [column];
    } else if (value === best) choices.push(column);
  }
  return pick(choices);
}
/* Reaction and mashing opponents are timing based; these helpers keep the numbers in one place. */
export function reactionTime(difficulty: Difficulty): number {
  const base = { easy: 0.75, normal: 0.42, hard: 0.24 }[difficulty];
  return base + (Math.random() - 0.4) * base * 0.5;
}
export function mashInterval(difficulty: Difficulty): number {
  const base = { easy: 0.28, normal: 0.17, hard: 0.1 }[difficulty];
  return base * (0.75 + Math.random() * 0.5);
}
