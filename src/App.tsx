/* The engine and MIDI adapter are mutable external services. The single scheduler publishes frames to React. */
/* oxlint-disable react/immutability */
import { useEffect, useRef, useState } from "react";
import {
  Engine,
  duelModes,
  palette,
  shapes,
  teams,
  twoPlayerModes,
} from "./lib/engine";
import type { Mode, RGB } from "./lib/engine";
import type { Difficulty } from "./lib/games.ts";
import { MidiAdapter } from "./lib/midi";
import { FirmwareFlasher } from "./components/FirmwareFlasher";
import { menuModeAt, renderDeviceMenu } from "./lib/deviceMenu";
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
    id: "reversi",
    name: "Reversi",
    label: "FLIP THE BOARD",
    icon: "◐",
    desc: "Trap a line of pixels between two of yours and flip them. Most discs at the end wins.",
  },
  {
    id: "connect",
    name: "Connect four",
    label: "LINE THEM UP",
    icon: "◍",
    desc: "Drop a pixel in any column. Four in a row — across, down or diagonally — takes it.",
  },
  {
    id: "tug",
    name: "Tug of war",
    label: "FASTEST FINGER",
    icon: "⇄",
    desc: "A light appears on each side. Hit yours first and pull the rope. Jump early and you lose ground.",
  },
  {
    id: "masher",
    name: "Button masher",
    label: "MASH TO WIN",
    icon: "⚡",
    desc: "Two halves, one rope. Mash your side faster than your rival before it drifts back to the middle.",
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
    [flasher, setFlasher] = useState(false),
    [notice, setNotice] = useState(""),
    [text, setText] = useState("HELLO BLOOP!"),
    [color, setColor] = useState(0),
    [orientation, setOrientation] = useState(false),
    [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(false);
  const menuShownOnConnect = useRef(false);
  const menuCorners = useRef(new Set<string>());
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
        () => {
          if (midi.status === "Connected" && !menuShownOnConnect.current) {
            menuShownOnConnect.current = true;
            openMenu();
          }
          refresh((n) => n + 1);
        },
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
        let raw = menuOpenRef.current
          ? renderDeviceMenu(engine.width, engine.height)
          : engine.render();
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
      if (menuOpenRef.current) {
        if (e.key === "Escape") closeMenu();
        return;
      }
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
    menuOpenRef.current = false;
    setMenuOpen(false);
    menuCorners.current.clear();
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
  function openMenu() {
    engine.running = false;
    engine.held.clear();
    menuCorners.current.clear();
    menuOpenRef.current = true;
    setMenuOpen(true);
    setOrientation(false);
    force();
  }
  function closeMenu() {
    menuOpenRef.current = false;
    setMenuOpen(false);
    force();
  }
  function onDevicePad(
    slot: number,
    row: number,
    col: number,
    pressed: boolean,
    source: string,
  ) {
    const corner = `${source}:${slot}:${col}`;
    if (row === 0 && (col === 0 || col === 7)) {
      if (pressed) menuCorners.current.add(corner);
      else menuCorners.current.delete(corner);
    }
    if (menuOpenRef.current) {
      if (pressed) {
        const selected = menuModeAt(row);
        if (selected) {
          engine.opponent = "human";
          configure(selected, settings.count, settings.layout);
          engine.running = true;
          force();
        }
      }
      return;
    }
    if (
      pressed &&
      row === 0 &&
      (col === 0 || col === 7) &&
      menuCorners.current.has(`${source}:${slot}:0`) &&
      menuCorners.current.has(`${source}:${slot}:7`)
    ) {
      openMenu();
      return;
    }
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
    <div className="min-h-screen bg-canvas text-app md:flex">
      <aside className="border-line-soft bg-sidebar compact:static compact:w-full compact:border-r-0 compact:border-b compact:px-4 compact:py-4 tablet:w-19 tablet:px-2.5 tablet:py-7 fixed inset-y-0 left-0 z-10 flex w-sidebar shrink-0 flex-col border-r px-5 pt-9 pb-5 laptop:w-sidebar-sm laptop:px-3">
        <a
          className="font-display compact:mb-4 compact:text-[22px] tablet:mx-2 tablet:mb-11 mx-2.5 mb-14 flex items-center gap-3 text-2xl leading-none font-bold tracking-tight"
          href="./"
        >
          <span className="bg-brandmark text-lavender-text compact:size-9 compact:text-[28px] tablet:min-w-9 flex size-10 items-center justify-center rounded-xl text-[34px]">
            ▦
          </span>
          <span>
            bloop<span className="font-normal">pad</span>
            <small className="text-dim mt-2 block font-sans text-[8px] tracking-[0.275em] compact:text-[7px]">
              MAXX PLAYGROUND
            </small>
          </span>
        </a>
        <div className="text-dim tablet:hidden mb-4 pl-4 text-[9px] font-semibold tracking-[0.18em]">
          YOUR PIXEL PLAYGROUND
        </div>
        <nav className="compact:flex compact:gap-1 compact:overflow-x-auto compact:pb-1">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`compact:mb-0 compact:flex-none compact:basis-17 compact:flex-col compact:gap-1 compact:px-1 compact:py-2 tablet:gap-0 tablet:px-3.5 tablet:text-[0px] mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[13px] font-medium transition-colors hover:bg-surface ${mode === m.id ? "bg-selected text-lavender-text" : "text-nav"}`}
              onClick={() => configure(m.id)}
            >
              <span className="compact:text-xl tablet:text-[23px] w-6 text-[22px] leading-none">
                {m.icon}
              </span>
              {m.name}
              {mode === m.id && (
                <span className="bg-lavender ml-auto size-1.5 rounded-full tablet:hidden" />
              )}
              {m.id === "paint" && (
                <small className="border-line ml-auto rounded border px-1 py-0.5 text-[7px] tracking-widest tablet:hidden">
                  CREATE
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="border-line mt-auto mb-7 rounded-xl border bg-linear-to-br from-[#24202e] to-[#1a1b20] px-4 py-5 tablet:hidden">
          <span className="text-lavender-text mb-4 block text-3xl">▦</span>
          <strong className="text-xs font-medium">
            Small grid. Big ideas.
          </strong>
          <p className="text-nav my-3 text-[11px] leading-5">
            Play on screen or plug in your BLOOPPAD-MAXX.
          </p>
          <span className="text-lavender-text text-[7px] tracking-widest">
            HARDWARE OPTIONAL ↗
          </span>
        </div>
        <div className="text-dim flex items-center gap-2 text-[9px] whitespace-nowrap tablet:hidden">
          <span className="bg-success inline-block size-1.5 shrink-0 rounded-full" />
          Made for curious fingers
          <span className="ml-auto text-[8px]">v1.0</span>
        </div>
      </aside>
      <main className="compact:ml-0 compact:w-full compact:px-4 tablet:ml-19 tablet:w-main-tablet tablet:px-5 wide:px-15 ml-sidebar w-main max-w-[1700px] px-10 laptop:ml-sidebar-sm laptop:w-main-laptop laptop:px-6">
        <header className="border-line-soft compact:h-18 flex h-24 items-center justify-between border-b">
          <div className="text-dim compact:text-[10px] text-xs">
            Playground{" "}
            <span className="compact:mx-2 mx-4 text-zinc-600">/</span>{" "}
            <b className="font-medium text-zinc-300">{current.name}</b>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="border-line bg-surface compact:px-2 compact:py-2 rounded-lg border px-4 py-2.5 text-[11px] compact:text-[10px]"
              onClick={() => setFlasher(!flasher)}
              aria-expanded={flasher}
            >Flash firmware</button>
            <button
              className="border-line bg-surface compact:px-2 compact:py-2 flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-[11px] compact:text-[10px]"
              onClick={() => {
                setDevices(!devices);
                if (!midi?.access) void midi?.connect();
              }}
            >
              <span>♧</span>{" "}
              {midi?.status === "Connected" ? "Manage devices" : "Connect BLOOPPAD"}{" "}
              <span>↗</span>
            </button>
          </div>
        </header>
        <section className="compact:py-7 wide:py-10 flex items-center justify-between py-8">
          <div>
            <div className="text-lavender-text flex items-center gap-2 text-[9px] tracking-[0.21em]">
              <span className="bg-lavender size-1.5 rounded-sm" />
              LET’S PLAY WITH PIXELS
            </div>
            <h1 className="font-display compact:text-4xl tablet:text-[40px] my-2 text-5xl leading-tight font-semibold tracking-tight">
              {menuOpen ? "Game menu" : current.name}
              <span className="text-lavender">.</span>
            </h1>
            <p className="text-muted compact:text-[11px] max-w-lg text-xs leading-5 laptop:max-w-md">
              {menuOpen
                ? "Tap the red, blue or amber band on any pad to start a game. Press both top corners together to reopen this menu."
                : current.desc}
            </p>
          </div>
          <span className="border-line laptop:hidden flex items-center gap-2 whitespace-nowrap rounded-md border px-2.5 py-2 text-[8px] tracking-widest">
            <span className="bg-success inline-block size-1.5 shrink-0 rounded-full" />
            {midi?.status === "Connected"
              ? "HARDWARE CONNECTED"
              : "SIMULATOR MODE"}
          </span>
        </section>
        {flasher && <FirmwareFlasher onClose={() => setFlasher(false)} />}
        {!devices && midi.error && (
          <div
            className="border-device bg-device-bg mb-5 rounded-xl border p-5 text-xs"
            role="alert"
          >
            {midi.error}{" "}
            <button onClick={() => setDevices(true)}>
              Open device connections ↗
            </button>
          </div>
        )}
        {devices && (
          <section className="border-device bg-device-bg mb-5 rounded-xl border p-5 text-xs">
            <div className="flex justify-between">
              Device connections{" "}
              <button
                className="border-device rounded-md border px-2 py-1.5"
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
                      className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
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
            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                checked={orientation}
                onChange={(e) => setOrientation(e.target.checked)}
              />{" "}
              Corner test: red ↖ · green ↗ · blue ↙ · white ↘
            </label>
            <small className="text-nav mt-3 block text-[9px]">
              Choose each physical unit’s input and output. Orientation must be
              checked on hardware.
            </small>
          </section>
        )}
        <div className="compact:flex compact:flex-col grid grid-cols-workspace items-start gap-5 laptop:grid-cols-workspace-sm laptop:gap-4 tablet:grid-cols-workspace-tablet">
          <section className="border-line bg-panel compact:w-full overflow-hidden rounded-xl border">
            <div className="border-line-soft text-nav flex h-13 items-center justify-between border-b px-5 text-[8px] tracking-widest">
              <span className="flex items-center gap-2">
                <span className="bg-success size-1.5 rounded-full" />
                {menuOpen
                  ? "GAME MENU · TAP A GAME"
                  : engine.over
                  ? mode === "lights"
                    ? "SOLVED · PRESS A PAD"
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
                <i className="bg-dim mx-1 size-1 rounded-full" /> {count}{" "}
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
                  <div
                    className="pad-shell border-pad bg-pad-shell shadow-pad compact:max-w-77 compact:has-[~.pad-shell]:px-2 compact:has-[~.pad-shell]:pt-4 compact:has-[~.pad-shell]:pb-2 laptop:px-4 laptop:pt-5 laptop:pb-3 wide:max-w-97 relative w-full max-w-86 min-w-0 rounded-2xl border px-6 pt-6 pb-3"
                    key={p}
                  >
                    <div className="bg-canvas border-pad absolute top-2.5 left-2.5 size-1 rounded-full border" />
                    <div className="bg-canvas border-pad absolute top-2.5 right-2.5 size-1 rounded-full border" />
                    <div className="bg-canvas border-black grid grid-cols-8 gap-2 rounded-lg border p-2 shadow-inner compact:has-[.pixel]:gap-1 laptop:gap-1 laptop:p-2 wide:gap-2">
                      {Array.from({ length: 64 }, (_, i) => {
                        const localRow = Math.floor(i / 8),
                          localCol = i % 8,
                          row =
                            localRow +
                            (layout === "vertical" ? p * 8 : 0),
                          col = localCol + (layout === "horizontal" ? p * 8 : 0),
                          rgb = frame[row * engine.width + col] ?? [0, 0, 0],
                          lit = rgb.some(Boolean),
                          menuChoice = menuOpen ? menuModeAt(localRow) : null;
                        return (
                          <button
                            key={i}
                            className={`pixel aspect-square min-w-0 touch-none rounded-sm border border-white/5 p-0 transition hover:brightness-140 hover:outline hover:outline-lavender active:scale-90 ${lit ? "lit" : ""}`}
                            aria-label={
                              menuChoice
                                ? `Select ${modes.find((m) => m.id === menuChoice)?.name} on pad ${p + 1}`
                                : `Pad ${p + 1}, row ${localRow + 1}, column ${localCol + 1}`
                            }
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
                                onDevicePad(p, localRow, localCol, true, "button");
                              }
                            }}
                            onKeyUp={() =>
                              onDevicePad(p, localRow, localCol, false, "button")
                            }
                          />
                        );
                      })}
                    </div>
                    <div className="font-display text-dim compact:has-[~.pad-shell]:text-[4px] mt-3 text-center text-[7px] tracking-[0.28em]">
                      BLOOPPAD{" "}
                      <b className="ml-1 text-[6px] tracking-wide text-zinc-400">
                        MAXX
                      </b>
                      <span className="text-success absolute right-6 text-[6px]">
                        ●
                      </span>
                    </div>
                    <div className="bg-canvas border-pad absolute bottom-2.5 left-2.5 size-1 rounded-full border" />
                    <div className="bg-canvas border-pad absolute right-2.5 bottom-2.5 size-1 rounded-full border" />
                  </div>
                ))}
              </div>
            </div>
            {menuOpen ? (
              <div className="text-nav mx-3 mt-2 mb-7 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
                <span style={{ color: `rgb(${teams[0]})` }}>Top: Tug of war · 2 players</span>
                <span className="text-[#6799ff]">Middle: Connect four · 2 players</span>
                <span className="text-[#ffb74d]">Bottom: Tetris</span>
              </div>
            ) : (
              <div className="text-dim compact:text-[7px] laptop:text-[7px] mx-3 mt-1 mb-7 flex flex-wrap items-center justify-center gap-2 text-[9px]">
                <span className="text-sm text-zinc-400">↖</span> Click the pads or
                use your keyboard{" "}
                <span className="bg-dim mx-1 size-1 rounded-full" />{" "}
                {midi?.status === "Connected"
                  ? "SCREEN + HARDWARE IN SYNC"
                  : "HARDWARE OPTIONAL"}
              </div>
            )}
            <div className="border-line flex items-center gap-2.5 border-t px-6 py-4">
              <button
                className="bg-lavender text-selected hover:bg-lavender-hover rounded-md px-5 py-3 text-xs font-bold whitespace-nowrap"
                onClick={toggle}
                disabled={menuOpen}
              >
                {engine.running
                  ? "Ⅱ Pause"
                  : engine.over
                    ? "↻ Play again"
                    : "▶ Start " +
                      (mode === "tetris" || mode === "snake" || twoPlayer
                        ? "game"
                        : "demo")}
              </button>
              <button
                className="border-line flex items-center gap-2 rounded-md border px-3 py-2 text-lg"
                disabled={menuOpen}
                onClick={() => {
                  engine.reset();
                  force();
                }}
              >
                ↻ <span className="text-[11px]">Reset</span>
              </button>
              <button
                className="border-line rounded-md border px-3 py-2 text-[11px]"
                onClick={() => {
                  if (menuOpen) closeMenu();
                  else openMenu();
                }}
              >
                {menuOpen ? "Close menu" : "Game menu"}
              </button>
              <span className="text-dim laptop:hidden ml-auto max-w-25 text-[9px] leading-4">
                {menuOpen
                  ? "Tap a colored row to choose."
                  : engine.over
                  ? "Press a pad or Play again for another round."
                  : engine.running
                    ? "Make every pixel count."
                    : "Your next little obsession awaits."}
              </span>
            </div>
          </section>
          <aside className="compact:grid compact:w-full compact:grid-cols-2 compact:gap-3 flex flex-col gap-4">
            <section className="border-line bg-card compact:p-4 wide:p-5 rounded-xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold">
                  {menuOpen
                    ? "Choose a game"
                    : mode === "tetris" || mode === "snake"
                    ? "The score"
                    : twoPlayer
                      ? "The match"
                      : "Make it yours"}
                </h2>
                <span className="text-dim text-base">↗</span>
              </div>
              {menuOpen ? (
                <div className="space-y-3 text-xs leading-5">
                  <p style={{ color: `rgb(${teams[0]})` }}>Top · Tug of war · 2 players</p>
                  <p className="text-[#6799ff]">Middle · Connect four · 2 players</p>
                  <p className="text-[#ffb74d]">Bottom · Tetris</p>
                  <p className="text-muted border-line border-t pt-3 text-[10px]">
                    Tap any lit row on the pad. Press both top corners together
                    to open this menu during a game.
                  </p>
                </div>
              ) : mode === "tetris" || mode === "snake" ? (
                <>
                  <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide">
                    {String(engine.score).padStart(4, "0")}
                    <span className="text-dim font-sans text-[7px] tracking-widest">
                      POINTS
                    </span>
                  </div>
                  <div className="mt-4 flex gap-9">
                    <div>
                      <span className="text-nav text-[9px]">
                        {mode === "tetris" ? "Lines cleared" : "Length"}
                      </span>
                      <b className="font-display text-lg font-medium">
                        {String(
                          mode === "tetris"
                            ? engine.lines
                            : engine.snake.length,
                        ).padStart(2, "0")}
                      </b>
                    </div>
                    <div>
                      <span className="text-nav text-[9px]">Level</span>
                      <b className="font-display text-lg font-medium">
                        {String(1 + Math.floor(engine.lines / 10)).padStart(
                          2,
                          "0",
                        )}
                      </b>
                    </div>
                  </div>
                  {mode === "snake" && (
                    <label className="border-line mt-5 flex items-center gap-2 border-t pt-4 text-[11px] text-zinc-300">
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
                      <span className="text-[10px] text-zinc-400">Up next</span>
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
                      <small className="text-dim compact:hidden ml-auto text-[6px] tracking-widest">
                        KEEP STACKING
                      </small>
                    </div>
                  )}
                </>
              ) : mode === "life" ? (
                <>
                  <div className="font-display compact:text-3xl flex items-baseline gap-3 text-4xl font-medium tracking-wide">
                    {engine.generation}
                    <span className="text-dim font-sans text-[7px] tracking-widest">
                      GENERATIONS
                    </span>
                  </div>
                  <p className="text-muted text-xs leading-5">
                    {engine.board.filter((c) => c.some(Boolean)).length} living
                    cells · Tap any pad to toggle a cell, even while running.
                  </p>
                  <div className="grid grid-cols-2 gap-2 [&>button]:rounded-md [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[9px]">
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
                    A cell lives with 2 or 3 neighbors; an empty cell is born
                    with 3. Edges do not wrap. Adjacent pads share neighbors.
                  </p>
                  {notice && <small role="status">{notice}</small>}
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
                  <div className="grid grid-cols-2 gap-2 [&>button]:rounded-md [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[9px]">
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
                    neighbors. Every generated puzzle is solvable. Moves cross
                    pad boundaries.
                  </p>
                </>
              ) : twoPlayerModes.includes(mode) ? (
                <>
                  <div className="bg-canvas flex gap-1 rounded-md p-1">
                    {(["ai", "human"] as const).map((kind) => (
                      <button
                        key={kind}
                        className={`flex-1 rounded px-1 py-2 text-[9px] ${engine.opponent === kind ? "bg-selected text-lavender-text shadow" : "text-dim"}`}
                        onClick={() => {
                          engine.opponent = kind;
                          engine.reset();
                          force();
                        }}
                      >
                        {kind === "ai" ? "◐ Play the AI" : "◑ Two players"}
                      </button>
                    ))}
                  </div>
                  {engine.opponent === "ai" && (
                    <label className="block text-[10px] text-zinc-400">
                      AI strength
                      <select
                        className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
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
                      <span className="text-nav text-[9px]">
                        Red {mode === "tug" ? "rounds" : scoreNoun}
                        {engine.opponent === "ai" ? " · you" : ""}
                      </span>
                      <b
                        className="font-display text-lg font-medium"
                        style={{ color: `rgb(${teams[0]})` }}
                      >
                        {teamScores[0]}
                      </b>
                    </div>
                    <div>
                      <span className="text-nav text-[9px]">
                        Blue {mode === "tug" ? "rounds" : scoreNoun}
                        {engine.opponent === "ai" ? " · AI" : ""}
                      </span>
                      <b
                        className="font-display text-lg font-medium"
                        style={{ color: `rgb(${teams[1]})` }}
                      >
                        {teamScores[1]}
                      </b>
                    </div>
                  </div>
                  {duelModes.includes(mode) && (
                    <>
                      <label className="mb-2 flex justify-between text-[10px] text-zinc-400 [&_b]:rounded [&_b]:bg-selected [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[9px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-lavender-text">
                        Rope{" "}
                        <b>
                          {Math.round((engine.rope / engine.duelLength) * 100)}%
                          red
                        </b>
                      </label>
                      <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-blue-400/45">
                        <span
                          style={{
                            width: `${(engine.rope / engine.duelLength) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                  <p className="text-muted text-xs leading-5" role="status">
                    {matchStatus}
                  </p>
                  <div className="grid grid-cols-2 gap-2 [&>button]:rounded-md [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[9px]">
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
                          AI plays {engine.aiSide === 1 ? "blue" : "red"}{" "}
                          instead
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
                  <label className="block text-[10px] text-zinc-400">
                    Your message
                    <input
                      className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
                      value={text}
                      maxLength={160}
                      onChange={(e) => {
                        setText(e.target.value);
                        engine.text = e.target.value;
                        engine.time = 0;
                      }}
                    />
                  </label>
                  <label className="block text-[10px] text-zinc-400">
                    Animation
                    <select
                      className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
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
                  <small className="text-nav text-[9px]">
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
                        className={`size-6 rounded-full border-2 border-transparent ${color === i ? "outline-2 outline-offset-3 outline-white" : ""}`}
                        style={{ background: `rgb(${c})` }}
                        onClick={() => {
                          setColor(i);
                          engine.color = c;
                        }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 [&>button]:rounded-md [&>button]:border [&>button]:border-line [&>button]:px-1 [&>button]:py-2 [&>button]:text-[9px]">
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
                    <label className="border-line cursor-pointer rounded-md border px-1 py-2 text-center text-[9px]">
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
            <section className="border-line bg-card compact:p-4 wide:p-5 rounded-xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold">Set the mood</h2>
                <span className="text-dim text-base">☷</span>
              </div>
              <label className="mb-2 flex justify-between text-[10px] text-zinc-400 [&_b]:rounded [&_b]:bg-selected [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[9px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-lavender-text">
                Speed <b>{speed.toFixed(1)}×</b>
              </label>
              <input
                className="my-3 block h-1 w-full cursor-pointer accent-lavender"
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
              <div className="text-dim mt-2 mb-5 flex justify-between text-[8px] last:mb-0">
                <span>Easy does it</span>
                <span>Let’s go</span>
              </div>
              <label className="mb-2 flex justify-between text-[10px] text-zinc-400 [&_b]:rounded [&_b]:bg-selected [&_b]:px-1.5 [&_b]:py-1 [&_b]:text-[9px] [&_b]:leading-none [&_b]:font-medium [&_b]:text-lavender-text">
                Brightness <b>{brightness}%</b>
              </label>
              <input
                className="my-3 block h-1 w-full cursor-pointer accent-lavender"
                aria-label="Brightness"
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(+e.target.value)}
              />
              <div className="text-dim mt-2 mb-5 flex justify-between text-[8px] last:mb-0">
                <span>☼</span>
                <span>☀</span>
              </div>
            </section>
            <section className="border-line bg-card compact:col-span-full compact:p-4 wide:p-5 rounded-xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold">Your canvas</h2>
                <span className="text-dim text-base">▦</span>
              </div>
              <label className="block text-[10px] text-zinc-400">
                Connected pads{" "}
                <select
                  className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
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
              <div className="bg-canvas flex gap-1 rounded-md p-1">
                {["horizontal", "vertical"].map((l) => (
                  <button
                    key={l}
                    className={`flex-1 rounded px-1 py-2 text-[9px] ${layout === l ? "bg-selected text-lavender-text shadow" : "text-dim"}`}
                    onClick={() => configure(mode, count, l)}
                  >
                    {l === "horizontal" ? "▤" : "▥"}{" "}
                    {l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-dim mt-3 text-[9px] leading-4">
                More pads. More room to play.
                <br />
                Layout changes start a fresh canvas.
              </p>
              <details className="text-nav mt-4 text-[9px]">
                <summary className="cursor-pointer">
                  LED output settings
                </summary>
                <label>
                  Output rate
                  <select
                    className="border-line bg-surface my-2 w-full rounded-md border p-2.5 text-[11px] text-zinc-300"
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
                <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={saturation}
                    onChange={(e) => setSaturation(e.target.checked)}
                  />{" "}
                  Boost saturation
                </label>
                <small className="text-nav text-[9px]">
                  Application rate; hardware throughput is unverified.
                </small>
              </details>
            </section>
          </aside>
        </div>
        <section className="border-line bg-sidebar compact:p-4 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-6 py-5">
          <div>
            <span className="bg-surface text-nav flex size-9 items-center justify-center rounded-lg text-xl">
              ⌘
            </span>
            <div>
              <h3 className="mb-1 text-xs font-medium">
                {mode === "paint"
                  ? "A tiny canvas for big ideas"
                  : "Get into the flow"}
              </h3>
              <p className="text-dim text-[9px]">
                {mode === "paint"
                  ? "Pick a color, click a pixel, save a frame. Repeat."
                  : mode === "life"
                    ? "Toggle cells, save your start, then press Start demo. Pause to step one generation at a time."
                    : mode === "lights"
                      ? "Tap a light to flip its cross. Use Tab and Enter to play with a keyboard."
                      : twoPlayer
                        ? "Pick the AI or a friend, then play on screen or on the pads together."
                        : "Same controls on your screen and on your pad."}
              </p>
            </div>
          </div>
          {duel && (
            <div className="flex flex-wrap items-center gap-4 laptop:gap-2">
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  A
                </kbd>{" "}
                Red press
              </span>
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  L
                </kbd>{" "}
                Blue press
              </span>
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  P
                </kbd>{" "}
                Pause
              </span>
            </div>
          )}
          {(mode === "tetris" || mode === "snake") && (
            <div className="flex flex-wrap items-center gap-4 laptop:gap-2">
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  ←
                </kbd>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  →
                </kbd>{" "}
                Move
              </span>
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  ↑
                </kbd>{" "}
                {mode === "snake" ? "Up" : "Rotate"}
              </span>
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  ↓
                </kbd>{" "}
                {mode === "snake" ? "Down" : "Soft drop"}
              </span>
              {mode === "tetris" && (
                <span>
                  <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                    space
                  </kbd>{" "}
                  Drop
                </span>
              )}
              <span>
                <kbd className="border-line bg-surface min-w-6 rounded border border-b-2 px-1.5 py-1 text-center text-[10px] text-zinc-300">
                  P
                </kbd>{" "}
                Pause
              </span>
            </div>
          )}
          {(mode === "tetris" || mode === "snake") && (
            <p className="compact:pl-0 w-full pl-12">
              On the grid: top third = {mode === "snake" ? "up" : "rotate"},
              middle left / right = move, bottom third = down.
            </p>
          )}
        </section>
        <footer className="text-dim flex justify-between gap-5 py-6 text-[8px]">
          <span className="flex items-center gap-2">
            <span className="bg-success inline-block size-1.5 shrink-0 rounded-full" />{" "}
            No hardware? No problem. The simulator is always ready.
          </span>
          <span className="compact:hidden flex items-center gap-2 text-[7px] tracking-widest">
            BUILT FOR THE BLOOPPAD-MAXX{" "}
            <span className="text-lavender-text ml-1 text-xl">✳</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
