import { palette, teams } from "./engine.ts";
import type { Mode, RGB } from "./engine.ts";

export const deviceMenuModes = [
  "tug",
  "connect",
  "tetris",
] as const satisfies readonly Mode[];

const icons = [
  ["10000001", "11111111"],
  ["01100110", "01100110"],
  ["00111000", "00010000"],
];
const colors: RGB[] = [teams[0], teams[1], palette[2]];

export function menuModeAt(
  row: number,
): (typeof deviceMenuModes)[number] | null {
  const band = Math.floor((row % 8) / 3);
  return row % 8 === 2 || row % 8 === 5 ? null : deviceMenuModes[band];
}

export function renderDeviceMenu(width: number, height: number): RGB[] {
  return Array.from({ length: width * height }, (_, index): RGB => {
    const x = (index % width) % 8;
    const y = Math.floor(index / width) % 8;
    const mode = menuModeAt(y);
    if (!mode) return [0, 0, 0];
    const band = deviceMenuModes.indexOf(mode);
    const color = colors[band];
    const iconRow = y - band * 3;
    return icons[band][iconRow][x] === "1"
      ? color
      : (color.map((channel) => Math.round(channel * 0.18)) as RGB);
  });
}
