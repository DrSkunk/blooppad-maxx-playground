import { useEffect, useState } from "react";

type Theme = "auto" | "light" | "dark";
const order: Theme[] = ["auto", "light", "dark"];
const names: Record<Theme, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

function stored(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

/** Cycles Auto (follows the system) → Light → Dark. Remembered in this browser only. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
    // Browser chrome color: per-scheme metas in auto, the chosen color otherwise.
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((m) => {
        m.dataset.auto ??= m.content;
        m.content =
          theme === "auto"
            ? m.dataset.auto
            : theme === "dark"
              ? "#000000"
              : "#ffffff";
      });
    try {
      if (theme === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", theme);
    } catch {
      /* storage unavailable: the choice lasts for this page view */
    }
  }, [theme]);
  const next = order[(order.indexOf(theme) + 1) % order.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Color theme: ${names[theme]}${theme === "auto" ? " (follows your system)" : ""}. Switch to ${names[next]}.`}
      className="border-line text-nav hover:text-app compact:px-2.5 flex shrink-0 items-center gap-2 border px-3 py-2 text-[11px]"
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
        <rect
          x="0.5"
          y="0.5"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
        />
        {theme !== "light" && (
          <rect x="6" y="1" width="5" height="10" fill="currentColor" />
        )}
        {theme === "dark" && (
          <rect x="1" y="1" width="5" height="10" fill="currentColor" />
        )}
      </svg>
      <span className="compact:hidden">{names[theme]}</span>
    </button>
  );
}
