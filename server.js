/* Servidor estático do site da Baishift.
   Sem dependências — usa só o que vem no Node. O Railway injeta a porta em PORT. */
"use strict";

const http = require("node:http");
const fs   = require("node:fs");
const path = require("node:path");


const RAIZ = __dirname;
const PORTA = process.env.PORT || 3000;

/* arquivos do projeto que não fazem parte do site e não devem ser servidos */
const FORA = new Set(["server.js", "package.json", "package-lock.json", "readme.md"]);
const PASTAS_FORA = new Set(["tools", "dist", "node_modules"]);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico":  "image/vnd.microsoft.icon",
  ".webp": "image/webp",
  ".woff2":"font/woff2",
  ".xml":  "application/xml; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".md":   "text/plain; charset=utf-8"
};

/* imagens e folhas de estilo podem ficar muito tempo em cache;
   o html precisa ser revalidado para que uma publicação nova apareça logo */
function cache(ext) {
  if (ext === ".html") return "public, max-age=0, must-revalidate";
  if (ext === ".xml" || ext === ".txt" || ext === ".webmanifest") return "public, max-age=3600";
  return "public, max-age=86400";
}

function cabecalhos(ext, tamanho) {
  return {
    "Content-Type": TIPOS[ext] || "application/octet-stream",
    "Content-Length": tamanho,
    "Cache-Control": cache(ext),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };
}

/* Resolve o caminho pedido para dentro da pasta do site.
   Barra "../" (inclusive percent-encoded) e qualquer trecho oculto — .git/config
   precisa ser negado, e não só um arquivo cujo nome comece com ponto. */
function resolver(pedido) {
  let caminho;
  try {
    /* a decodificação vem antes de normalizar: %2e%2e vira ".." e é neutralizado depois */
    caminho = decodeURIComponent(new URL(pedido, "http://localhost").pathname);
  } catch {
    return null;
  }
  if (caminho.endsWith("/")) caminho += "index.html";

  const destino = path.resolve(RAIZ, "." + path.normalize(caminho));
  if (destino !== RAIZ && !destino.startsWith(RAIZ + path.sep)) return null;

  const trechos = path.relative(RAIZ, destino).split(path.sep);
  if (trechos.some(t => t.startsWith("."))) return null;
  if (PASTAS_FORA.has(trechos[0])) return null;
  if (trechos.length === 1 && FORA.has(trechos[0].toLowerCase())) return null;

  return destino;
}

function enviar(req, res, arquivo, status) {
  let info;
  try {
    info = fs.statSync(arquivo);
    if (info.isDirectory()) return responder404(req, res);
  } catch {
    return responder404(req, res);
  }
  res.writeHead(status, cabecalhos(path.extname(arquivo).toLowerCase(), info.size));
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(arquivo).pipe(res);
}

function responder404(req, res) {
  const pagina = path.join(RAIZ, "404.html");
  if (fs.existsSync(pagina)) {
    const info = fs.statSync(pagina);
    res.writeHead(404, cabecalhos(".html", info.size));
    if (req.method === "HEAD") return res.end();
    return fs.createReadStream(pagina).pipe(res);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404");
}

const servidor = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Allow": "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Método não permitido");
  }
  const arquivo = resolver(req.url);
  if (!arquivo) return responder404(req, res);
  enviar(req, res, arquivo, 200);
});

servidor.listen(PORTA, () => {
  console.log("Site da Baishift no ar na porta " + PORTA);
});

/* o Railway encerra o processo com SIGTERM ao publicar uma versão nova */
process.on("SIGTERM", () => servidor.close(() => process.exit(0)));
