import { useEffect, useState } from "react";
import type { RGB } from "../lib/engine";
import {
  firmwareGames,
  gameAt,
  renderFirmwareMenu,
  type FirmwareGame,
} from "../lib/firmwareMenu";
import { fetchReleases } from "../lib/firmware";
import { links } from "../lib/links";
import { moveInGrid } from "../lib/roving";
import { PadBed, PadShell } from "../components/PadShell";

const rgb = (c: RGB) => `rgb(${c.join(",")})`;

function useMenuFrame(selected: FirmwareGame | null) {
  const [frame, setFrame] = useState<RGB[]>(() =>
    renderFirmwareMenu(selected, 0),
  );
  useEffect(() => {
    const start = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0,
      last = -1;
    const loop = (now: number) => {
      const ms = reduce ? 0 : now - start;
      const step = Math.floor(ms / 62);
      if (step !== last) {
        last = step;
        setFrame(renderFirmwareMenu(selected, ms));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selected]);
  return frame;
}

function useLatestRelease() {
  const [tag, setTag] = useState("");
  useEffect(() => {
    let active = true;
    fetchReleases()
      .then((r) => active && setTag(r[0]?.tag ?? ""))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return tag;
}

export function PadMap() {
  const [selected, setSelected] = useState<FirmwareGame | null>(null);
  const [started, setStarted] = useState(false);
  const [focusCell, setFocusCell] = useState("0-0");
  const frame = useMenuFrame(selected);
  const latest = useLatestRelease();

  function press(row: number, col: number) {
    const game = gameAt(row, col);
    if (!game) return;
    if (game === selected) setStarted(true);
    else {
      setSelected(game);
      setStarted(false);
    }
  }

  return (
    <div className="pb-14">
      <section className="compact:pt-7 pt-10 pb-8">
        <h1 className="font-display compact:text-4xl text-5xl leading-tight font-semibold tracking-tight">
          Your pad’s menu<span className="text-app">.</span>
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
          This is what a BLOOPPAD-MAXX shows when you plug it in: 15 built-in
          games and MIDI mode, one button each, on the top and bottom row. Tap a
          button to see what it does and how to get back out.
        </p>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div>
          <PadShell className="compact:px-3 compact:pt-4 px-6 pt-6 pb-3">
            <PadBed
              role="group"
              aria-label="Firmware game menu"
              className="compact:gap-1 gap-2 p-2"
            >
              {frame.map((c, i) => {
                const row = Math.floor(i / 8),
                  col = i % 8,
                  game = gameAt(row, col),
                  lit = c.some(Boolean);
                const style = lit
                  ? {
                      backgroundColor: rgb(c),
                      boxShadow: `0 0 15px rgba(${c.join(",")},.16)`,
                    }
                  : undefined;
                return game ? (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${game.name}, ${game.row === 0 ? "top" : "bottom"} row, button ${game.col + 1}`}
                    aria-pressed={selected === game}
                    data-cell={`${row}-${col}`}
                    tabIndex={focusCell === `${row}-${col}` ? 0 : -1}
                    onFocus={() => setFocusCell(`${row}-${col}`)}
                    onKeyDown={(e) => moveInGrid(e, row, col, [0, 7])}
                    onClick={() => press(row, col)}
                    className={`pixel aspect-square min-w-0 border border-white/5 transition hover:brightness-125 active:scale-90 ${selected === game ? "outline-white outline-1 outline-offset-1" : ""}`}
                    style={style}
                  />
                ) : (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="pixel aspect-square min-w-0 border border-white/5"
                    style={style}
                  />
                );
              })}
            </PadBed>
          </PadShell>
          <p className="text-dim mt-3 text-[11px] leading-5">
            Mirrors the menu in firmware {latest || "v2"}. Text scrolls at the
            pad’s own speed and font.
          </p>
        </div>

        <Manual
          game={selected}
          started={started}
          onClear={() => setSelected(null)}
        />
      </div>

      <section aria-labelledby="next" className="mt-14">
        <h2 id="next" className="text-app text-sm font-semibold">
          Beyond the menu
        </h2>
        <ul className="border-line mt-4 divide-y divide-[var(--color-line)] border">
          {[
            {
              href: "#/browser",
              title: "Browser games",
              body: "Press the white MIDI button twice, connect, and this site drives the LEDs: Snake, Marquee, Pixel studio and more, across up to four pads.",
              meta: "USB-MIDI",
            },
            {
              href: "#/flash",
              title: "Flash firmware",
              body: "Install the latest official release straight from the browser. From the menu or MIDI mode, the pad reboots into its bootloader by itself.",
              meta: latest ? `Latest ${latest}` : "Official releases",
            },
            {
              href: "#/hardware",
              title: "Hardware",
              body: "How the board is built: CH32X035 microcontroller, 64 RGB LEDs, rubber keypad, schematics, Gerbers and cover files.",
              meta: "Rev 01",
            },
            {
              href: "#/hack",
              title: "Hack",
              body: "Talk to the pad yourself: button and LED addresses, SysEx frames, I²C registers and building the firmware.",
              meta: "MIDI · I²C · UART",
            },
          ].map((t) => (
            <li key={t.href}>
              <a
                href={t.href}
                className="hover:bg-card compact:grid-cols-1 grid items-baseline gap-2 px-5 py-4 transition-colors sm:grid-cols-[11rem_minmax(0,1fr)_9rem]"
              >
                <span className="text-app text-[13px] font-semibold">
                  {t.title} →
                </span>
                <span className="text-muted text-xs leading-5">{t.body}</span>
                <span className="text-dim text-[11px] sm:text-right">
                  {t.meta}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Manual({
  game,
  started,
  onClear,
}: {
  game: FirmwareGame | null;
  started: boolean;
  onClear: () => void;
}) {
  if (!game)
    return (
      <article
        className="border-line bg-card border p-6 text-xs leading-5"
        aria-live="polite"
      >
        <h2 className="font-display text-xl font-semibold">
          How the menu works
        </h2>
        <ol className="mt-5 space-y-4">
          {[
            [
              "Plug in",
              "For 2 seconds the top three rows show the firmware version in binary (red major, green minor, blue patch), then CHOOSE GAME scrolls by.",
            ],
            [
              "Select",
              "Press a lit button on the top or bottom row. It blinks and its name scrolls by.",
            ],
            ["Start", "Press the same button again."],
            [
              "Players",
              "Multiplayer games ask first: press red or blue to play that color against the computer, or both at once for two players. Against the computer, pick green (easy), yellow (normal) or red (hard).",
            ],
            [
              "Back to the menu",
              "When a game ends, the result scrolls by; press any button. The game stays selected, so one press plays it again. Most games have no early exit: unplug and replug. Game of life and Rainbow have their own, on their buttons.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[1.5rem_minmax(0,1fr)]">
              <span className="font-display text-app tabular-nums">
                {i + 1}
              </span>
              <span>
                <b className="text-app font-semibold">{t}.</b>{" "}
                <span className="text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="border-line-soft mt-6 grid gap-x-6 gap-y-1 border-t pt-5 sm:grid-cols-2">
          {([0, 1] as const).map((row) => (
            <div key={row}>
              <h3 className="text-dim mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
                {row === 0 ? "Top row · originals" : "Bottom row · newer"}
              </h3>
              <ul className="space-y-1">
                {firmwareGames
                  .filter((g) => g.row === row)
                  .map((g) => (
                    <li key={g.id} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="border-dim size-2.5 border"
                        style={{ background: rgb(g.color) }}
                      />
                      <span className="text-nav">{g.name}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-dim mt-5">
          Full manual:{" "}
          <a
            className="text-app underline underline-offset-2"
            href={links.games}
            target="_blank"
            rel="noreferrer"
          >
            GAMES.md ↗
          </a>
        </p>
      </article>
    );

  const isMidi = game.id === "midi";
  return (
    <article
      className={` border p-6 text-xs leading-5 ${isMidi ? "border-line-strong bg-canvas" : "border-line bg-card"}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-nav flex items-center gap-2 text-[11px]">
            <span
              aria-hidden="true"
              className="border-dim size-3 border"
              style={{ background: rgb(game.color) }}
            />
            {game.row === 0 ? "Top" : "Bottom"} row · button {game.col + 1} ·{" "}
            {game.colorName}
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            {game.name}
          </h2>
          <p className="text-muted mt-1">{game.players}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="border-line text-nav hover:text-app border px-3 py-1.5 text-[11px]"
        >
          All games
        </button>
      </div>

      <p
        className={`mt-5 px-3 py-2 ${started ? "bg-app text-canvas" : "bg-canvas text-nav"}`}
        role="status"
      >
        {started
          ? isMidi
            ? "On your pad this second press switches to MIDI mode. The LEDs stay dark until a computer sends them colors."
            : `On your pad this second press starts ${game.name}.`
          : "Selected. On your pad, press it again to start."}
      </p>

      <h3 className="text-app mt-6 font-semibold">
        {isMidi ? "What it does" : "How to play"}
      </h3>
      <ul className="text-muted mt-2 list-disc space-y-1.5 pl-4">
        {game.play.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <h3 className="text-app mt-5 font-semibold">
        {isMidi ? "Leaving MIDI mode" : "Stopping"}
      </h3>
      <p className="text-muted mt-2">{game.ends}</p>

      <div className="border-line-soft mt-6 flex flex-wrap gap-3 border-t pt-5">
        {isMidi ? (
          <>
            <a
              href="#/browser"
              className="bg-app text-canvas hover:bg-app/85 px-4 py-2.5 text-xs font-bold"
            >
              Open browser games
            </a>
            <a
              href="#/hack"
              className="border-line hover:bg-surface border px-3 py-2.5 text-[11px]"
            >
              MIDI protocol
            </a>
            <a
              href={links.scratcher}
              target="_blank"
              rel="noreferrer"
              className="border-line hover:bg-surface border px-3 py-2.5 text-[11px]"
            >
              Fri3d Scratcher ↗
            </a>
          </>
        ) : game.browser ? (
          <>
            <a
              href={`#/browser/${game.browser}`}
              className="border-line hover:bg-surface border px-3 py-2.5 text-[11px]"
            >
              Play the browser version
            </a>
            <span className="text-dim self-center text-[11px]">
              Needs the pad in MIDI mode, or plays on screen.
            </span>
          </>
        ) : (
          <span className="text-dim text-[11px]">
            Only on the pad. No browser version yet.
          </span>
        )}
      </div>
    </article>
  );
}
