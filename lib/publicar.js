/* Publicar: valida o rascunho, materializa as imagens pendentes, gera as páginas, commita no GitHub (quando há token)
   e só então grava tudo localmente. Sem token: modo local (grava nos arquivos; o gestor faz o commit) — exceto no
   Railway, onde o que fosse gravado sumiria no próximo deploy. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const conteudo = require("./conteudo");
const render = require("./render");
const imagens = require("./imagens");
const github = require("./github");
const dados = require("./dados");

const REPO_PADRAO = "joaobaidarolimnet-svg/baishift";

class ErroPublicar extends Error {
  constructor(status, mensagem, extra) { super(mensagem); this.name = "ErroPublicar"; this.status = status; Object.assign(this, extra || {}); }
}

const NOMES = { site: "site", inicio: "início", diagnostico: "diagnóstico", processos: "processos", dashboard: "dashboard", modelos: "modelos", perfil: "serve / não serve", faq: "FAQ", contato: "contato" };
function resumo(antes, depois) {
  const partes = [];
  for (const k in NOMES) if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) partes.push(NOMES[k]);
  const pa = new Map((antes.produtos || []).map(p => [p.slug, p])), pd = new Map((depois.produtos || []).map(p => [p.slug, p]));
  const prods = [];
  for (const [slug, p] of pd) { const a = pa.get(slug); if (!a) prods.push(slug + " (novo)"); else if (JSON.stringify(a) !== JSON.stringify(p)) prods.push(slug); }
  for (const slug of pa.keys()) if (!pd.has(slug)) prods.push(slug + " (removido)");
  if (prods.length) partes.push("produtos: " + prods.join(", "));
  return partes.length ? partes.join(" · ") : "sem mudança de conteúdo";
}

/* pedido: { conteudo, baseadoEm, forcar } · o: { usuario, raiz, env, fetchFn, agora } */
async function publicar(pedido, o) {
  const raiz = o.raiz, env = o.env || process.env, agora = o.agora || new Date();
  const atual = conteudo.carregar(path.join(raiz, "conteudo", "site.json"));
  if (!pedido.forcar && pedido.baseadoEm !== undefined && pedido.baseadoEm !== atual.atualizadoEm) {
    throw new ErroPublicar(409, "o site foi publicado depois que você começou a editar", { conflito: true, atualizadoEm: atual.atualizadoEm });
  }
  const c = conteudo.validar(pedido.conteudo);

  /* imagens: pendentes ganham nome final; publicadas precisam existir */
  const mapa = {}, novasImagens = [], usados = [];
  for (const ref of conteudo.imagensReferenciadas(c)) {
    if (ref.startsWith("pendente:")) {
      const id = ref.slice(9), p = imagens.lerPendente(id);
      if (!p) throw new ErroPublicar(400, "uma imagem ainda não publicada sumiu do servidor; envie de novo", { campo: ref });
      const nome = imagens.nomeFinal(p.contexto, p.buf, p.ext);
      mapa[ref] = nome; usados.push(id);
      if (!novasImagens.some(n => n.caminho === nome)) novasImagens.push({ caminho: nome, conteudo: p.buf });
    } else if (!fs.existsSync(path.join(raiz, ref))) {
      throw new ErroPublicar(400, "imagem não encontrada: " + ref, { campo: ref });
    }
  }
  const novo = conteudo.mapearImagens(c, ref => mapa[ref] || ref);
  novo.atualizadoEm = agora.toISOString();
  const finais = new Set(conteudo.imagensReferenciadas(novo));

  /* o que sai: imagens órfãs e páginas de produtos que não existem mais */
  const remover = [];
  const pastaImg = path.join(raiz, "conteudo", "imagens");
  if (fs.existsSync(pastaImg)) for (const f of fs.readdirSync(pastaImg)) { const rel = "conteudo/imagens/" + f; if (/\.(webp|jpe?g|png|gif)$/i.test(f) && !finais.has(rel)) remover.push(rel); }
  const paginas = render.paginas(novo);
  const pastaOutros = path.join(raiz, "outros");
  if (fs.existsSync(pastaOutros)) for (const f of fs.readdirSync(pastaOutros)) if (f.endsWith(".html") && !paginas["outros/" + f]) remover.push("outros/" + f);

  const arquivos = [{ caminho: "conteudo/site.json", conteudo: Buffer.from(JSON.stringify(novo, null, 2) + "\n") }]
    .concat(novasImagens)
    .concat(Object.keys(paginas).map(k => ({ caminho: k, conteudo: Buffer.from(paginas[k]) })))
    .concat(remover.map(caminho => ({ caminho, remover: true })));

  const texto = resumo(atual, novo);
  const mensagem = "Painel: " + texto + (novasImagens.length ? " · " + novasImagens.length + (novasImagens.length === 1 ? " imagem nova" : " imagens novas") : "");

  let commit = null, modo = "local";
  if (env.GITHUB_TOKEN) {
    commit = await github.commit({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO || REPO_PADRAO, branch: env.GITHUB_BRANCH || "main", mensagem,
      autor: { name: o.usuario.nome, email: o.usuario.email }, arquivos, fetchFn: o.fetchFn });
    modo = "github";
  } else if (env.RAILWAY_ENVIRONMENT) {
    throw new ErroPublicar(503, "o servidor está sem GITHUB_TOKEN: configure a variável no Railway para publicar");
  }

  /* aplica localmente só depois do commit dar certo */
  for (const a of arquivos) {
    const abs = path.join(raiz, a.caminho);
    if (a.remover) { try { fs.unlinkSync(abs); } catch { /* já não existia */ } }
    else render.escreverAtomico(abs, a.conteudo);
  }
  usados.forEach(id => imagens.removerPendente(id));

  const registro = { quando: novo.atualizadoEm, quem: { nome: o.usuario.nome, email: o.usuario.email }, resumo: texto, imagens: novasImagens.length, modo, commit };
  const hist = dados.lerJson("publicacoes.json", []);
  hist.unshift(registro); dados.gravarJson("publicacoes.json", hist.slice(0, 50));
  return { ok: true, modo, commit, publicadoEm: novo.atualizadoEm, resumo: texto, mensagem };
}

module.exports = { publicar, resumo, ErroPublicar, REPO_PADRAO };
