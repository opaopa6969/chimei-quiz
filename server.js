#!/usr/bin/env node
// 本番配信用の最小静的サーバ（`npm run build` で作った dist/ を配信）。外部依存なし。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT ?? 8094);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function resolveFile(urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(DIST_DIR, safePath);
  let isFallback = false;
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      isFallback = true;
    }
  } catch {
    filePath = path.join(DIST_DIR, "index.html"); // SPAフォールバック
    isFallback = true;
  }
  return { filePath, isFallback };
}

// キャッシュ方針: デプロイ後に古いJS/データが残り続ける事故があったため明示する。
// - index.html（SPAフォールバック含む）: no-cache（毎回サーバーに再検証させる。
//   参照するJSのファイル名がここに書かれているので、これが古いと更新が反映されない）
// - /assets/*（Viteがcontent hashをファイル名に埋め込む。内容が変われば別名になるので長期キャッシュ可）
// - それ以外（/data/quiz/*.json 等、ハッシュ無しファイル名で内容が更新されうるもの）: no-cache
function cacheControlFor(urlPath, isFallback) {
  if (isFallback || urlPath === "/" || urlPath.endsWith(".html")) return "no-cache";
  if (urlPath.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  return "no-cache";
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-cache" });
    res.end("ok");
    return;
  }

  try {
    const { filePath, isFallback } = await resolveFile(url.pathname);
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": cacheControlFor(url.pathname, isFallback),
    });
    res.end(body);
  } catch (err) {
    res.writeHead(404, { "content-type": "text/plain", "cache-control": "no-cache" });
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`chimei-quiz listening on http://localhost:${PORT}`);
  console.log(`(dist/ が無ければ先に \`npm run build\` してください)`);
});
