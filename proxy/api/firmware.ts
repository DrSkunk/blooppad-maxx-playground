const ASSET_API = "https://api.github.com/repos/phyx-be/BLOOPPAD-MAXX/releases/assets/";
const ALLOWED_ORIGINS = new Set([
  "https://drskunk.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request: Request): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function errorResponse(request: Request, status: number, message: string): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(message, { status, headers });
}

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse(request, 403, "Origin is not allowed.");
  const id = new URL(request.url).searchParams.get("asset");
  if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return errorResponse(request, 400, "Invalid firmware asset ID.");
  }

  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "blooppad-maxx-playground",
  });
  try {
    const metadata = await fetch(`${ASSET_API}${id}`, { headers });
    if (!metadata.ok) return errorResponse(request, 502, `GitHub asset lookup failed (HTTP ${metadata.status}).`);
    const asset: unknown = await metadata.json();
    if (
      typeof asset !== "object" || asset === null ||
      !("id" in asset) || asset.id !== Number(id) ||
      !("name" in asset) || asset.name !== "firmware.bin" ||
      !("state" in asset) || asset.state !== "uploaded" ||
      !("size" in asset) || !Number.isSafeInteger(asset.size) || Number(asset.size) <= 0 || Number(asset.size) > 65536 ||
      !("digest" in asset) || typeof asset.digest !== "string" || !/^sha256:[a-f\d]{64}$/i.test(asset.digest)
    ) return errorResponse(request, 404, "Firmware asset was not found.");

    const binaryHeaders = new Headers(headers);
    binaryHeaders.set("Accept", "application/octet-stream");
    const binary = await fetch(`${ASSET_API}${id}`, { headers: binaryHeaders });
    if (!binary.ok || !binary.body || !binary.headers.get("content-type")?.startsWith("application/octet-stream")) {
      return errorResponse(request, 502, "GitHub firmware download failed.");
    }
    const responseHeaders = corsHeaders(request);
    responseHeaders.set("Content-Type", "application/octet-stream");
    responseHeaders.set("Content-Length", String(asset.size));
    responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return new Response(binary.body, { status: 200, headers: responseHeaders });
  } catch {
    return errorResponse(request, 502, "GitHub firmware service is unavailable.");
  }
}

export function OPTIONS(request: Request): Response {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse(request, 403, "Origin is not allowed.");
  const headers = corsHeaders(request);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return new Response(null, { status: 204, headers });
}
