const RELEASES_API = "https://api.github.com/repos/phyx-be/BLOOPPAD-MAXX/releases";
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
  headers.set("Cache-Control", "no-store");
  return new Response(message, { status, headers });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps only the fields the flasher reads, so the cached payload stays small. */
function trimRelease(release: unknown): unknown {
  if (!record(release)) return null;
  return {
    tag_name: release.tag_name,
    published_at: release.published_at,
    draft: release.draft,
    prerelease: release.prerelease,
    assets: Array.isArray(release.assets)
      ? release.assets.filter(record).map((asset) => ({
        id: asset.id,
        name: asset.name,
        state: asset.state,
        size: asset.size,
        digest: asset.digest,
      }))
      : [],
  };
}

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse(request, 403, "Origin is not allowed.");

  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "blooppad-maxx-playground",
  });
  // Read via globalThis so the proxy type-checks without @types/node on Vercel.
  const token = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.GITHUB_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const releases: unknown[] = [];
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(`${RELEASES_API}?per_page=100&page=${page}`, { headers });
      if (!response.ok) return errorResponse(request, 502, `GitHub release lookup failed (HTTP ${response.status}).`);
      const value: unknown = await response.json();
      if (!Array.isArray(value)) return errorResponse(request, 502, "Invalid GitHub release response.");
      releases.push(...value.map(trimRelease));
      if (value.length < 100) break;
    }
    const responseHeaders = corsHeaders(request);
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
    // Vercel's CDN absorbs repeat visitors so GitHub sees roughly one call per cache window.
    responseHeaders.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");
    return new Response(JSON.stringify(releases), { status: 200, headers: responseHeaders });
  } catch {
    return errorResponse(request, 502, "GitHub release service is unavailable.");
  }
}

export function OPTIONS(request: Request): Response {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return errorResponse(request, 403, "Origin is not allowed.");
  const headers = corsHeaders(request);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return new Response(null, { status: 204, headers });
}
