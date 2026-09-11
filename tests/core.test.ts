import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/lib/engine.ts";
import { MidiAdapter, decode, encode } from "../src/lib/midi.ts";

test("exact SysEx bytes, corners, clamping, full frame and changed-cell batching", () => {
  const e = new Engine();
  const frame = e.blank();
  frame[0] = [255, 0, 0];
  frame[7] = [0, 255, 0];
  frame[19] = [300, -8, 3];
  frame[56] = [0, 0, 255];
  frame[63] = [255, 255, 255];
  const { bytes, keys } = encode(frame);
  assert.equal(bytes.length, 260);
  assert.deepEqual(bytes.slice(0, 7), [240, 19, 55, 8, 127, 0, 0]);
  assert.deepEqual(bytes.slice(3 + 7 * 4, 3 + 8 * 4), [15, 0, 127, 0]);
  assert.deepEqual(bytes.slice(3 + 19 * 4, 3 + 20 * 4), [43, 127, 0, 1]);
  assert.equal(bytes[3 + 56 * 4], 120);
  assert.equal(bytes[3 + 63 * 4], 127);
  assert.equal(bytes.at(-1), 247);
  assert.equal(encode(frame, keys).bytes.length, 4);
  frame[0] = [0, 0, 0];
  assert.deepEqual(encode(frame, keys).bytes, [240, 19, 55, 8, 0, 0, 0, 247]);
});
test("button decoding accepts positive values and rejects other channels and invalid coordinates", () => {
  assert.deepEqual(decode([176, 35, 1]), { row: 2, col: 3, pressed: true });
  assert.deepEqual(decode([176, 119, 0]), { row: 7, col: 7, pressed: false });
  assert.equal(decode([177, 0, 127]), null);
  assert.equal(decode([176, 8, 127]), null);
  assert.equal(decode([176, 128, 127]), null);
  assert.equal(decode([176, 0]), null);
});
class Input extends EventTarget {
  id = "in1";
  name = "CH32X035-MIDI";
  state = "connected";
  emit(data: number[]) {
    const e = new Event("midimessage");
    Object.assign(e, { data: new Uint8Array(data) });
    this.dispatchEvent(e);
  }
}
class Output {
  id = "out1";
  name = "BLOOPPAD";
  state = "connected";
  sent: number[][] = [];
  fail = false;
  send(data: number[]) {
    if (this.fail) throw Error("Disconnected");
    this.sent.push(data);
  }
}
function setup() {
  const input = new Input(),
    output = new Output(),
    access = new EventTarget();
  Object.assign(access, {
    inputs: new Map([["in1", input]]),
    outputs: new Map([["out1", output]]),
  });
  const events: unknown[] = [];
  const midi = new MidiAdapter(
    (...args) => events.push(args),
    () => {},
  );
  midi.access = access as unknown as MIDIAccess;
  midi.bind();
  return { input, output, access, midi, events };
}
test("deduplication, releases, reconnect repaint, failure recovery and listener cleanup", () => {
  const { midi, input, output, events } = setup();
  assert.equal(midi.status, "Connected");
  input.emit([176, 0, 1]);
  input.emit([176, 0, 127]);
  input.emit([176, 0, 0]);
  input.emit([176, 0, 0]);
  assert.deepEqual(events, [
    [0, 0, 0, true],
    [0, 0, 0, false],
  ]);
  input.emit([176, 119, 1]);
  input.state = "disconnected";
  midi.bind();
  assert.deepEqual(events.at(-1), [0, 7, 7, false]);
  assert.equal(midi.status, "Waiting for input / output");
  const frame = new Engine().blank();
  midi.send([frame]);
  midi.send([frame]);
  assert.equal(output.sent.length, 1);
  assert.equal(output.sent[0].length, 260);
  output.state = "disconnected";
  midi.bind();
  output.state = "connected";
  input.state = "connected";
  midi.bind();
  midi.send([frame]);
  assert.equal(output.sent.length, 2);
  assert.equal(output.sent[1].length, 260);
  frame[0] = [255, 0, 0];
  output.fail = true;
  midi.send([frame]);
  assert.match(midi.error, /LED send failed/);
  assert.equal(midi.caches.size, 0);
  output.fail = false;
  midi.send([frame]);
  assert.equal(output.sent.at(-1)?.length, 260);
  assert.equal(midi.error, "");
  midi.dispose();
  const n = events.length;
  input.emit([176, 0, 1]);
  assert.equal(events.length, n);
});
test("input/output assignment is exclusive across slots", () => {
  const { midi } = setup();
  midi.resize(2);
  midi.assign(1, "output", "out1");
  assert.equal(midi.slots[0].output, "");
  assert.equal(midi.slots[1].output, "out1");
  midi.dispose();
});
test("Tetris movement, rotation, hard drop, line clearing and pause", () => {
  const e = new Engine();
  e.piece = [[1, 1, 1, 1]];
  e.px = 0;
  e.py = 0;
  e.running = true;
  e.action("left");
  assert.equal(e.px, 0);
  e.action("up");
  assert.deepEqual(e.piece, [[1], [1], [1], [1]]);
  e.action("right");
  assert.equal(e.px, 1);
  e.action("drop");
  assert.equal(e.board.filter((c) => c.some(Boolean)).length, 4);
  e.reset();
  e.piece = [[1, 1, 1, 1]];
  e.px = 0;
  e.py = 7;
  e.board.splice(
    60,
    4,
    ...Array.from({ length: 4 }, () => [255, 0, 0] as [number, number, number]),
  );
  e.running = true;
  e.drop();
  assert.equal(e.lines, 1);
  assert.equal(e.score, 100);
  assert.equal(e.board.filter((c) => c.some(Boolean)).length, 0);
  e.running = false;
  const before = e.py;
  e.update(1);
  assert.equal(e.py, before);
});
test("pad deduplication/release and all layouts render complete RGB canvases", () => {
  const e = new Engine();
  e.running = true;
  e.px = 3;
  e.piece = [[1]];
  e.onPad(3, 0, true);
  e.onPad(3, 0, true);
  assert.equal(e.px, 2);
  e.onPad(3, 0, false);
  e.onPad(3, 0, true);
  assert.equal(e.px, 1);
  for (const mode of [
    "tetris",
    "snake",
    "scroller",
    "rainbow",
    "paint",
  ] as const)
    for (const [w, h] of [
      [8, 8],
      [32, 8],
      [8, 32],
    ]) {
      e.configure(mode, w, h);
      e.running = true;
      e.update(0.1);
      const frame = e.render();
      assert.equal(frame.length, w * h);
      assert.ok(frame.every((c) => c.length === 3 && c.every(Number.isFinite)));
    }
});
test("Snake eats, rejects reversal and ends at walls", () => {
  const e = new Engine();
  e.configure("snake", 8, 8);
  e.food = e.snake[0] + 1;
  e.running = true;
  e.action("left");
  assert.deepEqual(e.pending, [1, 0]);
  e.update(0.25);
  assert.equal(e.score, 10);
  assert.equal(e.snake.length, 4);
  for (let i = 0; i < 10; i++) e.update(0.25);
  assert.ok(e.over);
  assert.equal(e.running, false);
});
test("text scrolls and paint frame playback uses saved frames", () => {
  const e = new Engine();
  e.configure("scroller", 16, 8);
  e.running = true;
  for (let i = 0; i < 12; i++) e.update(0.1);
  assert.ok(e.render().some((c) => c.some(Boolean)));
  e.configure("paint", 8, 8);
  e.onPad(2, 3, true);
  assert.deepEqual(e.board[19], e.color);
  e.frames = [e.board.map((c) => [...c]), e.blank()];
  e.playback = true;
  e.running = true;
  e.update(0.3);
  assert.ok(e.render().every((c) => c.every((v) => v === 0)));
});

test("connection permission errors survive simulator animation frames", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      requestMIDIAccess: async () => {
        throw Error("Permission denied");
      },
    },
  });
  try {
    const midi = new MidiAdapter(
      () => {},
      () => {},
    );
    await midi.connect();
    midi.send([new Engine().blank()]);
    assert.equal(midi.status, "Permission / connection error");
    assert.equal(midi.error, "Permission denied");
    midi.dispose();
  } finally {
    if (original) Object.defineProperty(globalThis, "navigator", original);
  }
});

test("Tetris and Snake endings scroll the final score on every canvas size", () => {
  for (const mode of ["tetris", "snake"] as const) {
    for (const [width, height] of [
      [8, 8],
      [16, 8],
      [8, 16],
      [32, 8],
      [8, 32],
    ]) {
      for (const score of [0, 120]) {
        const e = new Engine();
        e.configure(mode, width, height);
        e.score = score;
        e.running = true;
        e.color = [0, 0, 0]; // Paint's eraser must not hide the score.
        e.effect = "pulse"; // A prior marquee effect must not replace the text.
        if (mode === "tetris") {
          e.board = e.board.map(() => [255, 0, 0]);
          e.spawn();
        } else {
          e.snake = [width - 1, width - 2, width - 3];
          e.update(0.25);
        }
        assert.ok(e.over);
        assert.equal(e.running, false);
        const initial = e.render();
        assert.ok(initial.some((c) => c.some(Boolean)));
        const board = structuredClone(e.board);
        const snake = [...e.snake];
        e.action("drop");
        e.update(0.5);
        assert.notDeepEqual(e.render(), initial);
        assert.equal(e.score, score);
        assert.deepEqual(e.board, board);
        assert.deepEqual(e.snake, snake);
        assert.equal(e.render().length, width * height);
        // After the label passes, check the numeric score against the font renderer.
        e.update(4);
        const expected = new Engine();
        expected.configure("scroller", width, height);
        expected.text = `SCORE ${score}`;
        expected.color = [77, 221, 207];
        expected.time = 3.6 + width / 8;
        assert.deepEqual(
          e.render().map((c) => c.some(Boolean)),
          expected.render().map((c) => c.some(Boolean)),
        );
        e.reset();
        assert.equal(e.over, false);
        assert.equal(e.score, 0);
        assert.equal(e.running, false);
        e.configure("paint", width, height);
        e.update(1);
        assert.ok(e.render().every((c) => c.every((v) => v === 0)));
      }
    }
  }
});

test("Snake completion also shows the winning score and sends animated LED frames", () => {
  const e = new Engine();
  e.configure("snake", 8, 8);
  e.snake = Array.from({ length: 63 }, (_, i) => 62 - i);
  e.food = 63;
  e.score = 600;
  e.running = true;
  e.update(0.25);
  assert.ok(e.over);
  assert.equal(e.score, 610);
  const { midi, output } = setup();
  midi.send([e.render()]);
  e.update(0.5);
  midi.send([e.render()]);
  assert.equal(output.sent.length, 2);
  assert.equal(output.sent[0].length, 260);
  assert.ok(output.sent[1].length > 4);
  midi.dispose();
});

test("arcade ending progresses from impact to score to replay, loops, and accepts a pad restart", () => {
  for (const mode of ["tetris", "snake"] as const) {
    const e = new Engine();
    e.configure(mode, 8, 8);
    e.score = 120;
    e.board = e.board.map(() => [255, 0, 0]);
    e.spawn();
    assert.equal(e.endingPhase, "flash");
    e.onPad(0, 0, true);
    e.onPad(0, 0, false);
    assert.ok(e.over, "opening flash ignores accidental presses");
    e.update(0.9);
    assert.equal(e.endingPhase, "score");
    const scoreFrame = e.render();
    assert.ok(scoreFrame.some((c) => c.some(Boolean)));
    assert.ok(
      new Set(scoreFrame.filter((c) => c.some(Boolean)).map((c) => c.join(",")))
        .size > 1,
    );
    e.update(("SCORE 120".length * 6) / 8);
    assert.equal(e.endingPhase, "replay");
    const prompt = new Engine();
    prompt.configure("scroller", 8, 8);
    prompt.text = "PLAY AGAIN";
    prompt.time = 1;
    assert.deepEqual(
      e.render().map((c) => c.some(Boolean)),
      prompt.render().map((c) => c.some(Boolean)),
    );
    const before = e.render();
    e.update(0.05);
    assert.notDeepEqual(
      e.render(),
      before,
      "prompt pulses even before moving one pixel",
    );
    e.update(("PLAY AGAIN".length * 6) / 8 - 0.05);
    assert.equal(e.endingPhase, "score");
    assert.equal(e.score, 120);
    e.onPad(3, 0, true);
    assert.equal(e.over, false);
    assert.equal(e.running, true);
    assert.equal(e.score, 0);
    const pieceX = e.px;
    e.onPad(3, 0, true);
    assert.equal(e.px, pieceX, "held restart pad does not also move a piece");
  }
});

test("Life toggles deduplicated presses, evolves a blinker and restores a custom start", () => {
  const e = new Engine();
  e.configure("life", 8, 8);
  for (const col of [2, 3, 4]) {
    e.onPad(3, col, true);
    e.onPad(3, col, true);
    e.onPad(3, col, false);
  }
  assert.equal(e.board.filter((c) => c.some(Boolean)).length, 3);
  e.saveStartingBoard();
  const initial = structuredClone(e.board);
  e.stepLife();
  assert.equal(e.generation, 1);
  assert.deepEqual(
    e.board.flatMap((c, i) => (c.some(Boolean) ? [i] : [])),
    [19, 27, 35],
  );
  e.stepLife();
  assert.deepEqual(e.board, initial);
  e.running = true;
  e.update(0.6);
  assert.equal(e.generation, 4);
  e.restoreStartingBoard();
  assert.equal(e.generation, 0);
  assert.equal(e.running, false);
  assert.deepEqual(e.board, initial);
  e.onPad(3, 2, true);
  e.onPad(3, 2, false);
  assert.equal(e.board[26].some(Boolean), false);
  e.seedLife("glider");
  assert.equal(e.board.filter((c) => c.some(Boolean)).length, 5);
  e.seedLife("clear");
  assert.ok(e.board.every((c) => !c.some(Boolean)));
});

test("Life shares neighbors across pad seams and does not wrap outer edges", () => {
  const e = new Engine();
  e.configure("life", 16, 8);
  for (const x of [6, 7, 8]) e.board[3 * 16 + x] = [77, 221, 207];
  e.stepLife();
  assert.deepEqual(
    e.board.flatMap((c, i) => (c.some(Boolean) ? [i] : [])),
    [39, 55, 71],
  );
  e.seedLife("clear");
  for (const i of [15, 16, 31]) e.board[i] = [77, 221, 207];
  e.stepLife();
  assert.equal(e.board[0].some(Boolean), false);
});

test("Lights Out flips only a cross, counts once per press and detects a solved puzzle", () => {
  const e = new Engine();
  e.configure("lights", 16, 8);
  e.board = e.blank();
  e.onPad(3, 7, true);
  e.onPad(3, 7, true);
  e.onPad(3, 7, false);
  assert.equal(e.moves, 1);
  assert.deepEqual(
    e.board.flatMap((c, i) => (c.some(Boolean) ? [i] : [])),
    [39, 54, 55, 56, 71],
  );
  e.onPad(3, 7, true);
  e.onPad(3, 7, false);
  assert.equal(e.moves, 2);
  assert.equal(e.over, true);
  assert.equal(e.running, false);
  assert.ok(e.render().some((c) => c.some(Boolean)));
  e.reset();
  e.board = e.blank();
  e.onPad(0, 0, true);
  e.onPad(0, 0, false);
  assert.deepEqual(
    e.board.flatMap((c, i) => (c.some(Boolean) ? [i] : [])),
    [0, 1, 16],
  );
  e.running = false;
  const before = structuredClone(e.board);
  e.onPad(2, 2, true);
  e.onPad(2, 2, false);
  assert.deepEqual(e.board, before);
});

test("Lights Out generated puzzles are solved by replaying their scramble and retry restores them", () => {
  const original = Math.random;
  try {
    for (const [width, height] of [
      [8, 8],
      [32, 8],
      [8, 32],
    ]) {
      const e = new Engine();
      e.configure("lights", width, height);
      const values: number[] = [];
      Math.random = () => {
        const v = original();
        values.push(v);
        return v;
      };
      e.newLightsPuzzle();
      Math.random = original;
      const initial = structuredClone(e.board);
      assert.ok(initial.some((c) => c.some(Boolean)));
      for (let i = 0; i < values.length; i += 2) {
        const r = Math.floor(values[i] * height),
          c = Math.floor(values[i + 1] * width);
        e.onPad(r, c, true);
        e.onPad(r, c, false);
        if (e.over) break;
      }
      assert.ok(e.over, "legal scramble can be reversed");
      e.restoreStartingBoard();
      assert.deepEqual(e.board, initial);
      assert.equal(e.moves, 0);
      assert.equal(e.over, false);
      assert.equal(e.running, true);
    }
  } finally {
    Math.random = original;
  }
});
