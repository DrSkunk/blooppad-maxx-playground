/* The engine and MIDI adapter are mutable external services. The single scheduler publishes frames to React. */
/* oxlint-disable react/immutability */
import { useEffect, useState } from "react";
import {
  Engine,
  duelModes,
  palette,
  shapes,
  teams,
  twoPlayerModes,
} from "../lib/engine";
import type { Mode, RGB } from "../lib/engine";
import type { Difficulty } from "../lib/games.ts";
import { MidiAdapter } from "../lib/midi";
import { PadBed, PadShell } from "../components/PadShell";
import { modes } from "../lib/modes";
import {
  FLAG,
  HIDDEN,
  NUMBER_COLORS,
  flagCount,
  mineCount,
} from "../lib/minesweeper";
export function Playground({ initialMode }: { initialMode?: Mode }) {
  const [engine] = useState(() => {
    const e = new Engine();
    if (initialMode) e.configure(initialMode, 8, 8);
    return e;
  });
  const [mode, setMode] = useState<Mode>(initialMode ?? "tetris"),
    [count, setCount] = useState(1),
    [layout, setLayout] = useState("horizontal"),
    [brightness, setBrightness] = useState(80),
    [speed, setSpeed] = useState(1),
    [fps, setFps] = useState(30),
    [saturation, setSaturation] = useState(false),
    [frame, setFrame] = useState<RGB[]>(engine.render()),
    [, refresh] = useState(0),
    [devices, setDevices] = useState(false),
    [notice, setNotice] = useState(""),
    [text, setText] = useState("HELLO BLOOP!"),
    [color, setColor] = useState(0),
    [orientation, setOrientation] = useState(false);
  const [settings] = useState(() => ({
    count,
    layout,
    brightness,
    fps,
    saturation,
    orientation,
  }));
  useEffect(() => {
    Object.assign(settings, {
      count,
      layout,
      brightness,
      fps,
      saturation,
      orientation,
    });
  }, [settings, count, layout, brightness, fps, saturation, orientation]);
  const force = () => refresh((n) => n + 1);
  const [midi] = useState(
    () =>
      new MidiAdapter(
        (slot, r, c, p) => {
          onDevicePad(slot, r, c, p, "hardware");
        },
        () => refresh((n) => n + 1),
      ),
  );
  useEffect(() => {
    midi.disposed = false;
    let raf = 0,
      last = performance.now(),
      sent = 0;
    const loop = (now: number) => {
      engine.update(Math.min((now - last) / 1000, 0.1));
      last = now;
      if (now - sent >= 1000 / settings.fps) {
        sent = now;
        const s = settings;
        let raw = engine.render();
        if (s.orientation) {
          raw = engine.blank();
          for (let p = 0; p < s.count; p++) {
            const ox = s.layout === "horizontal" ? p * 8 : 0,
              oy = s.layout === "vertical" ? p * 8 : 0;
            [
              [0, 0, [255, 0, 0]],
              [7, 0, [0, 255, 0]],
              [0, 7, [0, 0, 255]],
              [7, 7, [255, 255, 255]],
            ].forEach(
              ([x, y, c]) =>
                (raw[(oy + (y as number)) * engine.width + ox + (x as number)] =
                  c as RGB),
            );
          }
        }
        const f = raw.map((c) => {
          const mean = (c[0] + c[1] + c[2]) / 3;
          return c.map((v) =>
            Math.round(
              (Math.max(
                0,
                Math.min(255, s.saturation ? mean + (v - mean) * 2 : v),
              ) *
                s.brightness) /
                100,
            ),
          ) as RGB;
        });
        setFrame(f);
        midi.send(
          Array.from({ length: s.count }, (_, p) =>
            Array.from(
              { length: 64 },
              (_, i) =>
                f[
                  (Math.floor(i / 8) + (s.layout === "vertical" ? p * 8 : 0)) *
                    engine.width +
                    (i % 8) +
                    (s.layout === "horizontal" ? p * 8 : 0)
                ],
            ),
          ),
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const keys: Record<string, string> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      " ": "drop",
    };
    const held = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches("input,textarea,select")
      )
        return;
      if (
        keys[e.key] &&
        (engine.mode === "tetris" || engine.mode === "snake")
      ) {
        e.preventDefault();
        if (!held.has(e.key)) {
          held.add(e.key);
          if (e.key === " ") {
            engine.action("drop");
            return;
          }
          engine.onPad(
            keys[e.key] === "up"
              ? 0
              : keys[e.key] === "down"
                ? engine.height - 1
                : Math.floor(engine.height / 2),
            keys[e.key] === "left" ? 0 : engine.width - 1,
            true,
            "keyboard:" + e.key,
          );
        }
      }
      if (e.key.toLowerCase() === "p" && !e.repeat && !engine.over) {
        engine.running = !engine.running;
        force();
      }
      const duel: Record<string, 1 | 2> = { a: 1, l: 2 };
      const side = duel[e.key.toLowerCase()];
      if (side && duelModes.includes(engine.mode)) {
        e.preventDefault();
        if (!e.repeat) engine.pressKey(side);
      }
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.key);
      for (const k of engine.held)
        if (k.startsWith("keyboard:" + e.key + ":")) engine.held.delete(k);
    };
    const blur = () => {
      held.clear();
      engine.held.clear();
      engine.running = false;
      force();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(raf);
      midi.dispose();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [engine, midi, settings]);
  function configure(m: Mode, n = count, l = layout) {
    midi.release();
    Object.assign(settings, { count: n, layout: l });
    setMode(m);
    setCount(n);
    setLayout(l);
    engine.configure(
      m,
      l === "horizontal" ? n * 8 : 8,
      l === "vertical" ? n * 8 : 8,
    );
    midi.resize(n);
    setOrientation(false);
    setNotice("");
    force();
  }
  function onDevicePad(
    slot: number,
    row: number,
    col: number,
    pressed: boolean,
    source: string,
  ) {
    engine.onPad(
      row + (settings.layout === "vertical" ? slot * 8 : 0),
      col + (settings.layout === "horizontal" ? slot * 8 : 0),
      pressed,
      source,
    );
  }
  function toggle() {
    if (engine.over) {
      engine.reset();
      engine.running = true;
    } else engine.running = !engine.running;
    force();
  }
  function exportFrames() {
    const data = {
      version: 1,
      width: engine.width,
      height: engine.height,
      frames: engine.frames.length ? engine.frames : [engine.board],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bloop-animation.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFrames(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error("File must be smaller than 5 MB.");
      const data = JSON.parse(await file.text());
      if (
        data.width !== engine.width ||
        data.height !== engine.height ||
        !Array.isArray(data.frames) ||
        !data.frames.length ||
        data.frames.length > 200 ||
        !data.frames.every(
          (f: unknown) =>
            Array.isArray(f) &&
            f.length === engine.width * engine.height &&
            f.every(
              (c: unknown) =>
                Array.isArray(c) &&
                c.length === 3 &&
                c.every(
                  (v) =>
                    typeof v === "number" &&
                    Number.isFinite(v) &&
                    v >= 0 &&
                    v <= 255,
                ),
            ),
        )
      )
        throw Error("Use matching grid dimensions and 1–200 valid RGB frames.");
      engine.frames = data.frames;
      engine.board = data.frames[0].map((c: RGB) => [...c]);
      engine.playback = false;
      setNotice(`Imported ${data.frames.length} frames.`);
    } catch (e) {
      setNotice(String(e));
    }
  }
  const current = modes.find((m) => m.id === mode)!;
  const twoPlayer = twoPlayerModes.includes(mode),
    duel = duelModes.includes(mode),
    teamScores = duel
      ? mode === "tug"
        ? engine.rounds
        : engine.presses
      : engine.counts,
    scoreNoun = mode === "masher" ? "presses" : "discs",
    matchStatus = !twoPlayer
      ? ""
      : engine.over
        ? engine.winner === 3
          ? "A perfect draw. Press a pad to play again."
          : `${engine.winner === 1 ? "Red" : "Blue"} wins! Press a pad to play again.`
        : duel
          ? engine.message
          : `${engine.turn === 1 ? "Red" : "Blue"} to move${
              engine.opponent === "ai" && engine.turn === engine.aiSide
                ? " · AI is thinking…"
                : ""
            }${engine.message ? ` · ${engine.message}` : ""}`;
  return (
    <div className="pb-14">
      <section className="compact:pt-7 grid items-start gap-6 pt-10 pb-8 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div>
          <h1 className="font-display compact:text-4xl text-5xl leading-tight font-semibold tracking-tight">
            Browser games<span className="text-app">.</span>
          </h1>
          <p className="text-muted mt-3 max-w-xl text-sm leading-6">
            Games and pixel tools that run in this browser and drive the pad’s
            LEDs over USB-MIDI. Up to four pads side by side. Without a pad,
            everything plays on screen.
          </p>
        </div>
        <ol
          aria-label="Connect your pad"
          className="border-line-strong bg-canvas space-y-3 border p-5 text-xs leading-5"
        >
          <li className="flex gap-3">
            <span className="font-display text-app tabular-nums">1</span>
            <span>
              Plug the pad in. It shows its firmware version, then{" "}
              <b className="text-app font-medium">CHOOSE GAME</b>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-app tabular-nums">2</span>
            <span>
              Press the{" "}
              <b className="text-app font-medium">white button, bottom-right</b>
              , twice. The pad is now in MIDI mode and waits for this page.
            </span>
          </li>
          <li className="flex flex-wrap items-center gap-3">
            <span className="font-display text-app tabular-nums">3</span>
            <button
              className="border-line-strong hover:bg-surface border px-3 py-2 text-[11px]"
              onClick={() => {
                setDevices(!devices);
                if (!midi?.access) void midi?.connect();
              }}
              aria-expanded={devices}
            >
              {midi?.status === "Connected"
                ? "Manage devices"
                : "Connect BLOOPPAD"}
            </button>
            <span
              className="text-nav flex items-center gap-2 text-[11px]"
              role="status"
            >
              <span
                className={`inline-block size-1.5 shrink-0 ${midi?.status === "Connected" ? "bg-success" : "bg-dim"}`}
              />
              {midi?.status === "Connected"
                ? "Hardware connected"
                : "Simulator only"}
            </span>
          </li>
          <li className="text-nav border-line border-t pt-3 text-[11px]">
            To leave MIDI mode, unplug and replug the pad. It starts in its own
            game menu again.
          </li>
        </ol>
      </section>
      <nav
        aria-label="Browser games"
        className="border-line-soft mb-6 flex flex-wrap gap-1 border-b pb-3"
      >
        {modes.map((m) => (
          <button
            key={m.id}
            aria-current={mode === m.id ? "page" : undefined}
            className={`flex flex-none items-center gap-2 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors hover:bg-surface ${mode === m.id ? "bg-app text-canvas" : "text-nav"}`}
            onClick={() => configure(m.id)}
          >
            {m.name}
          </button>
        ))}
      </nav>
      <section className="mb-6">
        <h2 className="font-display compact:text-2xl text-3xl font-semibold tracking-tight">
          {current.name}
        </h2>
        <p className="text-muted mt-2 max-w-2xl text-xs leading-5">
          {current.desc}
        </p>
      </section>
      {!devices && midi.error && (
        <div
          className="border-line-strong bg-canvas mb-5 border p-5 text-xs"
          role="alert"
        >
          {midi.error}{" "}
          <button onClick={() => setDevices(true)}>
            Open device connections ↗
          </button>
        </div>
      )}
      {devices && (
        <section className="border-line-strong bg-canvas mb-5 border p-5 text-xs">
          <div className="flex justify-between">
            Device connections{" "}
            <button
              className="border-line-strong border px-2 py-1.5"
              onClick={() => void midi?.connect()}
            >
              Retry connection
            </button>
          </div>
          <p role="status">
            {midi?.status} · {midi?.inputs.length ?? 0} inputs /{" "}
            {midi?.outputs.length ?? 0} outputs discovered
          </p>
          {midi?.error && <p role="alert">{midi.error}</p>}
          {Array.from({ length: count }, (_, i) => (
            <div
              className="compact:flex-wrap mt-3 flex items-center gap-4"
              key={i}
            >
              <b className="compact:w-full">Pad {i + 1}</b>
              {(["input", "output"] as const).map((type) => (
                <label className="flex-1" key={type}>
                  {type}
                  <select
                    className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                    value={midi?.slots[i]?.[type] ?? ""}
                    onChange={(e) => midi?.assign(i, type, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {(type === "input" ? midi?.inputs : midi?.outputs)?.map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.id.slice(-6)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
            </div>
          ))}
          <label className="flex items-center gap-2 text-[11px] text-app">
            <input
              type="checkbox"
              checked={orientation}
              onChange={(e) => setOrientation(e.target.checked)}
            />{" "}
            Corner test: red top-left · green top-right · blue bottom-left ·
            white bottom-right
          </label>
          <small className="text-nav mt-3 block text-[10px]">
            Choose each physical unit’s input and output. Orientation must be
            checked on hardware.
          </small>
        </section>
      )}
      <div className="compact:flex compact:flex-col grid grid-cols-workspace items-start gap-5 laptop:grid-cols-workspace-sm laptop:gap-4 tablet:grid-cols-workspace-tablet">
        <section className="border-line bg-panel compact:w-full overflow-hidden border">
          <div className="border-line-soft text-nav flex h-13 items-center justify-between border-b px-5 text-[10px] tracking-widest">
            <span className="flex items-center gap-2">
              <span className="bg-success size-1.5" />
              {engine.over
                ? mode === "lights"
                  ? "SOLVED · PRESS A PAD"
                  : mode === "mines"
                    ? `${engine.minesResult === "cleared" ? "CLEARED" : "BOOM"} · PRESS A PAD`
                    : twoPlayer
                      ? `${engine.winner === 3 ? "DRAW" : engine.winner === 1 ? "RED WINS" : "BLUE WINS"} · PRESS A PAD`
                      : engine.endingPhase === "flash"
                        ? "GAME OVER"
                        : engine.endingPhase === "score"
                          ? "YOUR FINAL SCORE"
                          : "PLAY AGAIN · PRESS A PAD"
                : engine.running
                  ? "LIVE PREVIEW"
                  : "READY TO PLAY"}
            </span>
            <span className="flex items-center gap-2">
              {engine.width} × {engine.height}
              <i className="bg-dim mx-1 size-1" /> {count}{" "}
              {count === 1 ? "PAD" : "PADS"}
            </span>
          </div>
          <div
            className={`stage-grid compact:min-h-87 compact:p-6 tablet:p-5 wide:min-h-120 flex min-h-101 items-center justify-center px-8 py-10 laptop:min-h-91 laptop:px-5 laptop:py-9 ${layout === "vertical" ? "vertical" : ""}`}
          >
            <div
              className="pads flex w-full max-w-[950px] items-center justify-center gap-3 compact:has-[>.pad-shell:nth-child(3)]:gap-1"
              style={{
                flexDirection: layout === "vertical" ? "column" : "row",
              }}
            >
              {Array.from({ length: count }, (_, p) => (
                <PadShell
                  power
                  key={p}
                  className="pad-shell compact:max-w-77 compact:has-[~.pad-shell]:px-2 compact:has-[~.pad-shell]:pt-4 compact:has-[~.pad-shell]:pb-2 laptop:px-4 laptop:pt-5 laptop:pb-3 wide:max-w-97 w-full max-w-86 min-w-0 px-6 pt-6 pb-3"
                >
                  <PadBed className="gap-2 p-2 compact:has-[.pixel]:gap-1 laptop:gap-1 laptop:p-2 wide:gap-2">
                    {Array.from({ length: 64 }, (_, i) => {
                      const localRow = Math.floor(i / 8),
                        localCol = i % 8,
                        row = localRow + (layout === "vertical" ? p * 8 : 0),
                        col = localCol + (layout === "horizontal" ? p * 8 : 0),
                        rgb = frame[row * engine.width + col] ?? [0, 0, 0],
                        lit = rgb.some(Boolean);
                      return (
                        <button
                          key={i}
                          className={`pixel aspect-square min-w-0 touch-none border border-white/5 p-0 transition hover:brightness-140 hover:outline hover:outline-white active:scale-90 ${lit ? "lit" : ""}`}
                          aria-label={`Pad ${p + 1}, row ${localRow + 1}, column ${localCol + 1}`}
                          style={
                            lit
                              ? {
                                  backgroundColor: `rgb(${rgb})`,
                                  boxShadow: `0 0 15px rgba(${rgb},.16)`,
                                }
                              : {}
                          }
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            onDevicePad(p, localRow, localCol, true, "pointer");
                          }}
                          onPointerUp={() =>
                            onDevicePad(p, localRow, localCol, false, "pointer")
                          }
                          onPointerCancel={() =>
                            onDevicePad(p, localRow, localCol, false, "pointer")
                          }
                          onLostPointerCapture={() =>
                            onDevicePad(p, localRow, localCol, false, "pointer")
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onDevicePad(
                                p,
                                localRow,
                                localCol,
                                true,
                                "button",
                              );
                            }
                          }}
                          onKeyUp={() =>
                            onDevicePad(p, localRow, localCol, false, "button")
                          }
                        />
                      );
                    })}
                  </PadBed>
                </PadShell>
              ))}
            </div>
          </div>
          <div className="text-dim mx-3 mt-1 mb-7 flex flex-wrap items-center justify-center gap-2 text-[10px]">
            Click the pads or use your keyboard{" "}
            <span className="bg-dim mx-1 size-1" />{" "}
            {midi?.status === "Connected"
              ? "SCREEN + HARDWARE IN SYNC"
              : "HARDWARE OPTIONAL"}
          </div>
          <div className="border-line flex items-center gap-2.5 border-t px-6 py-4">
            <button
              className="bg-app text-canvas hover:bg-app/85 px-5 py-3 text-xs font-bold whitespace-nowrap"
              onClick={toggle}
            >
              {engine.running
                ? "Pause"
                : engine.over
                  ? "Play again"
                  : "Start " +
                    (mode === "tetris" ||
                    mode === "snake" ||
                    mode === "mines" ||
                    twoPlayer
                      ? "game"
                      : "demo")}
            </button>
            <button
              className="border-line flex items-center gap-1.5 border px-3 py-2 text-[11px]"
              onClick={() => {
                engine.reset();
                force();
              }}
            >
              Reset
            </button>
            <span className="text-dim laptop:hidden ml-auto max-w-25 text-[10px] leading-4">
              {engine.over
                ? "Press a pad or Play again for another round."
                : ""}
            </span>
          </div>
        </section>
        <aside className="compact:grid compact:w-full compact:grid-cols-2 compact:gap-3 flex flex-col gap-4">
          <section className="border-line bg-card compact:p-4 wide:p-5 border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold">
                {mode === "tetris" || mode === "snake"
                  ? "The score"
                  : mode === "mines"
                    ? "The minefield"
                    : twoPlayer
                      ? "The match"
                      : "Make it yours"}
              </h2>
            </div>
            {mode === "tetris" || mode === "snake" ? (
              <>
                <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide">
                  {String(engine.score).padStart(4, "0")}
                  <span className="text-dim font-sans text-[10px] tracking-widest">
                    POINTS
                  </span>
                </div>
                <div className="mt-4 flex gap-9">
                  <div>
                    <span className="text-nav block text-[10px]">
                      {mode === "tetris" ? "Lines cleared" : "Length"}
                    </span>
                    <b className="font-display text-lg font-medium">
                      {String(
                        mode === "tetris" ? engine.lines : engine.snake.length,
                      ).padStart(2, "0")}
                    </b>
                  </div>
                  <div>
                    <span className="text-nav block text-[10px]">Level</span>
                    <b className="font-display text-lg font-medium">
                      {String(1 + Math.floor(engine.lines / 10)).padStart(
                        2,
                        "0",
                      )}
                    </b>
                  </div>
                </div>
                {mode === "snake" && (
                  <label className="border-line mt-5 flex items-center gap-2 border-t pt-4 text-[11px] text-app">
                    <input
                      type="checkbox"
                      checked={engine.snakeWrap}
                      onChange={(e) => {
                        engine.snakeWrap = e.target.checked;
                        force();
                      }}
                    />
                    Wrap around edges
                  </label>
                )}
                {mode === "tetris" && (
                  <div className="border-line mt-5 flex items-center gap-3 border-t pt-4 compact:gap-2">
                    <span className="text-[10px] text-nav">Up next</span>
                    <div className="flex flex-col gap-1">
                      {shapes[engine.next].map((row, y) => (
                        <div className="flex gap-1" key={y}>
                          {row.map((v, x) => (
                            <i
                              key={x}
                              style={{
                                background: v
                                  ? `rgb(${palette[engine.next % 6]})`
                                  : "transparent",
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    <small className="text-dim compact:hidden ml-auto text-[10px] tracking-widest">
                      KEEP STACKING
                    </small>
                  </div>
                )}
              </>
            ) : mode === "life" ? (
              <>
                <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide">
                  {engine.generation}
                  <span className="text-dim font-sans text-[10px] tracking-widest">
                    GENERATIONS
                  </span>
                </div>
                <p className="text-muted text-xs leading-5">
                  {engine.board.filter((c) => c.some(Boolean)).length} living
                  cells · Tap any pad to toggle a cell, even while running.
                </p>
                <div className="grid grid-cols-2 gap-2 [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[10px]">
                  <button
                    disabled={engine.running}
                    onClick={() => {
                      engine.stepLife();
                      force();
                    }}
                  >
                    Step once
                  </button>
                  <button
                    onClick={() => {
                      engine.seedLife("glider");
                      force();
                    }}
                  >
                    Glider
                  </button>
                  <button
                    onClick={() => {
                      engine.seedLife("random");
                      force();
                    }}
                  >
                    Random seed
                  </button>
                  <button
                    onClick={() => {
                      engine.seedLife("clear");
                      force();
                    }}
                  >
                    Clear grid
                  </button>
                  <button
                    onClick={() => {
                      engine.saveStartingBoard();
                      setNotice("Starting pattern saved.");
                    }}
                  >
                    Save start
                  </button>
                  <button
                    onClick={() => {
                      engine.restoreStartingBoard();
                      force();
                    }}
                  >
                    Restore start
                  </button>
                </div>
                <p className="text-muted text-xs leading-5">
                  A cell lives with 2 or 3 neighbors; an empty cell is born with
                  3. Edges do not wrap. Adjacent pads share neighbors.
                </p>
                {notice && <small role="status">{notice}</small>}
              </>
            ) : mode === "mines" ? (
              <>
                <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide tabular-nums">
                  {engine.mines.count - flagCount(engine.mines)}
                  <span className="text-dim font-sans text-[10px] tracking-widest">
                    MINES LEFT
                  </span>
                </div>
                <p className="text-muted mt-2 text-xs leading-5" role="status">
                  {engine.over
                    ? engine.minesResult === "cleared"
                      ? "Cleared! Every safe cell is open. Press a pad to play again."
                      : "Boom. That was a mine. Press a pad to play again."
                    : !engine.mines.placed
                      ? "Press any cell to start. The first one is always safe."
                      : `${engine.mines.revealed.filter(Boolean).length} of ${engine.mines.mines.length - engine.mines.count} safe cells open.`}
                </p>
                <label className="text-nav mt-4 block text-[10px]">
                  Difficulty
                  <select
                    className="border-line bg-surface text-app my-2 w-full border p-2.5 text-[11px]"
                    value={engine.difficulty}
                    onChange={(e) => {
                      engine.difficulty = e.target.value as Difficulty;
                      engine.reset();
                      force();
                    }}
                  >
                    {(["easy", "normal", "hard"] as const).map((d) => (
                      <option key={d} value={d}>
                        {d[0].toUpperCase() + d.slice(1)} ·{" "}
                        {mineCount(d, engine.width, engine.height)} mines
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="border-line hover:bg-surface border px-3 py-2 text-[11px]"
                  onClick={() => {
                    engine.reset();
                    force();
                  }}
                >
                  New game
                </button>
                <ul className="text-muted mt-4 space-y-1 text-xs leading-5">
                  <li>Press a cell to reveal it.</li>
                  <li>
                    Hold a cell for about 0.4 s to plant or remove a flag.
                  </li>
                  <li>
                    A revealed color tells how many of its 8 neighbors hide a
                    mine. Dark means none.
                  </li>
                </ul>
                <h3 className="text-nav mt-4 text-[10px] font-semibold tracking-[0.16em] uppercase">
                  Colors
                </h3>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {NUMBER_COLORS.slice(1).map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="border-dim size-3 shrink-0 border"
                        style={{ background: `rgb(${c})` }}
                      />
                      <span className="tabular-nums">
                        {i + 1} {i === 0 ? "mine" : "mines"}
                      </span>
                    </li>
                  ))}
                  <li className="col-span-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="border-dim size-3 shrink-0 border"
                      style={{ background: `rgb(${FLAG})` }}
                    />
                    Flag (blinks)
                  </li>
                  <li className="col-span-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="border-dim size-3 shrink-0 border"
                      style={{ background: `rgb(${HIDDEN})` }}
                    />
                    Not revealed yet
                  </li>
                </ul>
              </>
            ) : mode === "lights" ? (
              <>
                <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide">
                  {engine.moves}
                  <span>MOVES</span>
                </div>
                <p className="text-muted text-xs leading-5" role="status">
                  {engine.over
                    ? "Solved! Every light is out. Press a pad to play again."
                    : `${engine.board.filter((c) => c.some(Boolean)).length} lights left · Turn them all off.`}
                </p>
                <div className="grid grid-cols-2 gap-2 [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[10px]">
                  <button
                    onClick={() => {
                      engine.newLightsPuzzle();
                      force();
                    }}
                  >
                    New puzzle
                  </button>
                  <button
                    onClick={() => {
                      engine.restoreStartingBoard();
                      force();
                    }}
                  >
                    Retry puzzle
                  </button>
                </div>
                <p className="text-muted text-xs leading-5">
                  Press a cell to flip it and its up, down, left and right
                  neighbors. Every generated puzzle is solvable. Moves cross pad
                  boundaries.
                </p>
              </>
            ) : twoPlayerModes.includes(mode) ? (
              <>
                <div className="bg-canvas flex gap-1 p-1">
                  {(["ai", "human"] as const).map((kind) => (
                    <button
                      key={kind}
                      className={`flex-1 px-1 py-2 text-[10px] ${engine.opponent === kind ? "bg-app text-canvas" : "text-dim"}`}
                      onClick={() => {
                        engine.opponent = kind;
                        engine.reset();
                        force();
                      }}
                    >
                      {kind === "ai" ? "Play the AI" : "Two players"}
                    </button>
                  ))}
                </div>
                {engine.opponent === "ai" && (
                  <label className="block text-[10px] text-nav">
                    AI strength
                    <select
                      className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                      value={engine.difficulty}
                      onChange={(e) => {
                        engine.difficulty = e.target.value as Difficulty;
                        force();
                      }}
                    >
                      <option value="easy">Easy going</option>
                      <option value="normal">Fair fight</option>
                      <option value="hard">No mercy</option>
                    </select>
                  </label>
                )}
                <div className="mt-4 flex gap-9">
                  <div>
                    <span className="text-nav text-[10px]">
                      <span
                        aria-hidden="true"
                        className="border-dim mr-1.5 inline-block size-2 border align-middle"
                        style={{ background: `rgb(${teams[0]})` }}
                      />
                      Red {mode === "tug" ? "rounds" : scoreNoun}
                      {engine.opponent === "ai" ? " · you" : ""}
                    </span>
                    <b className="font-display block text-lg font-medium">
                      {teamScores[0]}
                    </b>
                  </div>
                  <div>
                    <span className="text-nav text-[10px]">
                      <span
                        aria-hidden="true"
                        className="border-dim mr-1.5 inline-block size-2 border align-middle"
                        style={{ background: `rgb(${teams[1]})` }}
                      />
                      Blue {mode === "tug" ? "rounds" : scoreNoun}
                      {engine.opponent === "ai" ? " · AI" : ""}
                    </span>
                    <b className="font-display block text-lg font-medium">
                      {teamScores[1]}
                    </b>
                  </div>
                </div>
                {duelModes.includes(mode) && (
                  <>
                    <label className="mb-2 flex justify-between text-[10px] text-nav [&_b]:bg-app [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[10px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-canvas">
                      Rope{" "}
                      <b>
                        {Math.round((engine.rope / engine.duelLength) * 100)}%
                        red
                      </b>
                    </label>
                    <div
                      className="mb-2 h-2.5 overflow-hidden"
                      style={{ backgroundColor: `rgb(${teams[1]})` }}
                    >
                      <span
                        className="block h-full"
                        style={{
                          backgroundColor: `rgb(${teams[0]})`,
                          width: `${(engine.rope / engine.duelLength) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                )}
                <p className="text-muted text-xs leading-5" role="status">
                  {matchStatus}
                </p>
                <div className="grid grid-cols-2 gap-2 [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[10px]">
                  <button
                    onClick={() => {
                      engine.reset();
                      force();
                    }}
                  >
                    New match
                  </button>
                  {engine.opponent === "ai" &&
                    (mode === "reversi" || mode === "connect") && (
                      <button
                        onClick={() => {
                          engine.aiSide = engine.aiSide === 1 ? 2 : 1;
                          engine.reset();
                          force();
                        }}
                      >
                        AI plays {engine.aiSide === 1 ? "blue" : "red"} instead
                      </button>
                    )}
                </div>
                <p className="text-muted text-xs leading-5">
                  {mode === "reversi"
                    ? "Red starts. Dim cells show your legal moves; the pulsing cell is the last disc played. Passing is automatic when you have no move."
                    : mode === "connect"
                      ? "Press any cell in a column to drop a disc there. Dim cells preview where it lands. Four in a row wins."
                      : mode === "tug"
                        ? "Wait for the white light in your colored territory, then hit it. Pressing early or hitting the wrong cell hands the round to your rival. Keyboard: A and L."
                        : "Mash any cell in your half. The rope drifts back to the middle, so keep going. Keyboard: A and L."}
                </p>
              </>
            ) : mode === "scroller" ? (
              <>
                <label className="block text-[10px] text-nav">
                  Your message
                  <input
                    className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                    value={text}
                    maxLength={160}
                    onChange={(e) => {
                      setText(e.target.value);
                      engine.text = e.target.value;
                      engine.time = 0;
                    }}
                  />
                </label>
                <label className="block text-[10px] text-nav">
                  Animation
                  <select
                    className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                    onChange={(e) => {
                      engine.effect = e.target.value;
                      force();
                    }}
                    value={engine.effect}
                  >
                    <option value="text">Scrolling text</option>
                    <option value="wave">Rainbow wave</option>
                    <option value="pulse">Color ripple</option>
                  </select>
                </label>
                <small className="text-nav text-[10px]">
                  A–Z, numbers and basic punctuation.
                </small>
              </>
            ) : mode === "paint" ? (
              <>
                <div className="mb-5 flex flex-wrap gap-2">
                  {[...palette, [0, 0, 0] as RGB].map((c, i) => (
                    <button
                      aria-label={i === 6 ? "Eraser" : `Color ${i + 1}`}
                      key={i}
                      className={`size-6 border border-dim ${color === i ? "outline-2 outline-offset-3 outline-app" : ""}`}
                      style={{ background: `rgb(${c})` }}
                      onClick={() => {
                        setColor(i);
                        engine.color = c;
                      }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[10px]">
                  <button
                    onClick={() => {
                      if (engine.frames.length >= 200) {
                        setNotice("Maximum 200 frames.");
                        return;
                      }
                      engine.frames.push(
                        engine.board.map((c) => [...c] as RGB),
                      );
                      force();
                    }}
                  >
                    ＋ Save frame ({engine.frames.length})
                  </button>
                  <button
                    disabled={!engine.frames.length}
                    onClick={() => {
                      engine.playback = !engine.playback;
                      engine.running = engine.playback;
                      force();
                    }}
                  >
                    {engine.playback ? "Edit pixels" : "Play frames"}
                  </button>
                  <button onClick={exportFrames}>↓ Export JSON</button>
                  <label className="border-line cursor-pointer border px-1 py-2 text-center text-[10px]">
                    ↑ Import JSON
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => void importFrames(e.target.files?.[0])}
                    />
                  </label>
                </div>
                {notice && <small role="status">{notice}</small>}
              </>
            ) : (
              <p className="text-muted text-xs leading-5">
                An endless rainbow, flowing across your entire canvas. Try
                adding more pads.
              </p>
            )}
          </section>
          <section className="border-line bg-card compact:p-4 wide:p-5 border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold">Speed and brightness</h2>
            </div>
            <label className="mb-2 flex justify-between text-[10px] text-nav [&_b]:bg-app [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[10px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-canvas">
              Speed <b>{speed.toFixed(1)}×</b>
            </label>
            <input
              className="my-3 block h-1 w-full cursor-pointer accent-app"
              aria-label="Speed"
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={speed}
              onChange={(e) => {
                setSpeed(+e.target.value);
                engine.speed = +e.target.value;
              }}
            />
            <div className="text-dim mt-2 mb-5 flex justify-between text-[10px] last:mb-0">
              <span>Easy does it</span>
              <span>Let’s go</span>
            </div>
            <label className="mb-2 flex justify-between text-[10px] text-nav [&_b]:bg-app [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[10px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-canvas">
              Brightness <b>{brightness}%</b>
            </label>
            <input
              className="my-3 block h-1 w-full cursor-pointer accent-app"
              aria-label="Brightness"
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(+e.target.value)}
            />
            <div className="text-dim mt-2 mb-5 flex justify-between text-[10px] last:mb-0">
              <span>☼</span>
              <span>☀</span>
            </div>
          </section>
          <section className="border-line bg-card compact:col-span-full compact:p-4 wide:p-5 border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold">Pads</h2>
            </div>
            <label className="block text-[10px] text-nav">
              Connected pads{" "}
              <select
                className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                aria-label="Pad count"
                value={count}
                onChange={(e) => configure(mode, +e.target.value)}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option value={n} key={n}>
                    {n} {n === 1 ? "pad · 8 × 8" : `pads · ${n * 64} pixels`}
                  </option>
                ))}
              </select>
            </label>
            <div className="bg-canvas flex gap-1 p-1">
              {["horizontal", "vertical"].map((l) => (
                <button
                  key={l}
                  className={`flex-1 px-1 py-2 text-[10px] ${layout === l ? "bg-app text-canvas" : "text-dim"}`}
                  onClick={() => configure(mode, count, l)}
                >
                  {l === "horizontal" ? "▤" : "▥"}{" "}
                  {l[0].toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-dim mt-3 text-[10px] leading-4">
              Layout changes start a fresh canvas.
            </p>
            <details className="text-nav mt-4 text-[10px]">
              <summary className="cursor-pointer">LED output settings</summary>
              <label>
                Output rate
                <select
                  className="border-line bg-surface my-2 w-full border p-2.5 text-[11px] text-app"
                  value={fps}
                  onChange={(e) => setFps(+e.target.value)}
                >
                  {[10, 20, 30, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} fps
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-app">
                <input
                  type="checkbox"
                  checked={saturation}
                  onChange={(e) => setSaturation(e.target.checked)}
                />{" "}
                Boost saturation
              </label>
              <small className="text-nav text-[10px]">
                Application rate; hardware throughput is unverified.
              </small>
            </details>
          </section>
        </aside>
      </div>
      <section className="border-line bg-sidebar compact:p-4 mt-5 flex flex-wrap items-center justify-between gap-4 border px-6 py-5 text-nav text-[11px]">
        <div>
          <div>
            <h3 className="mb-1 text-xs font-medium">
              {mode === "paint" ? "Controls" : "Controls"}
            </h3>
            <p className="text-dim text-[10px]">
              {mode === "paint"
                ? "Pick a color, click a pixel, save a frame. Repeat."
                : mode === "life"
                  ? "Toggle cells, save your start, then press Start demo. Pause to step one generation at a time."
                  : mode === "lights"
                    ? "Tap a light to flip its cross. Use Tab and Enter to play with a keyboard."
                    : mode === "mines"
                      ? "Press to reveal, hold to flag. With a keyboard, Tab to a cell, then press or hold Enter."
                      : twoPlayer
                        ? "Pick the AI or a friend, then play on screen or on the pads together."
                        : "Same controls on your screen and on your pad."}
            </p>
          </div>
        </div>
        {duel && (
          <div className="flex flex-wrap items-center gap-4 laptop:gap-2">
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                A
              </kbd>{" "}
              Red press
            </span>
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                L
              </kbd>{" "}
              Blue press
            </span>
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                P
              </kbd>{" "}
              Pause
            </span>
          </div>
        )}
        {(mode === "tetris" || mode === "snake") && (
          <div className="flex flex-wrap items-center gap-4 laptop:gap-2">
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                ←
              </kbd>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                →
              </kbd>{" "}
              Move
            </span>
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                ↑
              </kbd>{" "}
              {mode === "snake" ? "Up" : "Rotate"}
            </span>
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                ↓
              </kbd>{" "}
              {mode === "snake" ? "Down" : "Soft drop"}
            </span>
            {mode === "tetris" && (
              <span>
                <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                  space
                </kbd>{" "}
                Drop
              </span>
            )}
            <span>
              <kbd className="border-line bg-surface min-w-6 border border-b-2 px-1.5 py-1 text-center text-[10px] text-app">
                P
              </kbd>{" "}
              Pause
            </span>
          </div>
        )}
        {(mode === "tetris" || mode === "snake") && (
          <p className="text-dim w-full text-[11px] leading-5">
            On the grid: top third = {mode === "snake" ? "up" : "rotate"},
            middle left / right = move, bottom third = down.
          </p>
        )}
      </section>
    </div>
  );
}
