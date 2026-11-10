import type { Mode } from "./engine.ts";

/** Experiences in the Browser games track, in tab order. */
export const modes: {
  id: Mode;
  name: string;
  desc: string;
}[] = [
  {
    id: "tetris",
    name: "Tetris",
    desc: "Seven tetrominoes with wall kicks, soft and hard drops, a next-piece preview and rising speed.",
  },
  {
    id: "scroller",
    name: "Marquee",
    desc: "Scrolls your text across every connected pad in a 5×7 font, or plays a rainbow wave or color ripple.",
  },
  {
    id: "snake",
    name: "Snake",
    desc: "Eat the food, grow, and avoid your own tail. Edges wrap by default; turn that off in the score panel.",
  },
  {
    id: "life",
    name: "Game of Life",
    desc: "Conway’s B3/S23 rules. Toggle cells while it runs, step one generation, seed a glider or random board, and save a starting pattern.",
  },
  {
    id: "lights",
    name: "Lights Out",
    desc: "Pressing a cell flips it and its four neighbors. Turn every light off. Every puzzle is solvable.",
  },
  {
    id: "reversi",
    name: "Reversi",
    desc: "Place a disc to flip every opponent line you trap. Most discs at the end wins.",
  },
  {
    id: "connect",
    name: "Connect four",
    desc: "Drop a piece in any column. Four in a row across, down or diagonally wins.",
  },
  {
    id: "tug",
    name: "Tug of war",
    desc: "After a random wait a light appears on each side. First to hit theirs pulls the rope; pressing early loses the round.",
  },
  {
    id: "masher",
    name: "Button masher",
    desc: "Mash your half faster than your rival to pull the rope. It drifts back to the middle when you stop.",
  },
  {
    id: "mines",
    name: "Minesweeper",
    desc: "Open every cell without a mine. Press to reveal, hold to flag. The first cell is always safe, and each color counts the mines around it.",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    desc: "A continuous animated color field across the whole canvas.",
  },
  {
    id: "paint",
    name: "Pixel studio",
    desc: "Paint pixels, save up to 200 frames, play them back, and import or export JSON.",
  },
];
