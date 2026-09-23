import { useEffect, useState } from "react";
import { WebUsbTransport, WchIspFlasher, type Progress } from "wchisp-web";
import { downloadFirmware, fetchReleases, type FirmwareRelease } from "../lib/firmware";

const PHASES: Record<string, string> = {
  identify: "Identifying chip",
  "read-config": "Reading chip configuration",
  erase: "Erasing flash",
  write: "Writing firmware",
  verify: "Verifying firmware",
  reset: "Restarting device",
};

function message(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotFoundError") return "No USB device was selected.";
  return error instanceof Error ? error.message : String(error);
}

export function FirmwareFlasher({ onClose }: { onClose: () => void }) {
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
  const usbSupported = typeof navigator !== "undefined" && Boolean(navigator.usb);
  const proxyConfigured = Boolean(import.meta.env.VITE_FIRMWARE_PROXY_ORIGIN);
  const release = releases.find((item) => item.assetId === selectedId) ?? releases[0];

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
    return () => { active = false; };
  }, [reload]);

  async function flash() {
    if (!usbSupported || busy) return;
    if (source === "release" && (!release || !proxyConfigured)) return;
    if (source === "local" && !file) return;
    if (source === "local" && file && (!file.name.toLowerCase().endsWith(".bin") || file.size === 0 || file.size > 65536)) {
      setError("Choose a non-empty .bin file no larger than 64 KiB.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Select the WCH USB bootloader device…");
    let isp: WchIspFlasher | undefined;
    let transport: WebUsbTransport | undefined;
    try {
      // WebUSB's chooser must be called directly from the click, before downloads.
      transport = await WebUsbTransport.request();
      isp = new WchIspFlasher(transport);
      let bytes: Uint8Array;
      if (source === "release" && release) {
        setStatus("Downloading firmware… 0%");
        bytes = await downloadFirmware(release, (percent) => setStatus(`Downloading firmware… ${percent}%`));
      } else if (file) {
        setStatus("Reading local firmware…");
        bytes = new Uint8Array(await file.arrayBuffer());
      } else return;

      const progress: Progress = (event) => {
        const label = PHASES[event.phase] ?? event.phase;
        setStatus(event.total > 0 ? `${label}… ${Math.floor(event.done / event.total * 100)}%` : `${label}…`);
      };
      setStatus("Identifying chip…");
      const chip = await isp.connect(progress);
      if (chip.chipId !== 0x56 || chip.deviceType !== 0x23) {
        throw new Error(`Expected CH32X035G8U6 (0x5623), found ${chip.name}. Nothing was written.`);
      }
      await isp.flash(bytes, { erase: true, verify: true, reset: true, progress });
      setStatus("Firmware verified and installed. Reconnect the pad normally to use MIDI.");
    } catch (reason) {
      setError(message(reason));
      setStatus("");
    } finally {
      try {
        if (isp) await isp.close();
        else await transport?.close();
      } catch (reason) {
        console.warn("Could not close WebUSB transport", reason);
      }
      setBusy(false);
    }
  }

  return (
    <section className="border-device bg-device-bg mb-5 rounded-xl border p-5 text-xs" aria-label="Flash firmware">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Flash BLOOPPAD-MAXX firmware</h2>
          <p className="text-muted mt-1">CH32X035G8U6 · WCH USB bootloader</p>
        </div>
        <button type="button" className="border-line rounded-md border px-3 py-1.5" onClick={onClose} disabled={busy}>Close</button>
      </div>

      <ol className="text-muted mt-4 list-inside list-decimal space-y-1 leading-5">
        <li>Unplug the pad from USB.</li>
        <li>Hold the boot button on the board while plugging the USB cable back in, then release it.</li>
        <li>Choose firmware below and press Flash. Select the WCH bootloader in the USB chooser.</li>
      </ol>
      <p className="text-nav mt-2">Use a Chromium browser on HTTPS or localhost. On Windows, the WCH bootloader may need a WinUSB driver.</p>

      <div className="mt-5 flex gap-2" role="group" aria-label="Firmware source">
        <button type="button" aria-pressed={source === "release"} disabled={busy}
          className={`rounded-md border px-3 py-2 ${source === "release" ? "border-lavender text-lavender-text" : "border-line"}`}
          onClick={() => setSource("release")}>Official release</button>
        <button type="button" aria-pressed={source === "local"} disabled={busy}
          className={`rounded-md border px-3 py-2 ${source === "local" ? "border-lavender text-lavender-text" : "border-line"}`}
          onClick={() => setSource("local")}>Local .bin file</button>
      </div>

      {source === "release" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="firmware-release">Firmware version</label>
            <button type="button" className="text-lavender-text underline" disabled={busy || loading}
              onClick={() => { setLoading(true); setReload((n) => n + 1); }}>Refresh releases</button>
          </div>
          {loading ? <p role="status" className="text-muted mt-2">Loading releases…</p> : catalogError ? (
            <p role="alert" className="mt-2 text-red-300">{catalogError}</p>
          ) : releases.length === 0 ? <p className="text-muted mt-2">No published firmware releases found.</p> : (
            <select id="firmware-release" value={release?.assetId ?? ""} disabled={busy}
              onChange={(event) => setSelectedId(Number(event.target.value))}
              className="border-line bg-surface mt-2 w-full rounded-md border p-2.5 text-white">
              {releases.map((item) => <option key={item.assetId} value={item.assetId}>{item.tag} · {(item.size / 1024).toFixed(1)} KiB</option>)}
            </select>
          )}
          {!proxyConfigured && <p role="alert" className="mt-2 text-red-300">Firmware download proxy is not configured. Local files remain available.</p>}
        </div>
      ) : (
        <label className="mt-4 block">
          <span>Firmware file</span>
          <input type="file" accept=".bin,application/octet-stream" disabled={busy}
            className="border-line bg-surface mt-2 block w-full rounded-md border p-2.5 text-white file:text-lavender-text"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
      )}

      {!usbSupported && <p role="alert" className="mt-4 text-red-300">WebUSB is unavailable in this browser. Use Chrome or Edge on HTTPS or localhost.</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <a className="text-lavender-text underline" href="https://github.com/phyx-be/BLOOPPAD-MAXX/releases" target="_blank" rel="noreferrer">View official releases ↗</a>
        <button type="button" onClick={() => void flash()} disabled={busy || !usbSupported || (source === "release" ? !release || !proxyConfigured : !file)}
          className="bg-lavender text-canvas rounded-md px-4 py-2.5 font-semibold">{busy ? "Flashing…" : "Flash firmware"}</button>
      </div>
      {status && <p role="status" className="text-success mt-4">{status}</p>}
      {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
    </section>
  );
}
