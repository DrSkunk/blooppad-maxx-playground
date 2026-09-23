const RELEASES_URL =
  "https://api.github.com/repos/phyx-be/BLOOPPAD-MAXX/releases";

export interface FirmwareRelease {
  tag: string;
  publishedAt: string;
  assetId: number;
  size: number;
  sha256: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseReleases(value: unknown): FirmwareRelease[] {
  if (!Array.isArray(value)) throw new Error("Invalid GitHub release response.");
  return value.flatMap((release) => {
    if (
      !record(release) ||
      release.draft !== false ||
      release.prerelease !== false ||
      typeof release.tag_name !== "string" ||
      typeof release.published_at !== "string" ||
      !Array.isArray(release.assets)
    ) return [];
    const asset = release.assets.find(
      (item: unknown) => record(item) && item.name === "firmware.bin" && item.state === "uploaded",
    );
    if (
      !record(asset) ||
      !Number.isSafeInteger(asset.id) ||
      Number(asset.id) <= 0 ||
      !Number.isSafeInteger(asset.size) ||
      Number(asset.size) <= 0 ||
      Number(asset.size) > 65536 ||
      typeof asset.digest !== "string" ||
      !/^sha256:[a-f\d]{64}$/i.test(asset.digest)
    ) return [];
    return [{
      tag: release.tag_name,
      publishedAt: release.published_at,
      assetId: Number(asset.id),
      size: Number(asset.size),
      sha256: asset.digest.slice(7).toLowerCase(),
    }];
  }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function fetchReleases(): Promise<FirmwareRelease[]> {
  const releases: FirmwareRelease[] = [];
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`${RELEASES_URL}?per_page=100&page=${page}`);
    if (!response.ok) throw new Error(`Could not load firmware releases (HTTP ${response.status}).`);
    const value: unknown = await response.json();
    if (!Array.isArray(value)) throw new Error("Invalid GitHub release response.");
    releases.push(...parseReleases(value));
    if (value.length < 100) break;
  }
  return releases;
}

export async function verifyFirmware(bytes: Uint8Array, release: FirmwareRelease): Promise<void> {
  if (bytes.byteLength !== release.size) throw new Error("Firmware size does not match the GitHub release.");
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== release.sha256) throw new Error("Firmware checksum does not match the GitHub release.");
}

export async function downloadFirmware(
  release: FirmwareRelease,
  onProgress: (percent: number) => void,
  proxyOrigin = import.meta.env.VITE_FIRMWARE_PROXY_ORIGIN,
): Promise<Uint8Array> {
  const origin = proxyOrigin?.replace(/\/$/, "");
  if (!origin) throw new Error("Firmware download proxy is not configured.");
  const response = await fetch(`${origin}/api/firmware?asset=${release.assetId}`);
  if (!response.ok) throw new Error(`Firmware download failed (HTTP ${response.status}).`);
  const bytes = new Uint8Array(release.size);
  let received = 0;
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.length > release.size) throw new Error("Firmware exceeds the release size.");
      bytes.set(value, received);
      received += value.length;
      onProgress(Math.floor((received / release.size) * 100));
    }
  } else {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > release.size) throw new Error("Firmware exceeds the release size.");
    bytes.set(new Uint8Array(buffer));
    received = buffer.byteLength;
  }
  if (received !== release.size) throw new Error("Firmware download is incomplete.");
  await verifyFirmware(bytes, release);
  onProgress(100);
  return bytes;
}
