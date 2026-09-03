/* Servidor estático do site da Baishift.
   Sem dependências — usa só o que vem no Node. O Railway injeta a porta em PORT. */
"use strict";

const http   = require("node:http");
const fs     = require("node:fs");
const path   = require("node:path");
const crypto = require("node:crypto");


const RAIZ = __dirname;
const PORTA = process.env.PORT || 3000;

/* o site é gerado do conteudo/site.json antes de atender: o HTML no disco é sempre o do JSON */
const { carregar } = require("./lib/conteudo");
const { gerarTudo } = require("./lib/render");
try {
  const r = gerarTudo(carregar(), RAIZ);
  console.log("conteúdo gerado: " + r.escritos.length + " arquivos" + (r.removidos.length ? ", " + r.removidos.length + " removidos" : ""));
} catch (e) {
  console.error("conteúdo inválido, o servidor não vai subir: " + e.message);
  process.exit(1);
}

/* Versão dos assets pelo conteúdo: o HTML sai com "site.css?v=<hash>" (e o mesmo para as logos,
   favicon e imagem de compartilhamento), então toda publicação força o navegador a baixar o
   arquivo novo, e o arquivo em si pode ficar em cache por um ano. */
const VERSAO = {};
["assets/css/site.css", "assets/js/site.js",
 "assets/marca/01-logo/baishift-principal.svg", "assets/marca/01-logo/baishift-branco.svg",
 "assets/img/favicon.svg", "assets/img/favicon-32.png", "assets/img/icon-180.png", "assets/img/og.png", "favicon.ico"].forEach(f => {
  try { VERSAO[f] = crypto.createHash("sha1").update(fs.readFileSync(path.join(RAIZ, f))).digest("hex").slice(0, 10); }
  catch { /* sem o arquivo, a URL fica sem versão */ }
});
function versionar(html) {
  for (const f in VERSAO) html = html.split(f + '"').join(f + "?v=" + VERSAO[f] + '"');
  return html;
}

/* arquivos do projeto que não fazem parte do site e não devem ser servidos */
const FORA = new Set(["server.js", "package.json", "package-lock.json", "readme.md"]);
const PASTAS_FORA = new Set(["tools", "dist", "node_modules", "lib", "templates", "gestor", "test", "docs", "dados"]);
const CAMINHOS_FORA = new Set(["conteudo/site.json"]);

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

/* html sempre revalidado; css/js com URL versionada podem ficar um ano;
   o resto (imagens, manifesto) por um dia */
function cache(ext, versionado) {
  if (ext === ".html") return "no-cache";
  if (versionado) return "public, max-age=31536000, immutable";
  if (ext === ".xml" || ext === ".txt" || ext === ".webmanifest") return "public, max-age=3600";
  return "public, max-age=86400";
}

function cabecalhos(ext, tamanho, etag, versionado) {
  return {
    "Content-Type": TIPOS[ext] || "application/octet-stream",
    "Content-Length": tamanho,
    "Cache-Control": cache(ext, versionado),
    "ETag": etag,
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
  if (CAMINHOS_FORA.has(trechos.join("/"))) return null;

  return destino;
}

/* URLs limpas: /a/b/c encontra a/b/c.html ou a/b/c/index.html.
   Assim um endereço sem extensão e sem barra no fim funciona. */
function arquivoReal(destino) {
  const tentativas = [destino];
  if (!path.extname(destino)) {
    tentativas.push(destino + ".html", path.join(destino, "index.html"));
  }
  for (const t of tentativas) {
    try {
      if (fs.statSync(t).isFile()) return t;
    } catch { /* segue para a próxima tentativa */ }
  }
  return null;
}

function etagDe(info, extra) {
  return 'W/"' + info.size.toString(16) + "-" + Math.floor(info.mtimeMs).toString(16) + (extra ? "-" + extra : "") + '"';
}

function enviar(req, res, base, status) {
  const arquivo = arquivoReal(base);
  if (!arquivo) return responder404(req, res);
  let info;
  try {
    info = fs.statSync(arquivo);
  } catch {
    return responder404(req, res);
  }
  const ext = path.extname(arquivo).toLowerCase();
  const rel = path.relative(RAIZ, arquivo).split(path.sep).join("/");
  const versionado = rel in VERSAO || rel.startsWith("conteudo/imagens/");

  /* html é pequeno: passa pela memória para receber as URLs versionadas */
  if (ext === ".html") {
    const corpo = Buffer.from(versionar(fs.readFileSync(arquivo, "utf8")));
    const etag = etagDe(info, Object.values(VERSAO).join(""));
    if (req.headers["if-none-match"] === etag) { res.writeHead(304); return res.end(); }
    res.writeHead(status, cabecalhos(ext, corpo.length, etag, false));
    return req.method === "HEAD" ? res.end() : res.end(corpo);
  }

  const etag = etagDe(info);
  if (req.headers["if-none-match"] === etag) { res.writeHead(304); return res.end(); }
  res.writeHead(status, cabecalhos(ext, info.size, etag, versionado));
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(arquivo).pipe(res);
}

function responder404(req, res) {
  const pagina = path.join(RAIZ, "404.html");
  if (fs.existsSync(pagina)) {
    const corpo = Buffer.from(versionar(fs.readFileSync(pagina, "utf8")));
    res.writeHead(404, cabecalhos(".html", corpo.length, 'W/"404"', false));
    return req.method === "HEAD" ? res.end() : res.end(corpo);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404");
}

/* Endereço oficial: qualquer outro host (o .up.railway.app, a raiz sem www) e o http
   puro redirecionam de forma permanente para https://www.baishift.com.br */
const HOST_OFICIAL = "www.baishift.com.br";
function redirecionar(req, res) {
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const local = host === "localhost" || /^127\./.test(host) || /^192\.168\./.test(host) || host === "";
  if (local) return false;
  if (host === HOST_OFICIAL && proto === "https") return false;
  res.writeHead(301, { "Location": "https://" + HOST_OFICIAL + req.url, "Cache-Control": "public, max-age=3600" });
  res.end();
  return true;
}

const servidor = http.createServer((req, res) => {
  if (redirecionar(req, res)) return;
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
