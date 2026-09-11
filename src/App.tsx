/* The engine and MIDI adapter are mutable external services. The single scheduler publishes frames to React. */
/* oxlint-disable react/immutability */
import { useEffect, useState } from "react";
import { Engine, palette, shapes } from "./lib/engine";
import type { Mode, RGB } from "./lib/engine";
import { MidiAdapter } from "./lib/midi";
const modes: {
  id: Mode;
  name: string;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "tetris",
    name: "Tetris",
    label: "STACK & CLEAR",
    icon: "▟",
    desc: "A little grid. Endless possibilities. Stack, rotate, and make room for one more.",
  },
  {
    id: "scroller",
    name: "Marquee",
    label: "SAY IT IN PIXELS",
    icon: "≋",
    desc: "Your message, in lights. Let your words travel across every connected pad.",
  },
  {
    id: "snake",
    name: "Snake",
    label: "ONE MORE BITE",
    icon: "⌁",
    desc: "Follow your appetite. Collect the pink pixels and stay out of your own way.",
  },
  {
    id: "life",
    name: "Game of Life",
    label: "LET IT GROW",
    icon: "✣",
    desc: "Plant a few pixels. Watch a world emerge. Build your own starting pattern and let it evolve.",
  },
  {
    id: "lights",
    name: "Lights Out",
    label: "FIND THE SWITCH",
    icon: "☷",
    desc: "One press changes five lights. Turn them all off to solve the puzzle.",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    label: "JUST GOOD WAVES",
    icon: "◉",
    desc: "A flowing spectrum of color. Sit back and let your pixels do their thing.",
  },
  {
    id: "paint",
    name: "Pixel studio",
    label: "MAKE YOUR MARK",
    icon: "✳",
    desc: "Every pixel is a possibility. Paint a frame, then bring it to life.",
  },
];
export function App() {
  const [engine] = useState(() => new Engine());
  const [mode, setMode] = useState<Mode>("tetris"),
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
          engine.onPad(
            r + (settings.layout === "vertical" ? slot * 8 : 0),
            c + (settings.layout === "horizontal" ? slot * 8 : 0),
            p,
            "hardware",
          );
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
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="./">
          <span className="brandmark">▦</span>
          <span>
            bloop<span className="brandlight">pad</span>
            <small>MAXX PLAYGROUND</small>
          </span>
        </a>
        <div className="navlabel">YOUR PIXEL PLAYGROUND</div>
        <nav>
          {modes.map((m) => (
            <button
              key={m.id}
              className={"navitem " + (mode === m.id ? "selected" : "")}
              onClick={() => configure(m.id)}
            >
              <span className="navicon">{m.icon}</span>
              {m.name}
              {mode === m.id && <span className="navdot" />}
              {m.id === "paint" && <small>CREATE</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-grid">▦</span>
          <strong>Small grid. Big ideas.</strong>
          <p>Play on screen or plug in your BLOOPPAD-MAXX.</p>
          <span className="note-badge">HARDWARE OPTIONAL ↗</span>
        </div>
        <div className="sidebar-bottom">
          <span className="green-dot" />
          Made for curious fingers<span>v1.0</span>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Playground <span>/</span> <b>{current.name}</b>
          </div>
          <button
            className="connect"
            onClick={() => {
              setDevices(!devices);
              if (!midi?.access) void midi?.connect();
            }}
          >
            <span>♧</span>{" "}
            {midi?.status === "Connected"
              ? "Manage devices"
              : "Connect BLOOPPAD"}{" "}
            <span>↗</span>
          </button>
        </header>
        <section className="heading">
          <div>
            <div className="eyebrow">
              <span />
              LET’S PLAY WITH PIXELS
            </div>
            <h1>
              {current.name}
              <span className="heading-dot">.</span>
            </h1>
            <p>{current.desc}</p>
          </div>
          <span className="sim-badge">
            <span className="green-dot" />
            {midi?.status === "Connected"
              ? "HARDWARE CONNECTED"
              : "SIMULATOR MODE"}
          </span>
        </section>
        {!devices && midi.error && (
          <div className="device-panel" role="alert">
            {midi.error}{" "}
            <button onClick={() => setDevices(true)}>
              Open device connections ↗
            </button>
          </div>
        )}
        {devices && (
          <section className="device-panel">
            <div className="panel-title">
              Device connections{" "}
              <button onClick={() => void midi?.connect()}>
                Retry connection
              </button>
            </div>
            <p role="status">
              {midi?.status} · {midi?.inputs.length ?? 0} inputs /{" "}
              {midi?.outputs.length ?? 0} outputs discovered
            </p>
            {midi?.error && <p role="alert">{midi.error}</p>}
            {Array.from({ length: count }, (_, i) => (
              <div className="device-row" key={i}>
                <b>Pad {i + 1}</b>
                {(["input", "output"] as const).map((type) => (
                  <label key={type}>
                    {type}
                    <select
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
            <label className="check">
              <input
                type="checkbox"
                checked={orientation}
                onChange={(e) => setOrientation(e.target.checked)}
              />{" "}
              Corner test: red ↖ · green ↗ · blue ↙ · white ↘
            </label>
            <small>
              Choose each physical unit’s input and output. Orientation must be
              checked on hardware.
            </small>
          </section>
        )}
        <div className="workspace">
          <section className="play-panel">
            <div className="play-top">
              <span>
                <span className="green-dot" />
                {engine.over
                  ? mode === "lights"
                    ? "SOLVED · PRESS A PAD"
                    : engine.endingPhase === "flash"
                      ? "GAME OVER"
                      : engine.endingPhase === "score"
                        ? "YOUR FINAL SCORE"
                        : "PLAY AGAIN · PRESS A PAD"
                  : engine.running
                    ? "LIVE PREVIEW"
                    : "READY TO PLAY"}
              </span>
              <span>
                {engine.width} × {engine.height}
                <i /> {count} {count === 1 ? "PAD" : "PADS"}
              </span>
            </div>
            <div
              className={"stage " + (layout === "vertical" ? "vertical" : "")}
            >
              <div
                className="pads"
                style={{
                  flexDirection: layout === "vertical" ? "column" : "row",
                }}
              >
                {Array.from({ length: count }, (_, p) => (
                  <div className="pad-shell" key={p}>
                    <div className="screw tl" />
                    <div className="screw tr" />
                    <div className="grid">
                      {Array.from({ length: 64 }, (_, i) => {
                        const row =
                            Math.floor(i / 8) +
                            (layout === "vertical" ? p * 8 : 0),
                          col = (i % 8) + (layout === "horizontal" ? p * 8 : 0),
                          rgb = frame[row * engine.width + col] ?? [0, 0, 0],
                          lit = rgb.some(Boolean);
                        return (
                          <button
                            key={i}
                            className={"pixel " + (lit ? "lit" : "")}
                            aria-label={`Pad ${p + 1}, row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}`}
                            style={
                              lit
                                ? {
                                    backgroundColor: `rgb(${rgb})`,
                                    boxShadow: `0 0 15px rgba(${rgb},.16), inset 0 1px 1px #ffffff35`,
                                  }
                                : {}
                            }
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.currentTarget.setPointerCapture(e.pointerId);
                              engine.onPad(row, col, true, "pointer");
                            }}
                            onPointerUp={() =>
                              engine.onPad(row, col, false, "pointer")
                            }
                            onPointerCancel={() =>
                              engine.onPad(row, col, false, "pointer")
                            }
                            onLostPointerCapture={() =>
                              engine.onPad(row, col, false, "pointer")
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                engine.onPad(row, col, true, "button");
                              }
                            }}
                            onKeyUp={() =>
                              engine.onPad(row, col, false, "button")
                            }
                          />
                        );
                      })}
                    </div>
                    <div className="pad-brand">
                      BLOOPPAD <b>MAXX</b>
                      <span>●</span>
                    </div>
                    <div className="screw bl" />
                    <div className="screw br" />
                  </div>
                ))}
              </div>
            </div>
            <div className="stage-caption">
              <span>↖</span> Click the pads or use your keyboard{" "}
              <span className="live-dot" />{" "}
              {midi?.status === "Connected"
                ? "SCREEN + HARDWARE IN SYNC"
                : "HARDWARE OPTIONAL"}
            </div>
            <div className="transport">
              <button className="primary" onClick={toggle}>
                {engine.running
                  ? "Ⅱ Pause"
                  : engine.over
                    ? "↻ Play again"
                    : "▶ Start " +
                      (mode === "tetris" || mode === "snake" ? "game" : "demo")}
              </button>
              <button
                className="reset"
                onClick={() => {
                  engine.reset();
                  force();
                }}
              >
                ↻ <span>Reset</span>
              </button>
              <span className="transport-hint">
                {engine.over
                  ? "Press a pad or Play again for another round."
                  : engine.running
                    ? "Make every pixel count."
                    : "Your next little obsession awaits."}
              </span>
            </div>
          </section>
          <aside className="controls">
            <section className="control-card">
              <div className="card-heading">
                <h2>
                  {mode === "tetris" || mode === "snake"
                    ? "The score"
                    : "Make it yours"}
                </h2>
                <span>↗</span>
              </div>
              {mode === "tetris" || mode === "snake" ? (
                <>
                  <div className="score">
                    {String(engine.score).padStart(4, "0")}
                    <span>POINTS</span>
                  </div>
                  <div className="stats">
                    <div>
                      <span>
                        {mode === "tetris" ? "Lines cleared" : "Length"}
                      </span>
                      <b>
                        {String(
                          mode === "tetris"
                            ? engine.lines
                            : engine.snake.length,
                        ).padStart(2, "0")}
                      </b>
                    </div>
                    <div>
                      <span>Level</span>
                      <b>
                        {String(1 + Math.floor(engine.lines / 10)).padStart(
                          2,
                          "0",
                        )}
                      </b>
                    </div>
                  </div>
                  {mode === "tetris" && (
                    <div className="next-piece">
                      <span>Up next</span>
                      <div>
                        {shapes[engine.next].map((row, y) => (
                          <div className="next-row" key={y}>
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
                      <small>KEEP STACKING</small>
                    </div>
                  )}
                </>
              ) : mode === "life" ? (
                <>
                  <div className="score">
                    {engine.generation}
                    <span>GENERATIONS</span>
                  </div>
                  <p className="muted">
                    {engine.board.filter((c) => c.some(Boolean)).length} living
                    cells · Tap any pad to toggle a cell, even while running.
                  </p>
                  <div className="paint-actions">
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
                  <p className="muted">
                    A cell lives with 2 or 3 neighbors; an empty cell is born
                    with 3. Edges do not wrap. Adjacent pads share neighbors.
                  </p>
                  {notice && <small role="status">{notice}</small>}
                </>
              ) : mode === "lights" ? (
                <>
                  <div className="score">
                    {engine.moves}
                    <span>MOVES</span>
                  </div>
                  <p className="muted" role="status">
                    {engine.over
                      ? "Solved! Every light is out. Press a pad to play again."
                      : `${engine.board.filter((c) => c.some(Boolean)).length} lights left · Turn them all off.`}
                  </p>
                  <div className="paint-actions">
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
                  <p className="muted">
                    Press a cell to flip it and its up, down, left and right
                    neighbors. Every generated puzzle is solvable. Moves cross
                    pad boundaries.
                  </p>
                </>
              ) : mode === "scroller" ? (
                <>
                  <label>
                    Your message
                    <input
                      className="text-input"
                      value={text}
                      maxLength={160}
                      onChange={(e) => {
                        setText(e.target.value);
                        engine.text = e.target.value;
                        engine.time = 0;
                      }}
                    />
                  </label>
                  <label>
                    Animation
                    <select
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
                  <small>A–Z, numbers and basic punctuation.</small>
                </>
              ) : mode === "paint" ? (
                <>
                  <div className="swatches">
                    {[...palette, [0, 0, 0] as RGB].map((c, i) => (
                      <button
                        aria-label={i === 6 ? "Eraser" : `Color ${i + 1}`}
                        key={i}
                        className={color === i ? "active" : ""}
                        style={{ background: `rgb(${c})` }}
                        onClick={() => {
                          setColor(i);
                          engine.color = c;
                        }}
                      />
                    ))}
                  </div>
                  <div className="paint-actions">
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
                      {engine.playback ? "Edit pixels" : "▶ Play frames"}
                    </button>
                    <button onClick={exportFrames}>↓ Export JSON</button>
                    <label className="file-button">
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
                <p className="muted">
                  An endless rainbow, flowing across your entire canvas. Try
                  adding more pads.
                </p>
              )}
            </section>
            <section className="control-card">
              <div className="card-heading">
                <h2>Set the mood</h2>
                <span>☷</span>
              </div>
              <label className="range-label">
                Speed <b>{speed.toFixed(1)}×</b>
              </label>
              <input
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
              <div className="range-ends">
                <span>Easy does it</span>
                <span>Let’s go</span>
              </div>
              <label className="range-label">
                Brightness <b>{brightness}%</b>
              </label>
              <input
                aria-label="Brightness"
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(+e.target.value)}
              />
              <div className="range-ends">
                <span>☼</span>
                <span>☀</span>
              </div>
            </section>
            <section className="control-card layout-card">
              <div className="card-heading">
                <h2>Your canvas</h2>
                <span>▦</span>
              </div>
              <label>
                Connected pads{" "}
                <select
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
              <div className="segmented">
                {["horizontal", "vertical"].map((l) => (
                  <button
                    key={l}
                    className={layout === l ? "active" : ""}
                    onClick={() => configure(mode, count, l)}
                  >
                    {l === "horizontal" ? "▤" : "▥"}{" "}
                    {l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <p>
                More pads. More room to play.
                <br />
                Layout changes start a fresh canvas.
              </p>
              <details>
                <summary>LED output settings</summary>
                <label>
                  Output rate
                  <select value={fps} onChange={(e) => setFps(+e.target.value)}>
                    {[10, 20, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} fps
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={saturation}
                    onChange={(e) => setSaturation(e.target.checked)}
                  />{" "}
                  Boost saturation
                </label>
                <small>
                  Application rate; hardware throughput is unverified.
                </small>
              </details>
            </section>
          </aside>
        </div>
        <section className="howto">
          <div>
            <span className="how-icon">⌘</span>
            <div>
              <h3>
                {mode === "paint"
                  ? "A tiny canvas for big ideas"
                  : "Get into the flow"}
              </h3>
              <p>
                {mode === "paint"
                  ? "Pick a color, click a pixel, save a frame. Repeat."
                  : mode === "life"
                    ? "Toggle cells, save your start, then press Start demo. Pause to step one generation at a time."
                    : mode === "lights"
                      ? "Tap a light to flip its cross. Use Tab and Enter to play with a keyboard."
                      : "Same controls on your screen and on your pad."}
              </p>
            </div>
          </div>
          {(mode === "tetris" || mode === "snake") && (
            <div className="key-guide">
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> Move
              </span>
              <span>
                <kbd>↑</kbd> {mode === "snake" ? "Up" : "Rotate"}
              </span>
              <span>
                <kbd>↓</kbd> {mode === "snake" ? "Down" : "Soft drop"}
              </span>
              {mode === "tetris" && (
                <span>
                  <kbd>space</kbd> Drop
                </span>
              )}
              <span>
                <kbd>P</kbd> Pause
              </span>
            </div>
          )}
          {(mode === "tetris" || mode === "snake") && (
            <p className="pad-help">
              On the grid: top third = {mode === "snake" ? "up" : "rotate"},
              middle left / right = move, bottom third = down.
            </p>
          )}
        </section>
        <footer>
          <span>
            <span className="green-dot" /> No hardware? No problem. The
            simulator is always ready.
          </span>
          <span>
            BUILT FOR THE BLOOPPAD-MAXX <span className="footer-star">✳</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
