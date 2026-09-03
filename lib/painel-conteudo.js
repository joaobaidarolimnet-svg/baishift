/* Rotas de conteúdo do painel: ler, pré-visualizar, enviar imagem, publicar, histórico. */
"use strict";
const path = require("node:path");
const { rota, Erro, json } = require("./painel");
const conteudo = require("./conteudo");
const render = require("./render");
const imagens = require("./imagens");
const dados = require("./dados");
const { publicar } = require("./publicar");
const metricas = require("./metricas");

const RAIZ = path.join(__dirname, "..");

rota("GET", "conteudo", {}, ({ res }) => {
  const c = conteudo.carregar();
  json(res, 200, { conteudo: c, atualizadoEm: c.atualizadoEm, limites: conteudo.LIMITES });
});

/* chega por <form method="post" target="_blank"> (urlencoded): conteudo=<json>&pagina=inicio|produto:<slug> */
rota("POST", "previa", { semCabecalho: true }, async ({ res, lerCorpo }) => {
  const f = new URLSearchParams((await lerCorpo(2 * 1024 * 1024)).toString("utf8"));
  let obj; try { obj = JSON.parse(f.get("conteudo") || ""); } catch { throw new Erro(400, "rascunho inválido"); }
  const c = conteudo.validar(obj);
  const pagina = f.get("pagina") || "inicio";
  let html;
  if (pagina === "inicio") html = render.paginaInicio(c, { previa: true });
  else {
    const p = c.produtos.find(x => x.slug === pagina.replace(/^produto:/, ""));
    if (!p) throw new Erro(404, "produto não encontrado no rascunho");
    html = render.paginaProduto(p, c, { previa: true });
  }
  const corpo = Buffer.from(html);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": corpo.length, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Frame-Options": "SAMEORIGIN" });
  res.end(corpo);
});

/* corpo = bytes da imagem; cabeçalho X-Contexto diz onde ela vai (vira parte do nome final) */
rota("POST", "imagens", {}, async ({ req, res, lerCorpo }) => {
  const buf = await lerCorpo(imagens.LIMITE + 512 * 1024);
  if (!buf.length) throw new Erro(400, "envie o arquivo da imagem no corpo do pedido");
  let p;
  try { p = imagens.guardarPendente(buf, String(req.headers["x-contexto"] || "imagem")); } catch (e) { throw new Erro(400, e.message); }
  json(res, 201, { ref: p.ref, id: p.id, ext: p.ext, bytes: p.bytes });
});

rota("GET", "pendentes/:id", {}, ({ res, params }) => {
  const p = imagens.lerPendente(params.id);
  if (!p) throw new Erro(404, "imagem pendente não encontrada");
  res.writeHead(200, { "Content-Type": imagens.MIME[p.ext], "Content-Length": p.buf.length, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
  res.end(p.buf);
});

rota("POST", "publicar", {}, async ({ res, usuario, lerJson }) => {
  const b = await lerJson();
  json(res, 200, await publicar({ conteudo: b.conteudo, baseadoEm: b.baseadoEm, forcar: !!b.forcar }, { usuario, raiz: RAIZ }));
});

rota("GET", "publicacoes", {}, ({ res }) => json(res, 200, { publicacoes: dados.lerJson("publicacoes.json", []).slice(0, 20) }));

rota("GET", "metricas", {}, ({ req, res }) => {
  const periodo = new URL(req.url, "http://x").searchParams.get("periodo");
  const c = conteudo.carregar();
  json(res, 200, metricas.resumo(periodo, { produtos: c.produtos.map(p => ({ slug: p.slug, nome: p.nome })) }));
});
