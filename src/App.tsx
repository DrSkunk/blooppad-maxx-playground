import { useEffect, useState } from "react";
import type { Mode } from "./lib/engine";
import { PadMap } from "./tracks/PadMap";
import { Playground } from "./tracks/Playground";
import { Flash } from "./tracks/Flash";
import { Hardware } from "./tracks/Hardware";
import { Hack } from "./tracks/Hack";
import { REPO } from "./lib/links";
import { ThemeToggle } from "./components/ThemeToggle";

const tracks = [
  { path: "", label: "Pad menu", short: "Menu" },
  { path: "browser", label: "Browser games", short: "Games" },
  { path: "flash", label: "Flash firmware", short: "Flash" },
  { path: "hardware", label: "Hardware", short: "Hardware" },
  { path: "hack", label: "Hack", short: "Hack" },
] as const;

function readRoute() {
  const [track = "", sub = ""] = location.hash.replace(/^#\/?/, "").split("/");
  return { track, sub };
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const known = tracks.some((t) => t.path === route.track);
  const track = known ? route.track : "";
  useEffect(() => {
    document
      .querySelector('nav[aria-label="Tracks"] [aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [track]);

  return (
    <div className="bg-canvas text-app min-h-screen">
      <header className="border-line-soft bg-sidebar sticky top-0 z-20 border-b">
        <div className="compact:h-auto compact:flex-wrap compact:gap-x-3 compact:gap-y-3 compact:px-4 compact:py-3 mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-6">
          <a
            href="#/"
            className="font-display compact:mr-auto flex shrink-0 items-center gap-2.5 text-lg leading-none font-bold tracking-tight"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="bg-app text-canvas size-8 fill-current"
            >
              <rect x="2.5" y="2.5" width="4" height="4" />
              <rect x="7.5" y="2.5" width="4" height="4" />
              <rect x="12.5" y="2.5" width="4" height="4" />
              <rect x="17.5" y="2.5" width="4" height="4" />
              <rect x="2.5" y="7.5" width="4" height="4" opacity="0.35" />
              <rect x="7.5" y="7.5" width="4" height="4" opacity="0.35" />
              <rect x="12.5" y="7.5" width="4" height="4" opacity="0.35" />
              <rect x="17.5" y="7.5" width="4" height="4" opacity="0.35" />
              <rect x="2.5" y="12.5" width="4" height="4" opacity="0.35" />
              <rect x="7.5" y="12.5" width="4" height="4" opacity="0.35" />
              <rect x="12.5" y="12.5" width="4" height="4" opacity="0.35" />
              <rect x="17.5" y="12.5" width="4" height="4" opacity="0.35" />
              <rect x="2.5" y="17.5" width="4" height="4" />
              <rect x="7.5" y="17.5" width="4" height="4" />
              <rect x="12.5" y="17.5" width="4" height="4" />
              <rect x="17.5" y="17.5" width="4" height="4" />
            </svg>
            <span className="compact:hidden">
              bloop<span className="font-normal">pad</span>
              <small className="text-dim mt-1 block font-sans text-[10px] tracking-[0.18em]">
                MAXX COMPANION
              </small>
            </span>
          </a>
          <nav
            aria-label="Tracks"
            className="compact:order-last compact:mx-0 compact:w-full compact:flex-none compact:px-0 -mx-2 flex min-w-0 flex-1 gap-1 overflow-x-auto px-2"
          >
            {tracks.map((t) => (
              <a
                key={t.path}
                href={`#/${t.path}`}
                aria-current={track === t.path ? "page" : undefined}
                className={`compact:flex-1 compact:px-1 compact:text-center px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors ${track === t.path ? "bg-app text-canvas" : "text-nav hover:bg-surface hover:text-app"}`}
              >
                <span className="compact:hidden">{t.label}</span>
                <span className="compact:inline hidden">{t.short}</span>
              </a>
            ))}
          </nav>
          <ThemeToggle />
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="border-line text-nav hover:text-app laptop:hidden shrink-0 border px-3 py-2 text-[11px]"
          >
            Hardware repo ↗
          </a>
        </div>
      </header>
      <main className="compact:px-4 mx-auto max-w-[1400px] px-6">
        {track === "" && <PadMap />}
        {track === "browser" && (
          <Playground
            key={route.sub}
            initialMode={(route.sub || undefined) as Mode | undefined}
          />
        )}
        {track === "flash" && <Flash />}
        {track === "hardware" && <Hardware />}
        {track === "hack" && <Hack />}
      </main>
      <footer className="border-line-soft text-dim compact:px-4 mx-auto flex max-w-[1400px] flex-wrap justify-between gap-3 border-t px-6 py-6 text-[11px]">
        <span>
          Hardware, firmware and game manual:{" "}
          <a
            className="text-nav hover:text-app underline underline-offset-2"
            href={REPO}
            target="_blank"
            rel="noreferrer"
          >
            phyx-be/BLOOPPAD-MAXX
          </a>{" "}
          (Apache-2.0).
        </span>
        <span>Runs entirely in your browser. Nothing is uploaded.</span>
      </footer>
    </div>
  );
}
