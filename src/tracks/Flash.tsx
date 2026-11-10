import { FirmwareFlasher } from "../components/FirmwareFlasher";
import { links } from "../lib/links";
import { Code, PageHead } from "./parts";

export function Flash() {
  return (
    <div className="pb-14">
      <PageHead title="Flash firmware">
        Install an official BLOOPPAD-MAXX release, or your own build, over USB
        from this page. Works in Chrome and Edge. Releases come from{" "}
        <a
          className="text-app underline underline-offset-2"
          href={links.releases}
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
        ; the firmware is never bundled with this site.
      </PageHead>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <FirmwareFlasher />
        <aside className="space-y-6 text-xs leading-5">
          <section>
            <h2 className="text-app text-[13px] font-semibold">
              After flashing
            </h2>
            <p className="text-muted mt-2">
              The pad restarts, shows its new version in binary on the top three
              rows, then the game menu.
            </p>
          </section>
          <section>
            <h2 className="text-app text-[13px] font-semibold">
              Stuck in the bootloader?
            </h2>
            <p className="text-muted mt-2">
              While the pad is in its bootloader after the reboot command, all
              LEDs are dim purple. If no upload starts, it returns to the
              firmware by itself after a few seconds. Nothing is lost; press
              Flash again.
            </p>
          </section>
          <section>
            <h2 className="text-app text-[13px] font-semibold">
              From a terminal
            </h2>
            <p className="text-muted mt-2">
              With{" "}
              <a
                className="text-app underline underline-offset-2"
                href={links.wchisp}
                target="_blank"
                rel="noreferrer"
              >
                wchisp ↗
              </a>
              , put the pad in the bootloader (send the reboot SysEx from any
              MIDI tool, or use the boot button), then:
            </p>
            <Code>wchisp flash firmware.bin</Code>
            <p className="text-muted mt-3">
              Or build and upload with PlatformIO from the firmware folder:
            </p>
            <Code>pio run -e debug -t upload</Code>
            <p className="text-dim mt-3">
              Reboot command:{" "}
              <span className="font-mono">F0 13 37 00 42 4F 4F F7</span>. See{" "}
              <a
                className="text-nav underline underline-offset-2"
                href="#/hack"
              >
                Hack
              </a>
              .
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
