import { useState } from "react";
import { links } from "../lib/links";
import { moveInGrid } from "../lib/roving";
import { BOOTLOADER_SYSEX } from "../lib/bootloader";
import { PadBed, PadShell } from "../components/PadShell";
import { Code, PageHead, Section } from "./parts";

const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

/* Palette for LED Control Change values, as listed in the firmware README (names as documented there). */
const ccPalette: [number, string, string][] = [
  [0x00, "000000", "LED off"],
  [0x01, "C50A08", "orange-red"],
  [0x02, "32BE44", "teal"],
  [0x03, "42D4F4", "yellow-green"],
  [0x04, "F8D200", "warm white"],
  [0x05, "0044FF", "blue"],
  [0x06, "AF00CC", "cyan"],
  [0x07, "FCA6D7", "white"],
  [0x08, "F2F2FF", "bright white"],
  [0x09, "FF8000", "green"],
];

const i2c: [string, string, string, string][] = [
  ["0x00", "Version number", "R", "3"],
  ["0x03", "Button states", "R", "8"],
  ["0x0B", "Button RGB LEDs", "R/W", "192"],
];

function AddressExplorer() {
  const [cell, setCell] = useState({ row: 0, col: 0 });
  const [color, setColor] = useState("#ffffff");
  const button = (cell.row << 4) | cell.col;
  const led = (cell.row << 4) | (8 + cell.col);
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const sysex = [
    "F0",
    "13",
    "37",
    hex(led),
    ...rgb.map((v) => hex(v >> 1)),
    "F7",
  ].join(" ");
  return (
    <div className="grid items-start gap-6 md:grid-cols-[17rem_minmax(0,1fr)]">
      <PadShell label={false} className="p-3">
        <PadBed role="group" aria-label="Pick a button" className="gap-1 p-1.5">
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8),
              col = i % 8,
              on = row === cell.row && col === cell.col;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Row ${row}, column ${col}`}
                aria-pressed={on}
                data-cell={`${row}-${col}`}
                tabIndex={on ? 0 : -1}
                onKeyDown={(e) => {
                  const next = moveInGrid(
                    e,
                    row,
                    col,
                    [0, 1, 2, 3, 4, 5, 6, 7],
                  );
                  if (next) setCell(next);
                }}
                onClick={() => setCell({ row, col })}
                className="pixel aspect-square border border-white/5 hover:brightness-125"
                style={
                  on
                    ? {
                        backgroundColor: color,
                        boxShadow: `0 0 12px ${color}29`,
                      }
                    : undefined
                }
              />
            );
          })}
        </PadBed>
      </PadShell>
      <dl className="grid gap-x-8 gap-y-4 text-xs leading-5 sm:grid-cols-2">
        <div>
          <dt className="text-nav">Position</dt>
          <dd className="text-app font-display text-lg tabular-nums">
            row {cell.row}, column {cell.col}
          </dd>
        </div>
        <div>
          <dt className="text-nav">Color for the SysEx</dt>
          <dd className="mt-1">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="LED color"
              className="border-line h-8 w-16 cursor-pointer border bg-transparent"
            />
          </dd>
        </div>
        <div>
          <dt className="text-nav">Button sends</dt>
          <dd className="font-mono text-app">
            B0 {hex(button)} 7F <span className="text-dim">press</span> · B0{" "}
            {hex(button)} 00 <span className="text-dim">release</span>
          </dd>
        </div>
        <div>
          <dt className="text-nav">LED palette color (CC)</dt>
          <dd className="font-mono text-app">B0 {hex(led)} 01–09</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-nav">
            LED full color (SysEx, channels shifted right by one)
          </dt>
          <dd className="font-mono text-app">{sysex}</dd>
        </div>
      </dl>
    </div>
  );
}

export function Hack() {
  return (
    <div className="pb-14">
      <PageHead title="Hack">
        In MIDI mode the pad is a plain USB-MIDI device: it reports every button
        and lets the computer set every LED. Everything here comes from the{" "}
        <a
          className="text-app underline underline-offset-2"
          href={links.readme}
          target="_blank"
          rel="noreferrer"
        >
          firmware README ↗
        </a>
        .
      </PageHead>

      <nav
        aria-label="On this page"
        className="text-nav -mt-2 mb-10 flex flex-wrap gap-x-5 gap-y-2 text-[12px]"
      >
        {[
          ["addresses", "Addresses"],
          ["leds", "LED messages"],
          ["bootloader", "Bootloader"],
          ["i2c", "I²C and UART"],
          ["build", "Build the firmware"],
        ].map(([id, t]) => (
          <a
            key={id}
            href={`#/hack`}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById(id)
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="hover:text-app underline-offset-2 hover:underline"
          >
            {t}
          </a>
        ))}
      </nav>

      <Section
        id="addresses"
        title="Addresses"
        lead="Buttons and LEDs share one 8-bit address per cell: the row in the high nibble, the column in the low nibble. Buttons use columns 0–7, LEDs 8–15. Pick a cell to see its messages."
      >
        <AddressExplorer />
      </Section>

      <Section
        id="leds"
        title="LED messages"
        lead="Two ways to set an LED. A Control Change picks one of nine fixed colors; a SysEx sets any RGB value."
      >
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-app text-[13px] font-semibold">
              Palette (Control Change value)
            </h3>
            <table className="mt-3 w-full text-left text-xs">
              <thead className="text-nav">
                <tr className="border-line-soft border-b">
                  <th className="py-2 font-medium">Value</th>
                  <th className="py-2 font-medium">RGB</th>
                  <th className="py-2 font-medium">Name in the README</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {ccPalette.map(([v, c, n]) => (
                  <tr key={v} className="border-line-soft border-b">
                    <td className="text-app py-1.5">{hex(v)}</td>
                    <td className="text-muted py-1.5">{c}</td>
                    <td className="text-muted py-1.5 font-sans">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-app text-[13px] font-semibold">
              Full color (SysEx)
            </h3>
            <Code>
              F0 13 37 &lt;led&gt; &lt;red&gt; &lt;green&gt; &lt;blue&gt; F7
            </Code>
            <p className="text-muted mt-3 text-xs leading-5">
              <span className="font-mono">13 37</span> is the manufacturer ID.
              MIDI data bytes stop at 0x7F, so shift each 8-bit channel right by
              one. The firmware accepts several{" "}
              <span className="font-mono">led r g b</span> groups in one
              message; this site sends whole frames that way, 260 bytes for all
              64 LEDs.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="bootloader"
        title="Bootloader"
        lead="One SysEx is not an LED update: it reboots the pad into WCH’s ISP bootloader, so a reflash needs no boot button."
      >
        <Code>{BOOTLOADER_SYSEX.map(hex).join(" ")}</Code>
        <ul className="text-muted mt-4 max-w-2xl list-disc space-y-1.5 pl-4 text-xs leading-5">
          <li>
            Handled in the game menu and in MIDI mode, not while a game runs.
          </li>
          <li>
            00 can never be an LED index, and 42 4F 4F spells “BOO”, so it
            cannot happen by accident.
          </li>
          <li>
            While in the bootloader all LEDs are dim purple. Start the upload at
            once: without one, it returns to the firmware after a few seconds.
          </li>
          <li>
            The{" "}
            <a className="text-app underline underline-offset-2" href="#/flash">
              Flash firmware
            </a>{" "}
            track sends it for you.
          </li>
        </ul>
      </Section>

      <Section
        id="i2c"
        title="I²C and UART"
        lead="Both live on the expansion header and run at 5 V."
      >
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-app text-[13px] font-semibold">
              I²C, address 0x55
            </h3>
            <table className="mt-3 w-full text-left text-xs">
              <thead className="text-nav">
                <tr className="border-line-soft border-b">
                  <th className="py-2 font-medium">Register</th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Access</th>
                  <th className="py-2 text-right font-medium">Bytes</th>
                </tr>
              </thead>
              <tbody>
                {i2c.map(([a, n, rw, b]) => (
                  <tr key={a} className="border-line-soft border-b">
                    <td className="text-app py-1.5 font-mono">{a}</td>
                    <td className="text-muted py-1.5">{n}</td>
                    <td className="text-muted py-1.5">{rw}</td>
                    <td className="text-muted py-1.5 text-right tabular-nums">
                      {b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-app text-[13px] font-semibold">UART</h3>
            <p className="text-muted mt-2 text-xs leading-5">
              The same MIDI messages, at{" "}
              <span className="font-mono">115200 8N1</span> on PC18 (TX3) and
              PC19 (RX3). See the{" "}
              <a
                className="text-nav underline underline-offset-2"
                href="#/hardware"
              >
                header pinout
              </a>
              .
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="build"
        title="Build the firmware"
        lead="The firmware is C for the CH32X035, built with PlatformIO."
      >
        <ol className="text-muted max-w-2xl space-y-4 text-xs leading-5">
          <li>
            Install{" "}
            <a
              className="text-app underline underline-offset-2"
              href={links.platformio}
              target="_blank"
              rel="noreferrer"
            >
              PlatformIO ↗
            </a>{" "}
            and the{" "}
            <a
              className="text-app underline underline-offset-2"
              href={links.ch32v}
              target="_blank"
              rel="noreferrer"
            >
              CH32V platform ↗
            </a>
            .
          </li>
          <li>
            From the <span className="font-mono">firmware</span> folder, build:
            <Code>pio run -e debug</Code>
          </li>
          <li>
            Upload, or flash the resulting{" "}
            <span className="font-mono">.bin</span> as a local file on the{" "}
            <a className="text-app underline underline-offset-2" href="#/flash">
              Flash firmware
            </a>{" "}
            track:
            <Code>pio run -e debug -t upload</Code>
          </li>
          <li>
            Releases are built by CI from every{" "}
            <span className="font-mono">v*</span> tag and published as{" "}
            <span className="font-mono">firmware.bin</span>.
          </li>
        </ol>
      </Section>
    </div>
  );
}
