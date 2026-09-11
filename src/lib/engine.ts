export type RGB = [number, number, number];
export type Mode = "tetris" | "scroller" | "snake" | "rainbow" | "paint";
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
      this.over = true;
      this.running = false;
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
  update(dt: number) {
    if (!this.running || this.over) return;
    this.time += dt * this.speed;
    this.tick += dt * this.speed;
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
        this.over = true;
        this.running = false;
        return;
      }
      this.snake.unshift(n);
      if (eat) {
        this.score += 10;
        const free = this.board
          .map((_, i) => i)
          .filter((i) => !this.snake.includes(i));
        if (!free.length) {
          this.over = true;
          this.running = false;
        } else this.food = free[Math.floor(Math.random() * free.length)];
      } else this.snake.pop();
    }
  }
  render(): RGB[] {
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
    if (this.mode === "scroller") {
      const chars = Array.from(this.text.toUpperCase() || " ");
      const offset =
        Math.floor(this.time * 8) % (chars.length * 6 + this.width);
      for (let y = 0; y < this.height; y++)
        for (let x = 0; x < this.width; x++) {
          const sx = x + offset - this.width,
            cy = y - Math.floor((this.height - 7) / 2);
          if (sx >= 0 && sx < chars.length * 6 && cy >= 0 && cy < 7) {
            const g = (glyphs[chars[Math.floor(sx / 6)]] ?? glyphs["?"]).split(
              " ",
            );
            if (sx % 6 < 5 && g[cy][sx % 6] === "1")
              f[y * this.width + x] = this.color;
          }
        }
    }
    if (this.mode === "paint" && this.playback && this.frames.length)
      return this.frames[Math.floor(this.time * 4) % this.frames.length];
    return f;
  }
}
