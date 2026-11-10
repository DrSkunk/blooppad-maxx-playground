import { links } from "../lib/links";
import { FileLink, PageHead, Section } from "./parts";

const specs: [string, string][] = [
  ["Microcontroller", "WCH CH32X035 (CH32X035G8U6), RISC-V with native USB"],
  ["LEDs", "64 × WS2812C RGB, one under every button, about 25–30 mA each"],
  [
    "Buttons",
    "8 × 8 matrix with a diode per key, so any number can be held at once (n-key rollover)",
  ],
  ["USB", "USB-C. 5.1 kΩ CC resistors ask the host for 5 V at 3 A"],
  ["Interfaces", "USB-MIDI, UART at 115200 8N1, I²C at address 0x55"],
  ["Logic level", "5 V, including the I²C pins"],
];

const header: [string, string][] = [
  ["5V", "Power"],
  ["GND", "Ground"],
  ["PC18", "SDA · DIO · TX3 · PIOC IO0"],
  ["PC19", "SCL · DCK · RX3"],
];

export function Hardware() {
  return (
    <div className="pb-14">
      <PageHead title="Hardware">
        An illuminated 8×8 keypad on a cheap USB microcontroller. The board,
        firmware and cover files are open source in{" "}
        <a
          className="text-app underline underline-offset-2"
          href={links.repo}
          target="_blank"
          rel="noreferrer"
        >
          phyx-be/BLOOPPAD-MAXX ↗
        </a>
        .
      </PageHead>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <figure className="border-line overflow-hidden border">
          <img
            src="media/pad-exposed-1280.webp"
            srcSet="media/pad-exposed-640.webp 640w, media/pad-exposed-1280.webp 1280w"
            sizes="(min-width: 768px) 55vw, 100vw"
            decoding="async"
            alt="A BLOOPPAD-MAXX taken apart: the blue cover grid, the white rubber keypad, and the green PCB with round contact pads and an LED in each."
            width={1280}
            height={1700}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover object-[50%_55%]"
          />
          <figcaption className="text-dim bg-card px-4 py-2.5 text-[11px]">
            Cover grid, rubber keypad and PCB. Photo: phyx-be/BLOOPPAD-MAXX.
          </figcaption>
        </figure>
        <figure className="border-line overflow-hidden border">
          <img
            src="media/pcb-rev00-768.webp"
            srcSet="media/pcb-rev00-640.webp 640w, media/pcb-rev00-768.webp 768w"
            sizes="(min-width: 768px) 45vw, 100vw"
            decoding="async"
            alt="The bare green BLOOPPAD-MAXX PCB, rev 00, with 64 round contact pads in an 8 by 8 grid and the USB-C connector at the top edge."
            width={768}
            height={1020}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="text-dim bg-card px-4 py-2.5 text-[11px]">
            Bare PCB, rev 00. Photo: phyx-be/BLOOPPAD-MAXX.
          </figcaption>
        </figure>
      </div>

      <div className="mt-12">
        <Section
          id="build"
          title="How it’s built"
          lead="Four layers, bottom to top. Each button is a rubber key that presses on a round contact pad on the PCB, with its LED shining up through the key."
        >
          <ol className="border-line divide-line-soft divide-y border text-xs leading-5">
            {[
              [
                "Bottom plate",
                "Closes the back of the pad.",
                "3D model in mechanical/",
              ],
              [
                "PCB",
                "Microcontroller, USB-C, button matrix and 64 LEDs, each in the middle of its contact pad.",
                "Altium project in hardware/",
              ],
              [
                "Rubber keypad",
                "64 rubber keys, one over each LED.",
                "Rubber outline in mechanical/",
              ],
              [
                "Cover grid",
                "Holds the keypad in place. Cut or printed from the cover files.",
                "Cover, CNC cover and DXF in mechanical/",
              ],
            ].map(([t, d, f], i) => (
              <li
                key={t}
                className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[2rem_10rem_minmax(0,1fr)_14rem]"
              >
                <span className="font-display text-app tabular-nums">
                  {4 - i}
                </span>
                <span className="text-app font-semibold">{t}</span>
                <span className="text-muted">{d}</span>
                <span className="text-dim text-[11px] sm:text-right">{f}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="specs" title="Specifications">
          <dl className="grid gap-x-10 gap-y-4 text-xs leading-5 sm:grid-cols-2">
            {specs.map(([k, v]) => (
              <div
                key={k}
                className="border-line-soft grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b pb-3"
              >
                <dt className="text-nav">{k}</dt>
                <dd className="text-app">{v}</dd>
              </div>
            ))}
          </dl>
          <div
            className="border-line-strong bg-canvas mt-6 max-w-2xl border p-5 text-xs leading-5"
            role="note"
          >
            <h3 className="text-app font-semibold">Power and brightness</h3>
            <p className="text-muted mt-1">
              All 64 LEDs at full white draw around 2 A. The board cannot tell
              whether your USB port can supply that, so keep the brightness down
              on laptops and hubs. The browser games have a brightness slider
              for this.
            </p>
          </div>
        </Section>

        <Section
          id="header"
          title="Expansion header"
          lead="Four pins on the top edge, left to right. PC18 and PC19 carry I²C, UART and the 2-wire debug interface. They run at 5 V: add a level translator for 3.3 V parts."
        >
          <div className="flex max-w-2xl flex-wrap gap-2">
            {header.map(([pin, use]) => (
              <div
                key={pin}
                className="border-line bg-card min-w-36 flex-1 border px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="border-pad bg-canvas size-3 border-2"
                  />
                  <span className="font-display text-app text-sm font-semibold">
                    {pin}
                  </span>
                </div>
                <p className="text-muted mt-1 text-[11px]">{use}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="revisions" title="Revisions">
          <dl className="max-w-2xl space-y-3 text-xs leading-5">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)]">
              <dt className="font-display text-app font-semibold">Rev 00</dt>
              <dd className="text-muted">
                The first board design, put together in an evening.
              </dd>
            </div>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)]">
              <dt className="font-display text-app font-semibold">Rev 01</dt>
              <dd className="text-muted">
                Traces moved away from the mounting holes next to USB-C, so
                metal screws can be used.
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          id="files"
          title="Design files"
          lead="Everything you need to make or modify one. Links open on GitHub."
        >
          <div className="border-line divide-line-soft grid divide-y border sm:grid-cols-2 sm:divide-y-0 [&>*]:sm:border-line-soft [&>*:nth-child(n+3)]:sm:border-t [&>*:nth-child(odd)]:sm:border-r">
            <FileLink
              href={links.schematic}
              title="Schematic (PDF)"
              note="Rev 00 schematic: how the LEDs, matrix, USB and header connect to the CH32X035."
            />
            <FileLink
              href={links.rev01}
              title="PCB project, rev 01"
              note="Altium Designer schematic, PCB and project files."
            />
            <FileLink
              href={links.gerbers}
              title="Gerbers"
              note="Fabrication outputs for rev 01."
            />
            <FileLink
              href={links.bom}
              title="Bill of materials"
              note="Parts list for rev 01 (.xls)."
            />
            <FileLink
              href={links.pickPlace}
              title="Pick and place"
              note="Component positions for assembly, rev 01."
            />
            <FileLink
              href={links.mechanical}
              title="Mechanical"
              note="Cover, CNC cover, keypad outline, bottom plate and drawing (PDF)."
            />
            <FileLink
              href={links.firmware}
              title="Firmware source"
              note="C for the CH32X035, built with PlatformIO."
            />
            <FileLink
              href={links.releases}
              title="Firmware releases"
              note="Built firmware.bin for every tagged version."
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
