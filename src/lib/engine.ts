import {
  connectBest,
  connectDrop,
  connectLine,
  mashInterval,
  other,
  reactionTime,
  reversiApply,
  reversiBest,
  reversiCount,
  reversiInit,
  reversiMoves,
} from "./games.ts";
import type { Cells, Difficulty, Player } from "./games.ts";
export type RGB = [number, number, number];
export type Mode =
  | "tetris"
  | "scroller"
  | "snake"
  | "rainbow"
  | "paint"
  | "life"
  | "lights"
  | "reversi"
  | "connect"
  | "tug"
  | "masher";
export const duelModes: Mode[] = ["tug", "masher"];
export const twoPlayerModes: Mode[] = ["reversi", "connect", "tug", "masher"];
/* Player one is pink, player two is blue, everywhere on screen and on the pads. */
export const teams: RGB[] = [
  [255, 104, 139],
  [103, 153, 255],
];
export const palette: RGB[] = [
  [173, 119, 255],
  [77, 221, 207],
  [255, 183, 77],
  [255, 104, 139],
  [103, 153, 255],
  [192, 235, 104],
];
export const shapes = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
];
const glyphs: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01111 10000 10000 10000 10000 10000 01111",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01111 10000 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111",
  J: "00111 00010 00010 00010 10010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  " ": "00000 00000 00000 00000 00000 00000 00000",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00010 00100 00000 00100",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 10000 11110 00001 00001 11110",
  "6": "01110 10000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00001 01110",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  ".": "00000 00000 00000 00000 00000 00110 00110",
};
export class Engine {
  width = 8;
  height = 8;
  mode: Mode = "tetris";
  running = false;
  speed = 1;
  time = 0;
  tick = 0;
  score = 0;
  lines = 0;
  over = false;
  private scoreTime = 0;
  generation = 0;
  moves = 0;
  private startingBoard: RGB[] = [];
  text = "HELLO BLOOP!";
  color: RGB = palette[0];
  effect = "text";
  board: RGB[] = [];
  frames: RGB[][] = [];
  playback = false;
  piece = shapes[2];
  px = 2;
  py = 0;
  pieceColor = palette[0];
  next = 0;
  snake: number[] = [];
  direction = [1, 0];
  pending = [1, 0];
  food = 0;
  held = new Set<string>();
  /* Two-player state: shared board, turn, opponent configuration and duel timings. */
  cells: Cells = [];
  turn: Player = 1;
  winner = 0;
  opponent: "human" | "ai" = "ai";
  difficulty: Difficulty = "normal";
  aiSide: Player = 2;
  lastMove = -1;
  winLine: number[] = [];
  passes = 0;
  message = "";
  private aiTimer = 0;
  duelState: "countdown" | "go" | "result" = "countdown";
  targets: [number, number] = [-1, -1];
  reactions: [number | null, number | null] = [null, null];
  rounds: [number, number] = [0, 0];
  presses: [number, number] = [0, 0];
  roundWinner = 0;
  rope = 0;
  private duelTimer = 0;
  private goTime = 0;
  private aiReaction = 0;
  private aiMash = 0;
  legal = new Map<number, number[]>();
  constructor() {
    this.reset();
  }
  blank(): RGB[] {
    return Array.from({ length: this.width * this.height }, () => [0, 0, 0]);
  }
  reset() {
    this.board = this.blank();
    this.time = 0;
    this.tick = 0;
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.scoreTime = 0;
    this.running = false;
    this.playback = false;
    this.held.clear();
    this.snake = [
      Math.floor(this.height / 2) * this.width + 3,
      Math.floor(this.height / 2) * this.width + 2,
      Math.floor(this.height / 2) * this.width + 1,
    ];
    this.direction = [1, 0];
    this.pending = [1, 0];
    this.food = 2 * this.width + 5;
    this.next = Math.floor(Math.random() * 7);
    this.spawn();
    this.generation = 0;
    this.moves = 0;
    this.winner = 0;
    this.lastMove = -1;
    this.winLine = [];
    this.passes = 0;
    this.message = "";
    this.cells = [];
    if (this.mode === "lights") this.newLightsPuzzle();
    else if (this.mode === "reversi") this.newReversi();
    else if (this.mode === "connect") this.newConnect();
    else if (duelModes.includes(this.mode)) this.newDuel();
    else this.startingBoard = this.blank();
  }
  configure(mode: Mode, width: number, height: number) {
    this.mode = mode;
    this.width = width;
    this.height = height;
    this.frames = [];
    this.reset();
  }
  spawn() {
    this.piece = shapes[this.next].map((r) => [...r]);
    this.pieceColor = palette[this.next % 6];
    this.next = Math.floor(Math.random() * 7);
    this.px = Math.floor((this.width - this.piece[0].length) / 2);
    this.py = 0;
    if (!this.fits(this.px, this.py, this.piece)) {
      this.finishGame();
    }
  }
  fits(x: number, y: number, p: number[][]) {
    return p.every((r, dy) =>
      r.every(
        (v, dx) =>
          !v ||
          (x + dx >= 0 &&
            x + dx < this.width &&
            y + dy < this.height &&
            y + dy >= 0 &&
            !this.board[(y + dy) * this.width + x + dx].some(Boolean)),
      ),
    );
  }
  drop() {
    if (this.fits(this.px, this.py + 1, this.piece)) {
      this.py++;
      return true;
    }
    this.piece.forEach((r, y) =>
      r.forEach((v, x) => {
        if (v)
          this.board[(this.py + y) * this.width + this.px + x] =
            this.pieceColor;
      }),
    );
    let cleared = 0;
    for (let y = this.height - 1; y >= 0; y--) {
      if (
        this.board
          .slice(y * this.width, (y + 1) * this.width)
          .every((c) => c.some(Boolean))
      ) {
        this.board.splice(y * this.width, this.width);
        this.board.unshift(
          ...Array.from({ length: this.width }, (): RGB => [0, 0, 0]),
        );
        cleared++;
        y++;
      }
    }
    this.lines += cleared;
    this.score += [0, 100, 300, 500, 800][cleared];
    this.spawn();
    return false;
  }
  action(a: string) {
    if (!this.running || this.over) return;
    if (this.mode === "tetris") {
      if (a === "left" || a === "right") {
        const x = this.px + (a === "left" ? -1 : 1);
        if (this.fits(x, this.py, this.piece)) this.px = x;
      }
      if (a === "up") {
        const p = this.piece[0].map((_, i) =>
          this.piece.map((r) => r[i]).reverse(),
        );
        for (const offset of [0, -1, 1, -2, 2])
          if (this.fits(this.px + offset, this.py, p)) {
            this.px += offset;
            this.piece = p;
            break;
          }
      }
      if (a === "down") this.drop();
      if (a === "drop") {
        while (this.drop()) this.score += 2;
      }
    }
    if (this.mode === "snake") {
      const d: Record<string, number[]> = {
        left: [-1, 0],
        right: [1, 0],
        up: [0, -1],
        down: [0, 1],
      };
      if (
        d[a] &&
        (d[a][0] !== -this.direction[0] || d[a][1] !== -this.direction[1])
      )
        this.pending = d[a];
    }
  }
  onPad(row: number, col: number, pressed: boolean, source = "pad") {
    const key = `${source}:${row}:${col}`;
    if (!pressed) {
      this.held.delete(key);
      return;
    }
    if (this.held.has(key)) return;
    this.held.add(key);
    if (this.over) {
      if (this.scoreTime >= 0.9) {
        this.reset();
        this.running = true;
        this.held.add(key);
      }
      return;
    }
    if (this.mode === "life") {
      const i = row * this.width + col;
      this.board[i] = this.board[i].some(Boolean) ? [0, 0, 0] : [...palette[1]];
      return;
    }
    if (this.mode === "reversi" || this.mode === "connect") {
      if (!this.running) return;
      const side = this.turn;
      if (this.opponent === "ai" && side === this.aiSide) return;
      if (this.mode === "reversi") this.playReversi(row * this.width + col);
      else this.playConnect(col);
      return;
    }
    if (duelModes.includes(this.mode)) {
      if (!this.running) return;
      this.press(this.sideOf(row, col), row * this.width + col);
      return;
    }
    if (this.mode === "lights") {
      if (!this.running) return;
      this.flipLights(row, col);
      this.moves++;
      if (!this.board.some((c) => c.some(Boolean))) this.finishGame();
      return;
    }
    if (this.mode === "paint" && !this.playback) {
      this.board[row * this.width + col] = [...this.color];
      return;
    }
    this.action(
      row < this.height / 3
        ? "up"
        : row >= (this.height * 2) / 3
          ? "down"
          : col < this.width / 2
            ? "left"
            : "right",
    );
  }
  stepLife() {
    const previous = this.board;
    this.board = previous.map((cell, i): RGB => {
      const row = Math.floor(i / this.width),
        col = i % this.width;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const y = row + dy,
            x = col + dx;
          if (
            y >= 0 &&
            y < this.height &&
            x >= 0 &&
            x < this.width &&
            previous[y * this.width + x].some(Boolean)
          )
            neighbors++;
        }
      return neighbors === 3 || (cell.some(Boolean) && neighbors === 2)
        ? [...palette[1]]
        : [0, 0, 0];
    });
    this.generation++;
  }
  seedLife(kind: "clear" | "random" | "glider") {
    this.board = this.blank();
    this.running = false;
    this.generation = 0;
    this.tick = 0;
    this.held.clear();
    if (kind === "random")
      this.board = this.board.map(() =>
        Math.random() < 0.3 ? [...palette[1]] : [0, 0, 0],
      );
    if (kind === "glider") {
      const x = Math.floor(this.width / 2) - 1,
        y = Math.floor(this.height / 2) - 1;
      for (const [dx, dy] of [
        [1, 0],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ])
        this.board[(y + dy) * this.width + x + dx] = [...palette[1]];
    }
    this.saveStartingBoard();
  }
  saveStartingBoard() {
    this.startingBoard = this.board.map((c) => [...c]);
  }
  restoreStartingBoard() {
    this.board = this.startingBoard.map((c) => [...c]);
    this.generation = 0;
    this.moves = 0;
    this.tick = 0;
    this.over = false;
    this.scoreTime = 0;
    this.running = this.mode === "lights";
    this.held.clear();
  }
  private flipLights(row: number, col: number) {
    for (const [dy, dx] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const y = row + dy,
        x = col + dx;
      if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
      const i = y * this.width + x;
      this.board[i] = this.board[i].some(Boolean) ? [0, 0, 0] : [...palette[2]];
    }
  }
  newLightsPuzzle() {
    this.board = this.blank();
    // Starting from all-off and applying legal moves guarantees a solution.
    for (let i = 0; i < Math.max(8, (this.width * this.height) / 5); i++) {
      this.flipLights(
        Math.floor(Math.random() * this.height),
        Math.floor(Math.random() * this.width),
      );
    }
    if (!this.board.some((c) => c.some(Boolean))) this.flipLights(0, 0);
    this.moves = 0;
    this.over = false;
    this.scoreTime = 0;
    this.running = true;
    this.held.clear();
    this.saveStartingBoard();
  }
  private finishGame() {
    this.over = true;
    this.running = false;
    this.scoreTime = 0;
    this.held.clear();
  }
  private finishMatch(winner: number) {
    this.winner = winner;
    this.finishGame();
  }
  newReversi() {
    this.cells = reversiInit(this.width, this.height);
    this.turn = 1;
    this.legal = reversiMoves(this.cells, this.width, this.height, this.turn);
    this.lastMove = -1;
    this.winLine = [];
    this.winner = 0;
    this.passes = 0;
    this.moves = 0;
    this.over = false;
    this.scoreTime = 0;
    this.message = "";
    this.aiTimer = 0;
    this.running = true;
    this.held.clear();
  }
  playReversi(index: number) {
    const flips = this.legal.get(index);
    if (!flips || this.over) return;
    this.cells = reversiApply(this.cells, index, this.turn, flips);
    this.lastMove = index;
    this.moves++;
    this.turn = other(this.turn);
    this.aiTimer = 0;
    this.advanceReversi();
  }
  private advanceReversi() {
    this.message = "";
    this.legal = reversiMoves(this.cells, this.width, this.height, this.turn);
    if (this.legal.size) return;
    const waiting = reversiMoves(
      this.cells,
      this.width,
      this.height,
      other(this.turn),
    );
    if (!waiting.size) {
      const [one, two] = reversiCount(this.cells);
      this.finishMatch(one > two ? 1 : two > one ? 2 : 3);
      return;
    }
    this.passes++;
    this.message = `${this.turn === 1 ? "Pink" : "Blue"} has no legal move and passes.`;
    this.turn = other(this.turn);
    this.legal = waiting;
  }
  newConnect() {
    this.cells = Array.from({ length: this.width * this.height }, () => 0);
    this.turn = 1;
    this.legal = new Map();
    this.lastMove = -1;
    this.winLine = [];
    this.winner = 0;
    this.moves = 0;
    this.over = false;
    this.scoreTime = 0;
    this.message = "";
    this.aiTimer = 0;
    this.running = true;
    this.held.clear();
  }
  playConnect(column: number) {
    if (this.over) return;
    const index = connectDrop(this.cells, this.width, this.height, column);
    if (index < 0) return;
    this.cells[index] = this.turn;
    this.lastMove = index;
    this.moves++;
    const line = connectLine(this.cells, this.width, this.height, index);
    if (line) {
      this.winLine = line;
      this.finishMatch(this.turn);
      return;
    }
    if (this.cells.every(Boolean)) {
      this.finishMatch(3);
      return;
    }
    this.turn = other(this.turn);
    this.aiTimer = 0;
  }
  private moveAi() {
    if (this.mode === "reversi") {
      const index = reversiBest(
        this.cells,
        this.width,
        this.height,
        this.turn,
        this.difficulty,
      );
      if (index >= 0) this.playReversi(index);
      return;
    }
    const column = connectBest(
      this.cells,
      this.width,
      this.height,
      this.turn,
      this.difficulty,
    );
    if (column >= 0) this.playConnect(column);
  }
  get duelAxis(): "x" | "y" {
    return this.width >= this.height ? "x" : "y";
  }
  get duelLength() {
    return this.duelAxis === "x" ? this.width : this.height;
  }
  get duelEdge() {
    return Math.max(0, Math.min(this.duelLength, Math.round(this.rope)));
  }
  sideOf(row: number, col: number): Player {
    return (this.duelAxis === "x" ? col : row) < this.duelEdge ? 1 : 2;
  }
  get counts(): [number, number] {
    return reversiCount(this.cells);
  }
  newDuel() {
    this.rope = this.duelLength / 2;
    this.rounds = [0, 0];
    this.presses = [0, 0];
    this.reactions = [null, null];
    this.targets = [-1, -1];
    this.roundWinner = 0;
    this.winner = 0;
    this.over = false;
    this.scoreTime = 0;
    this.goTime = 0;
    this.duelState = "countdown";
    this.duelTimer = this.mode === "tug" ? 0.9 + Math.random() * 1.2 : 1.2;
    this.message =
      this.mode === "tug" ? "Wait for your light…" : "Get ready to mash…";
    this.running = true;
    this.held.clear();
  }
  private randomCell(side: Player) {
    const edge = this.duelEdge,
      start = side === 1 ? 0 : edge,
      end = side === 1 ? edge : this.duelLength,
      along = start + Math.floor(Math.random() * (end - start)),
      across = Math.floor(
        Math.random() * (this.duelAxis === "x" ? this.height : this.width),
      );
    return this.duelAxis === "x"
      ? across * this.width + along
      : along * this.width + across;
  }
  private startRound() {
    this.duelState = "go";
    this.goTime = 0;
    this.roundWinner = 0;
    this.reactions = [null, null];
    if (this.mode === "tug") {
      this.targets = [this.randomCell(1), this.randomCell(2)];
      this.aiReaction = reactionTime(this.difficulty);
      this.message = "Press your light!";
    } else {
      this.targets = [-1, -1];
      this.aiMash = mashInterval(this.difficulty);
      this.message = "Mash your half!";
    }
  }
  /* A press from a pad, the screen or a keyboard. Index -1 means "whatever my light is". */
  press(side: Player, index = -1) {
    if (!duelModes.includes(this.mode) || this.over || !this.running) return;
    if (this.mode === "masher") {
      if (this.duelState !== "go") return;
      this.presses[side - 1]++;
      this.rope += side === 1 ? 0.34 : -0.34;
      this.checkRope();
      return;
    }
    if (this.duelState === "countdown") {
      this.endRound(other(side), `${this.name(side)} jumped the gun!`);
      return;
    }
    if (this.duelState !== "go" || this.roundWinner) return;
    const target = this.targets[side - 1];
    if (index >= 0 && target >= 0 && index !== target) {
      this.endRound(other(side), `${this.name(side)} hit the wrong light!`);
      return;
    }
    this.reactions[side - 1] = this.goTime;
    this.endRound(
      side,
      `${this.name(side)} pulls · ${this.goTime.toFixed(2)}s`,
    );
  }
  pressKey(side: Player) {
    this.press(side, this.mode === "tug" ? this.targets[side - 1] : -1);
  }
  private name(side: Player) {
    return side === 1 ? "Pink" : "Blue";
  }
  private endRound(winner: Player, message: string) {
    this.roundWinner = winner;
    this.rounds[winner - 1]++;
    this.rope += winner === 1 ? 1 : -1;
    this.duelState = "result";
    this.duelTimer = 0.8;
    this.message = message;
    this.checkRope();
  }
  private checkRope() {
    this.rope = Math.max(0, Math.min(this.duelLength, this.rope));
    if (this.rope >= this.duelLength) this.finishMatch(1);
    else if (this.rope <= 0) this.finishMatch(2);
  }
  private updateDuel(dt: number) {
    if (this.duelState === "countdown") {
      this.duelTimer -= dt;
      if (this.duelTimer <= 0) this.startRound();
      return;
    }
    if (this.duelState === "result") {
      this.duelTimer -= dt;
      if (this.duelTimer > 0) return;
      this.duelState = "countdown";
      this.duelTimer = 0.9 + Math.random() * 1.2;
      this.roundWinner = 0;
      this.targets = [-1, -1];
      this.reactions = [null, null];
      this.message = "Wait for your light…";
      return;
    }
    this.goTime += dt;
    if (this.mode === "tug") {
      if (
        this.opponent === "ai" &&
        !this.roundWinner &&
        this.goTime >= this.aiReaction
      )
        this.press(this.aiSide, this.targets[this.aiSide - 1]);
      return;
    }
    // Idle hands slide back towards the middle, so mashing has to be sustained.
    const centre = this.duelLength / 2,
      drift = Math.min(Math.abs(centre - this.rope), dt * 0.6);
    this.rope += Math.sign(centre - this.rope) * drift;
    if (this.opponent === "ai") {
      this.aiMash -= dt;
      while (this.aiMash <= 0 && !this.over) {
        this.press(this.aiSide);
        this.aiMash += mashInterval(this.difficulty);
      }
    }
    this.checkRope();
  }
  update(dt: number) {
    // Keep the score animation on the existing scheduler after gameplay stops.
    if (this.over) {
      this.scoreTime += dt;
      return;
    }
    if (!this.running) return;
    this.time += dt * this.speed;
    this.tick += dt * this.speed;
    if (this.mode === "life") {
      while (this.tick >= 0.3) {
        this.tick -= 0.3;
        this.stepLife();
      }
    }
    if (
      (this.mode === "reversi" || this.mode === "connect") &&
      this.opponent === "ai" &&
      this.turn === this.aiSide
    ) {
      this.aiTimer += dt;
      if (this.aiTimer >= 0.45) {
        this.aiTimer = 0;
        this.moveAi();
      }
    }
    if (duelModes.includes(this.mode)) this.updateDuel(dt);
    if (
      this.mode === "tetris" &&
      this.tick >= Math.max(0.12, 0.7 - this.lines * 0.025)
    ) {
      this.tick = 0;
      this.drop();
    }
    if (this.mode === "snake" && this.tick >= 0.23) {
      this.tick = 0;
      this.direction = this.pending;
      const x = (this.snake[0] % this.width) + this.direction[0],
        y = Math.floor(this.snake[0] / this.width) + this.direction[1],
        n = y * this.width + x,
        eat = n === this.food;
      if (
        x < 0 ||
        x >= this.width ||
        y < 0 ||
        y >= this.height ||
        this.snake.slice(0, eat ? undefined : -1).includes(n)
      ) {
        this.finishGame();
        return;
      }
      this.snake.unshift(n);
      if (eat) {
        this.score += 10;
        const free = this.board
          .map((_, i) => i)
          .filter((i) => !this.snake.includes(i));
        if (!free.length) {
          this.finishGame();
        } else this.food = free[Math.floor(Math.random() * free.length)];
      } else this.snake.pop();
    }
  }
  render(): RGB[] {
    if (this.over && (this.mode === "tetris" || this.mode === "snake")) {
      return this.renderArcadeEnding();
    }
    if (this.over && this.mode === "lights") {
      const text = `SOLVED ${this.moves} MOVES`;
      return this.renderText(text, this.scoreTime + this.width / 8, palette[5]);
    }
    if (this.over && twoPlayerModes.includes(this.mode))
      return this.renderText(
        this.resultText,
        this.scoreTime + this.width / 8,
        this.winner === 1 || this.winner === 2
          ? teams[this.winner - 1]
          : [255, 255, 255],
      );
    if (this.mode === "reversi" || this.mode === "connect")
      return this.renderBoard();
    if (duelModes.includes(this.mode)) return this.renderDuel();
    const f = this.board.map((c) => [...c] as RGB);
    if (this.mode === "tetris") {
      let gy = this.py;
      while (this.fits(this.px, gy + 1, this.piece)) gy++;
      this.piece.forEach((r, y) =>
        r.forEach((v, x) => {
          if (v) {
            f[(gy + y) * this.width + this.px + x] = this.pieceColor.map((c) =>
              Math.round(c * 0.17),
            ) as RGB;
            f[(this.py + y) * this.width + this.px + x] = this.pieceColor;
          }
        }),
      );
    }
    if (this.mode === "snake") {
      this.snake.forEach(
        (n, i) => (f[n] = i === 0 ? [216, 255, 144] : [115, 190, 71]),
      );
      f[this.food] = [255, 104, 139];
    }
    if (
      this.mode === "rainbow" ||
      (this.mode === "scroller" && this.effect !== "text")
    )
      return f.map((_, i) => {
        const x = i % this.width,
          y = Math.floor(i / this.width),
          t = this.time * 2;
        const phase =
          this.effect === "pulse"
            ? Math.hypot(x - this.width / 2, y - this.height / 2) * 0.6 - t
            : x * 0.35 + y * 0.4 - t;
        return [0, 2, 4].map((n) =>
          Math.round((Math.sin(phase + n) * 0.5 + 0.5) * 230),
        ) as RGB;
      });
    if (this.mode === "scroller")
      return this.renderText(this.text, this.time, this.color);
    if (this.mode === "paint" && this.playback && this.frames.length)
      return this.frames[Math.floor(this.time * 4) % this.frames.length];
    return f;
  }
  get endingPhase(): "flash" | "score" | "replay" {
    if (this.scoreTime < 0.9) return "flash";
    const scoreDuration = (`SCORE ${this.score}`.length * 6) / 8;
    const replayDuration = ("PLAY AGAIN".length * 6) / 8;
    const phaseTime = (this.scoreTime - 0.9) % (scoreDuration + replayDuration);
    return phaseTime < scoreDuration ? "score" : "replay";
  }
  private renderArcadeEnding(): RGB[] {
    if (this.endingPhase === "flash") {
      // One soft impact pulse and an expanding diamond, rather than a strobe.
      const t = this.scoreTime / 0.9;
      return this.blank().map((_, i) => {
        const distance =
          Math.abs((i % this.width) - (this.width - 1) / 2) +
          Math.abs(Math.floor(i / this.width) - (this.height - 1) / 2);
        const ring = Math.max(
          0,
          1 - Math.abs(distance - (t * (this.width + this.height)) / 2) / 2,
        );
        const glow =
          (0.15 + 0.65 * ring) * (1 - t) + 0.2 * Math.sin(Math.PI * t);
        return [255, 90, 155].map((c) => Math.round(c * glow)) as RGB;
      });
    }
    const scoreText = `SCORE ${this.score}`;
    const scoreDuration = (scoreText.length * 6) / 8;
    const phaseTime =
      (this.scoreTime - 0.9) % (scoreDuration + ("PLAY AGAIN".length * 6) / 8);
    const replay = this.endingPhase === "replay";
    const time = replay ? phaseTime - scoreDuration : phaseTime;
    const frame = this.renderText(
      replay ? "PLAY AGAIN" : scoreText,
      time + this.width / 8,
      [255, 255, 255],
    );
    return frame.map((rgb, i) => {
      if (!rgb.some(Boolean)) return rgb;
      if (replay) {
        const pulse =
          0.55 + 0.45 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 1.8));
        return palette[0].map((c) => Math.round(c * pulse)) as RGB;
      }
      const phase = (i % this.width) * 0.2 - time * 1.4;
      return [0, 2, 4].map((n) =>
        Math.round(140 + 115 * Math.sin(phase + n)),
      ) as RGB;
    });
  }
  get resultText() {
    if (this.winner === 3) return "DRAW";
    const name = this.winner === 1 ? "PINK" : "BLUE";
    if (this.mode === "reversi") {
      const [one, two] = this.counts;
      return `${name} WINS ${Math.max(one, two)}-${Math.min(one, two)}`;
    }
    return `${name} WINS`;
  }
  private renderBoard(): RGB[] {
    const f = this.blank();
    const human = this.opponent === "human" || this.turn !== this.aiSide;
    if (this.mode === "reversi" && human)
      for (const index of this.legal.keys())
        f[index] = teams[this.turn - 1].map((c) => Math.round(c * 0.14)) as RGB;
    if (this.mode === "connect" && human)
      for (let column = 0; column < this.width; column++) {
        const index = connectDrop(this.cells, this.width, this.height, column);
        if (index >= 0)
          f[index] = teams[this.turn - 1].map((c) =>
            Math.round(c * 0.14),
          ) as RGB;
      }
    this.cells.forEach((cell, i) => {
      if (cell) f[i] = [...teams[cell - 1]] as RGB;
    });
    if (this.lastMove >= 0 && this.cells[this.lastMove]) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 7);
      f[this.lastMove] = teams[this.cells[this.lastMove] - 1].map((c) =>
        Math.round(c + (255 - c) * 0.5 * pulse),
      ) as RGB;
    }
    for (const index of this.winLine) f[index] = [255, 255, 255];
    return f;
  }
  private renderDuel(): RGB[] {
    const f = this.blank(),
      edge = this.duelEdge;
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const along = this.duelAxis === "x" ? x : y,
          mine = along < edge,
          border = along === edge - 1 || along === edge,
          scale = border ? 0.8 : 0.2;
        f[y * this.width + x] = teams[mine ? 0 : 1].map((c) =>
          Math.round(c * scale),
        ) as RGB;
      }
    if (this.mode === "tug" && this.duelState === "go")
      this.targets.forEach((target) => {
        if (target >= 0) f[target] = [255, 255, 255];
      });
    if (this.duelState === "result" && this.roundWinner) {
      const half = this.duelLength / 2;
      for (let y = 0; y < this.height; y++)
        for (let x = 0; x < this.width; x++) {
          const along = this.duelAxis === "x" ? x : y;
          if ((along < half ? 1 : 2) !== this.roundWinner) continue;
          f[y * this.width + x] = teams[this.roundWinner - 1].map((c) =>
            Math.round(c * 0.55),
          ) as RGB;
        }
    }
    return f;
  }
  private renderText(text: string, time: number, color: RGB): RGB[] {
    const f = this.blank();
    const chars = Array.from(text.toUpperCase() || " ");
    const offset = Math.floor(time * 8) % (chars.length * 6 + this.width);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const sx = x + offset - this.width,
          cy = y - Math.floor((this.height - 7) / 2);
        if (sx >= 0 && sx < chars.length * 6 && cy >= 0 && cy < 7) {
          const g = (glyphs[chars[Math.floor(sx / 6)]] ?? glyphs["?"]).split(
            " ",
          );
          if (sx % 6 < 5 && g[cy][sx % 6] === "1")
            f[y * this.width + x] = color;
        }
      }
    return f;
  }
}
