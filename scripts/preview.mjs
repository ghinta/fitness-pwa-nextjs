import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const port = 4187;
const basePath = "/fitness-pwa-nextjs";
const outputRoot = resolve("out");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (!url.pathname.startsWith(basePath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relative = decodeURIComponent(
      url.pathname.slice(basePath.length),
    ).replace(/^\/+/, "");
    let filename = resolve(outputRoot, relative);
    if (
      filename !== outputRoot &&
      !filename.startsWith(`${outputRoot}${sep}`)
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const fileStat = await stat(filename);
    if (fileStat.isDirectory()) filename = resolve(filename, "index.html");
    const headers = {
      "Content-Type":
        contentTypes[extname(filename)] ?? "application/octet-stream",
      "Cache-Control": filename.endsWith("sw.js") ? "no-store" : "no-cache",
    };
    response.writeHead(200, headers);
    if (request.method === "HEAD") response.end();
    else createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Static preview: http://127.0.0.1:${port}${basePath}/`);
});
