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
