import assert from "node:assert/strict";
import { test } from "node:test";
import { GET, OPTIONS } from "../proxy/api/firmware.ts";
import { downloadFirmware, parseReleases, verifyFirmware } from "../src/lib/firmware.ts";

const firmware = new Uint8Array([1, 2, 3]);
const sha256 = "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
const asset = { id: 42, name: "firmware.bin", state: "uploaded", size: 3, digest: `sha256:${sha256}` };
const release = { tag_name: "v1.0.2", published_at: "2026-08-28T18:55:18Z", draft: false, prerelease: false, assets: [asset] };
const selected = { tag: "v1.0.2", publishedAt: release.published_at, assetId: 42, size: 3, sha256 };

test("selects published firmware assets and verifies downloaded bytes", async (t) => {
  assert.deepEqual(parseReleases([
    { ...release, tag_name: "draft", draft: true },
    { ...release, tag_name: "prerelease", prerelease: true },
    { ...release, tag_name: "other", assets: [{ ...asset, name: "other.bin" }] },
    release,
  ]), [selected]);
  await verifyFirmware(firmware, selected);
  await assert.rejects(verifyFirmware(new Uint8Array([1, 2, 4]), selected), /checksum/);

  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(firmware);
  const progress: number[] = [];
  assert.deepEqual(await downloadFirmware(selected, (value) => progress.push(value), "https://proxy.example"), firmware);
  assert.equal(progress.at(-1), 100);
  globalThis.fetch = async () => new Response(new Uint8Array([1, 2]));
  await assert.rejects(downloadFirmware(selected, () => {}, "https://proxy.example"), /incomplete/);
});

test("proxy only serves a scoped firmware asset and sends browser CORS headers", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    const accept = new Headers(init?.headers).get("Accept");
    return accept === "application/octet-stream"
      ? new Response(firmware, { headers: { "Content-Type": "application/octet-stream" } })
      : Response.json(asset);
  };
  const request = new Request("https://proxy.example/api/firmware?asset=42", { headers: { Origin: "https://drskunk.github.io" } });
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://drskunk.github.io");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), firmware);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url === "https://api.github.com/repos/phyx-be/BLOOPPAD-MAXX/releases/assets/42"));

  const preflight = OPTIONS(request);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
  const invalid = await GET(new Request("https://proxy.example/api/firmware?asset=https://evil.example"));
  assert.equal(invalid.status, 400);
  const foreignOrigin = await GET(new Request("https://proxy.example/api/firmware?asset=42", { headers: { Origin: "https://evil.example" } }));
  assert.equal(foreignOrigin.status, 403);
  assert.equal(calls.length, 2);
});

test("proxy rejects an asset that is not the official firmware binary", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ ...asset, name: "other.bin" });
  const response = await GET(new Request("https://proxy.example/api/firmware?asset=42"));
  assert.equal(response.status, 404);
});
