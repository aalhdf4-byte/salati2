const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, clean === "/" ? "eid-adha.html" : clean.replace(/^\/+/, ""));
  return resolved.startsWith(root) ? resolved : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/save-poster") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const requestedName = String(req.headers["x-file-name"] || `salati-eid-adha-${Date.now()}.png`);
      const fileName = requestedName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      const exportsDir = path.join(root, "exports");
      fs.mkdirSync(exportsDir, { recursive: true });
      const filePath = path.join(exportsDir, fileName);
      fs.writeFileSync(filePath, body);
      send(res, 200, JSON.stringify({ url: `/exports/${fileName}`, size: body.length }), {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
    });
    return;
  }

  const filePath = safePath(req.url);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    };
    if (filePath.includes(`${path.sep}exports${path.sep}`) && ext === ".png") {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;
    }
    send(res, 200, data, headers);
  });
});

server.listen(port, host, () => {
  console.log(`http://${host}:${port}/eid-adha.html`);
});
