import { useEffect, useRef, useState } from "react";
import { WebUsbTransport, WchIspFlasher, type Progress } from "wchisp-web";
import {
  downloadFirmware,
  fetchReleases,
  type FirmwareRelease,
} from "../lib/firmware";
import { padOutputs, sendBootloader } from "../lib/bootloader";
import { prepareMidiFlash } from "../lib/flash";

const PHASES: Record<string, string> = {
  identify: "Identifying chip",
  "read-config": "Reading chip configuration",
  erase: "Erasing flash",
  write: "Writing firmware",
  verify: "Verifying firmware",
  reset: "Restarting device",
};

function message(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotFoundError")
    return "No USB device was selected.";
  return error instanceof Error ? error.message : String(error);
}

type Route = "midi" | "button";

export function FirmwareFlasher() {
  const [route, setRoute] = useState<Route>("midi");
  const [pads, setPads] = useState<MIDIOutput[]>([]);
  const [padId, setPadId] = useState("");
  const [finding, setFinding] = useState(false);
  const [padError, setPadError] = useState("");
  const [source, setSource] = useState<"release" | "local">("release");
  const [releases, setReleases] = useState<FirmwareRelease[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [catalogError, setCatalogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const flashController = useRef<AbortController | null>(null);
  const usbSupported =
    typeof navigator !== "undefined" && Boolean(navigator.usb);
  const proxyConfigured = Boolean(import.meta.env.VITE_FIRMWARE_PROXY_ORIGIN);
  const release =
    releases.find((item) => item.assetId === selectedId) ?? releases[0];
  const pad = pads.find((p) => p.id === padId) ?? pads[0];

  useEffect(() => () => flashController.current?.abort(), []);

  useEffect(() => {
    let active = true;
    fetchReleases()
      .then((items) => {
        if (!active) return;
        setReleases(items);
        setCatalogError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setCatalogError(message(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  async function findPad() {
    setFinding(true);
    setPadError("");
    try {
      const found = await padOutputs();
      setPads(found);
      setPadId(found[0]?.id ?? "");
      if (!found.length)
        setPadError(
          "No BLOOPPAD-MAXX found over MIDI. Plug it in and wait for the game menu, or use the boot button.",
        );
    } catch (reason) {
      setPadError(message(reason));
    } finally {
      setFinding(false);
    }
  }

  async function readFirmware(signal: AbortSignal): Promise<Uint8Array> {
    signal.throwIfAborted();
    if (source === "release" && release) {
      setStatus("Downloading firmware… 0%");
      const bytes = await downloadFirmware(
        release,
        (percent) => {
          if (!signal.aborted) setStatus(`Downloading firmware… ${percent}%`);
        },
        undefined,
        signal,
      );
      signal.throwIfAborted();
      return bytes;
    }
    if (!file) throw new Error("Choose a firmware file.");
    setStatus("Reading local firmware…");
    const bytes = new Uint8Array(await file.arrayBuffer());
    signal.throwIfAborted();
    return bytes;
  }

  async function flash() {
    if (!usbSupported || busy || flashController.current) return;
    if (source === "release" && (!release || !proxyConfigured)) return;
    if (source === "local" && !file) return;
    if (
      source === "local" &&
      file &&
      (!file.name.toLowerCase().endsWith(".bin") ||
        file.size === 0 ||
        file.size > 65536)
    ) {
      setStatus("");
      setError("Choose a non-empty .bin file no larger than 64 KiB.");
      return;
    }
    if (route === "midi" && (!pad || pad.state !== "connected")) {
      setPads([]);
      setPadId("");
      setStatus("");
      setError(
        "The selected pad is disconnected. Find it again, or switch to the boot button.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const controller = new AbortController();
    flashController.current = controller;
    let rebootRequested = false;
    let isp: WchIspFlasher | undefined;
    let transport: WebUsbTransport | undefined;
    try {
      let bytes: Uint8Array;
      if (route === "midi" && pad) {
        setStatus(
          "Preparing firmware. Select the WCH bootloader when it appears…",
        );
        const prepared = await prepareMidiFlash(
          () => WebUsbTransport.request(),
          () => readFirmware(controller.signal),
          () => {
            controller.signal.throwIfAborted();
            setStatus(
              "Pad rebooting. Select the WCH bootloader in the USB chooser…",
            );
            try {
              if (pad.state !== "connected")
                throw new Error("The pad disconnected while preparing firmware");
              sendBootloader(pad);
              rebootRequested = true;
            } catch (reason) {
              throw new Error(
                `Could not reboot the selected pad: ${message(reason)}. Close the USB chooser and find the pad again.`,
                { cause: reason },
              );
            }
          },
          controller.signal,
        );
        transport = prepared.transport;
        bytes = prepared.firmware;
      } else {
        // WebUSB's chooser must be called directly from the click, before downloads.
        setStatus("Select the WCH USB bootloader device…");
        transport = await WebUsbTransport.request();
        controller.signal.throwIfAborted();
        bytes = await readFirmware(controller.signal);
      }
      controller.signal.throwIfAborted();
      isp = new WchIspFlasher(transport);
      const progress: Progress = (event) => {
        const label = PHASES[event.phase] ?? event.phase;
        setStatus(
          event.total > 0
            ? `${label}… ${Math.floor((event.done / event.total) * 100)}%`
            : `${label}…`,
        );
      };
      setStatus("Identifying chip…");
      const chip = await isp.connect(progress);
      controller.signal.throwIfAborted();
      if (chip.chipId !== 0x56 || chip.deviceType !== 0x23) {
        throw new Error(
          `Expected CH32X035G8U6 (0x5623), found ${chip.name}. Nothing was written.`,
        );
      }
      await isp.flash(bytes, {
        erase: true,
        verify: true,
        reset: true,
        progress,
      });
      setStatus(
        "Firmware verified and installed. The pad restarts and shows its version, then the game menu.",
      );
      setPads([]);
      setPadId("");
      setPadError("");
    } catch (reason) {
      if (controller.signal.aborted) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          console.warn(
            "Firmware flashing failed after leaving the page",
            reason,
          );
        }
        return;
      }
      const text = message(reason);
      if (rebootRequested) {
        setPads([]);
        setPadId("");
        setPadError(
          "The pad was asked to reboot. When it returns, find it again to retry, or use the boot button.",
        );
      }
      setError(
        route === "midi" &&
          reason instanceof DOMException &&
          reason.name === "SecurityError"
          ? "The browser blocked the USB chooser. Find the pad and press Flash again."
          : text,
      );
      setStatus("");
    } finally {
      controller.abort();
      try {
        if (isp) await isp.close();
        else await transport?.close();
      } catch (reason) {
        console.warn("Could not close WebUSB transport", reason);
      }
      if (flashController.current === controller)
        flashController.current = null;
      setBusy(false);
    }
  }

  const step =
    "border-line-soft grid gap-3 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[12rem_minmax(0,1fr)]";
  const stepHead = "text-[13px] font-semibold text-app";
  const stepNum = "font-display text-app mr-2 tabular-nums";
  const choice = (active: boolean) =>
    ` border px-3 py-2 text-[11px] ${active ? "border-app bg-app text-canvas" : "border-line text-app hover:bg-surface"}`;

  return (
    <section
      className="border-line-strong bg-canvas border p-6 text-xs leading-5"
      aria-label="Flash firmware"
    >
      <div className={step}>
        <h3 className={stepHead}>
          <span className={stepNum}>1</span>Reach the bootloader
        </h3>
        <div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="How to reach the bootloader"
          >
            <button
              type="button"
              aria-pressed={route === "midi"}
              disabled={busy}
              className={choice(route === "midi")}
              onClick={() => setRoute("midi")}
            >
              Over USB-MIDI
            </button>
            <button
              type="button"
              aria-pressed={route === "button"}
              disabled={busy}
              className={choice(route === "button")}
              onClick={() => setRoute("button")}
            >
              Boot button
            </button>
          </div>
          {route === "midi" ? (
            <div className="mt-4 space-y-3">
              <p className="text-muted max-w-prose">
                With firmware v2.0.2 or newer, plug the pad in and let it reach
                the game menu, or leave it in MIDI mode. Not during a game: the
                firmware listens for the reboot command in the menu and in MIDI
                mode. Use the boot button for older or unresponsive firmware.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy || finding}
                  onClick={() => void findPad()}
                  className="border-line-strong hover:bg-surface border px-3 py-2 text-[11px]"
                >
                  {finding
                    ? "Looking…"
                    : pads.length
                      ? "Look again"
                      : "Find pad"}
                </button>
                {pads.length > 1 ? (
                  <select
                    aria-label="Pad to flash"
                    value={pad?.id ?? ""}
                    disabled={busy}
                    onChange={(e) => setPadId(e.target.value)}
                    className="border-line bg-surface border p-2 text-[11px] text-app"
                  >
                    {pads.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.id.slice(-6)}
                      </option>
                    ))}
                  </select>
                ) : pad ? (
                  <span
                    className="text-success flex items-center gap-2"
                    role="status"
                  >
                    <span className="bg-success size-1.5" />
                    {pad.name} found
                  </span>
                ) : null}
              </div>
              {padError && (
                <p role="alert" className="text-danger">
                  {padError}
                </p>
              )}
            </div>
          ) : (
            <ol className="text-muted mt-4 list-inside list-decimal space-y-1">
              <li>Unplug the pad from USB.</li>
              <li>
                Hold the boot button on the board while plugging the cable back
                in, then release it.
              </li>
              <li>
                Use this route when the firmware does not run or the pad does
                not show up over MIDI.
              </li>
            </ol>
          )}
        </div>
      </div>

      <div className={step}>
        <h3 className={stepHead}>
          <span className={stepNum}>2</span>Choose firmware
        </h3>
        <div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Firmware source"
          >
            <button
              type="button"
              aria-pressed={source === "release"}
              disabled={busy}
              className={choice(source === "release")}
              onClick={() => setSource("release")}
            >
              Official release
            </button>
            <button
              type="button"
              aria-pressed={source === "local"}
              disabled={busy}
              className={choice(source === "local")}
              onClick={() => setSource("local")}
            >
              Local .bin file
            </button>
          </div>
          {source === "release" ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="firmware-release" className="text-muted">
                  Version
                </label>
                <button
                  type="button"
                  className="text-app underline underline-offset-2"
                  disabled={busy || loading}
                  onClick={() => {
                    setLoading(true);
                    setReload((n) => n + 1);
                  }}
                >
                  Refresh
                </button>
              </div>
              {loading ? (
                <p role="status" className="text-muted mt-2">
                  Loading releases…
                </p>
              ) : catalogError ? (
                <p role="alert" className="mt-2 text-danger">
                  {catalogError}
                </p>
              ) : releases.length === 0 ? (
                <p className="text-muted mt-2">
                  No published firmware releases found.
                </p>
              ) : (
                <select
                  id="firmware-release"
                  value={release?.assetId ?? ""}
                  disabled={busy}
                  onChange={(event) =>
                    setSelectedId(Number(event.target.value))
                  }
                  className="border-line bg-surface mt-2 w-full border p-2.5 text-app"
                >
                  {releases.map((item, i) => (
                    <option key={item.assetId} value={item.assetId}>
                      {item.tag}
                      {i === 0 ? " · latest" : ""} ·{" "}
                      {(item.size / 1024).toFixed(1)} KiB
                    </option>
                  ))}
                </select>
              )}
              {!proxyConfigured && (
                <p role="alert" className="mt-2 text-danger">
                  Firmware download proxy is not configured. Local files remain
                  available.
                </p>
              )}
              <p className="text-muted mt-2">
                Each download is checked against GitHub's size and SHA-256
                digest before writing.
              </p>
            </div>
          ) : (
            <label className="mt-4 block">
              <span className="text-muted">
                Firmware file (stays in your browser)
              </span>
              <input
                type="file"
                accept=".bin,application/octet-stream"
                disabled={busy}
                className="border-line bg-surface mt-2 block w-full border p-2.5 text-app file:mr-3 file:border-0 file:bg-transparent file:text-app"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>

      <div className={step}>
        <h3 className={stepHead}>
          <span className={stepNum}>3</span>Flash and verify
        </h3>
        <div>
          <p className="text-muted max-w-prose">
            {route === "midi"
              ? "The USB chooser opens immediately. Once the firmware is ready, the pad reboots; select the WCH bootloader as soon as it appears. If it does not appear, close the chooser to check for errors and retry."
              : "Chrome asks which USB device to use: pick the WCH bootloader."}{" "}
            The chooser appears on every flash. The chip is checked for
            CH32X035G8U6 before writing, and the flash is verified afterwards.
            This identifies the chip, not the board: unplug other CH32 boards
            before flashing.
          </p>
          {!usbSupported && (
            <p role="alert" className="mt-3 text-danger">
              WebUSB is unavailable in this browser. Use Chrome or Edge on HTTPS
              or localhost.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void flash()}
              disabled={
                busy ||
                !usbSupported ||
                (source === "release" ? !release || !proxyConfigured : !file) ||
                (route === "midi" && !pad)
              }
              className="bg-app text-canvas hover:bg-app/85 px-5 py-3 text-xs font-bold"
            >
              {busy ? "Flashing…" : "Flash firmware"}
            </button>
            <span className="text-nav text-[11px]">
              On Windows the bootloader may need a WinUSB driver.
            </span>
          </div>
          {status && (
            <p role="status" className="text-success mt-4">
              {status}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
