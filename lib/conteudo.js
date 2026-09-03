/* Conteúdo editável do site: esquema, validação e carregamento de conteudo/site.json.
   A mesma validação vale para o arquivo no disco e para o rascunho que chega do painel. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO = path.join(RAIZ, "conteudo", "site.json");

const LIMITES = { titulo: 160, curto: 400, longo: 4000, item: 120, lista: 12, slugMin: 2, slugMax: 40, carrossel: 3, blocos: 20, intervaloMin: 3, intervaloMax: 30 };

class ErroConteudo extends Error {
  constructor(mensagem, campo) { super(mensagem); this.name = "ErroConteudo"; this.campo = campo; }
}
function falha(msg, campo) { throw new ErroConteudo(msg + (campo ? " (" + campo + ")" : ""), campo); }

/* ---------- tipos de campo ---------- */
const texto      = (max, o) => Object.assign({ tipo: "texto", max }, o);
const multilinha = (max, o) => Object.assign({ tipo: "texto", max, multilinha: true }, o);
const booleano   = () => ({ tipo: "booleano" });
const numero     = (min, max) => ({ tipo: "numero", min, max });
const cor        = () => ({ tipo: "cor" });
const link       = () => ({ tipo: "link" });
const slug       = () => ({ tipo: "slug" });
const imagem     = () => ({ tipo: "imagem" });
const lista      = (item, min, max) => ({ tipo: "lista", item, min, max });
const objeto     = (campos) => ({ tipo: "objeto", campos });
const bloco      = () => ({ tipo: "bloco" });

const RE_COR    = /^#[0-9a-fA-F]{6}$/;
const RE_LINK   = /^(https?:\/\/|mailto:|#|\/)/;
const RE_SLUG   = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RE_IMAGEM = /^(conteudo\/imagens\/[a-z0-9-]+\.(webp|jpe?g|png|gif)|pendente:[a-f0-9]{24})$/;
const SLUGS_RESERVADOS = new Set(["gestor", "api", "assets", "outros", "conteudo", "index"]);

const imagemComAlt = () => objeto({ arquivo: imagem(), alt: texto(LIMITES.curto) });
const botao = () => objeto({ texto: texto(LIMITES.item), link: link() });

/* ---------- esquema ---------- */
const BLOCOS = {
  texto:       objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo) }),
  imagem:      objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), legenda: texto(LIMITES.curto) }),
  imagemTexto: objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo), imagemDireita: booleano() }),
  lista:       objeto({ titulo: texto(LIMITES.titulo), itens: lista(texto(LIMITES.item), 1, LIMITES.lista) }),
  destaque:    objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.longo), botao: botao() })
};

const PRODUTO = objeto({
  slug: slug(), nome: texto(LIMITES.item, { obrigatorio: true }), ativo: booleano(), cor: cor(),
  letra: texto(2), icone: imagemComAlt(), status: texto(LIMITES.item), descricaoMenu: texto(LIMITES.curto),
  descricao: texto(LIMITES.curto), publico: texto(LIMITES.curto), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
  chips: lista(texto(LIMITES.item), 0, 3), capa: imagemComAlt(),
  comoFunciona: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    itens: lista(objeto({ titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto) }), 0, 6) }),
  blocos: lista(bloco(), 0, LIMITES.blocos),
  listaEspera: objeto({ ativa: booleano(), convite: texto(LIMITES.curto), campo: texto(LIMITES.item), placeholder: texto(LIMITES.item) })
});

const ESQUEMA = objeto({
  versao: numero(1, 1),
  atualizadoEm: texto(40),
  site: objeto({ tituloAba: texto(LIMITES.titulo), descricao: texto(LIMITES.curto), descricaoSocial: texto(LIMITES.curto),
    whatsapp: texto(20), email: texto(LIMITES.item), cidade: texto(LIMITES.item), notaRodape: texto(LIMITES.curto) }),
  inicio: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), subtitulo: multilinha(LIMITES.curto),
    botaoPrincipal: botao(), botaoSecundario: botao(), tags: lista(texto(40), 0, 8),
    painelAtivo: booleano(),
    carrossel: objeto({ intervalo: numero(LIMITES.intervaloMin, LIMITES.intervaloMax),
      imagens: lista(objeto({ arquivo: imagem(), alt: texto(LIMITES.curto), link: link() }), 0, LIMITES.carrossel) }),
    frentesResumo: lista(objeto({ titulo: texto(LIMITES.item), texto: texto(LIMITES.curto) }), 3, 3)
  }),
  diagnostico: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
    afirmacoes: lista(objeto({ titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.curto) }), 3, 3),
    oferta: objeto({ titulo: texto(LIMITES.item), selo: texto(40),
      medidas: lista(objeto({ valor: texto(40), texto: texto(LIMITES.item) }), 3, 3),
      tituloEntregas: texto(LIMITES.item), entregas: lista(texto(LIMITES.item), 2, LIMITES.lista),
      botao: texto(LIMITES.item), alternativa: texto(LIMITES.item) })
  }),
  processos: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto),
    cartoes: lista(objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto),
      itens: lista(texto(LIMITES.item), 1, 6) }), 3, 3),
    entrega: texto(LIMITES.curto)
  }),
  dashboard: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), lead: multilinha(LIMITES.curto), legendaCelular: texto(LIMITES.item) }),
  modelos: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), apoio: multilinha(LIMITES.curto),
    cartoes: lista(objeto({ tag: texto(40), titulo: texto(LIMITES.item), texto: multilinha(LIMITES.curto),
      itens: lista(texto(LIMITES.item), 1, 8), paraQuem: texto(LIMITES.curto) }), 2, 4),
    nota: texto(LIMITES.curto)
  }),
  perfil: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    serveTitulo: texto(LIMITES.item), serve: lista(texto(LIMITES.item), 1, 8),
    naoServeTitulo: texto(LIMITES.item), naoServe: lista(texto(LIMITES.item), 1, 8) }),
  faq: objeto({ rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo),
    itens: lista(objeto({ pergunta: texto(LIMITES.titulo, { obrigatorio: true }), resposta: multilinha(LIMITES.longo, { obrigatorio: true }) }), 1, 20) }),
  contato: objeto({
    rotulo: texto(LIMITES.item), titulo: texto(LIMITES.titulo), texto: multilinha(LIMITES.curto), botaoWhatsapp: texto(LIMITES.item),
    areas: lista(objeto({ titulo: texto(LIMITES.item), texto: texto(LIMITES.item) }), 1, 6),
    formulario: objeto({ titulo: texto(LIMITES.item), subtitulo: texto(LIMITES.curto) })
  }),
  produtos: lista(PRODUTO, 0, 20)
});

/* ---------- validação ---------- */
function validarCampo(v, esq, campo) {
  switch (esq.tipo) {
    case "texto": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = esq.multilinha ? v.replace(/\r\n?/g, "\n").trim() : v.replace(/\s+/g, " ").trim();
      if (esq.obrigatorio && !v) falha("é obrigatório", campo);
      if (v.length > esq.max) falha("passa de " + esq.max + " caracteres", campo);
      return v;
    }
    case "booleano": return v === true || v === "true" || v === 1;
    case "numero": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < esq.min || n > esq.max) falha("precisa ser um número inteiro entre " + esq.min + " e " + esq.max, campo);
      return n;
    }
    case "cor": {
      if (typeof v !== "string" || !RE_COR.test(v.trim())) falha("precisa ser uma cor no formato #RRGGBB", campo);
      return v.trim().toUpperCase();
    }
    case "link": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = v.trim();
      if (v && !RE_LINK.test(v)) falha("precisa começar com http://, https://, mailto:, # ou /", campo);
      if (v.length > 500) falha("passa de 500 caracteres", campo);
      return v;
    }
    case "slug": {
      if (typeof v !== "string") falha("é obrigatório", campo);
      v = v.trim().toLowerCase();
      if (v.length < LIMITES.slugMin || v.length > LIMITES.slugMax || !RE_SLUG.test(v)) falha("só letras minúsculas, números e hífens, de 2 a 40 caracteres", campo);
      if (SLUGS_RESERVADOS.has(v)) falha("endereço reservado", campo);
      return v;
    }
    case "imagem": {
      if (v == null) v = "";
      if (typeof v !== "string") falha("precisa ser texto", campo);
      v = v.trim();
      if (v && !RE_IMAGEM.test(v)) falha("referência de imagem inválida", campo);
      return v;
    }
    case "lista": {
      if (v == null) v = [];
      if (!Array.isArray(v)) falha("precisa ser uma lista", campo);
      if (v.length < esq.min) falha("precisa ter pelo menos " + esq.min + (esq.min === 1 ? " item" : " itens"), campo);
      if (v.length > esq.max) falha("pode ter no máximo " + esq.max + " itens", campo);
      return v.map((item, i) => validarCampo(item, esq.item, campo + "[" + i + "]"));
    }
    case "objeto": {
      if (v == null) v = {};
      if (typeof v !== "object" || Array.isArray(v)) falha("precisa ser um objeto", campo);
      const saida = {};
      for (const k in esq.campos) saida[k] = validarCampo(v[k], esq.campos[k], campo ? campo + "." + k : k);
      return saida;
    }
    case "bloco": {
      if (!v || typeof v !== "object" || !BLOCOS[v.tipo]) falha("tipo de bloco desconhecido", campo + ".tipo");
      return Object.assign({ tipo: v.tipo }, validarCampo(v, BLOCOS[v.tipo], campo));
    }
  }
  return falha("tipo de campo desconhecido: " + esq.tipo, campo);
}

/* regras que dependem de mais de um campo */
function validar(obj) {
  const c = validarCampo(obj, ESQUEMA, "");
  const vistos = new Set();
  c.produtos.forEach((p, i) => {
    if (vistos.has(p.slug)) falha("endereço repetido: " + p.slug, "produtos[" + i + "].slug");
    vistos.add(p.slug);
    p.blocos.forEach((b, j) => {
      if ((b.tipo === "imagem" || b.tipo === "imagemTexto") && !b.arquivo) falha("escolha a imagem", "produtos[" + i + "].blocos[" + j + "].arquivo");
    });
  });
  c.inicio.carrossel.imagens.forEach((im, i) => { if (!im.arquivo) falha("escolha a imagem", "inicio.carrossel.imagens[" + i + "].arquivo"); });
  return c;
}

/* percorre um conteúdo válido devolvendo uma cópia com fn aplicada a cada referência de imagem */
function mapear(v, esq, fn) {
  if (esq.tipo === "objeto") { const o = {}; for (const k in esq.campos) o[k] = mapear(v[k], esq.campos[k], fn); return o; }
  if (esq.tipo === "lista") return v.map(x => mapear(x, esq.item, fn));
  if (esq.tipo === "bloco") return Object.assign({ tipo: v.tipo }, mapear(v, BLOCOS[v.tipo], fn));
  return esq.tipo === "imagem" ? fn(v) : v;
}
function mapearImagens(c, fn) { return mapear(c, ESQUEMA, fn); }
function imagensReferenciadas(c) {
  const s = new Set();
  mapear(c, ESQUEMA, ref => { if (ref) s.add(ref); return ref; });
  return [...s];
}

function carregar(arquivo = ARQUIVO) {
  let bruto;
  try { bruto = fs.readFileSync(arquivo, "utf8"); }
  catch { throw new ErroConteudo("não encontrei " + path.relative(RAIZ, arquivo), ""); }
  let obj;
  try { obj = JSON.parse(bruto); }
  catch (e) { throw new ErroConteudo("JSON inválido em " + path.relative(RAIZ, arquivo) + ": " + e.message, ""); }
  return validar(obj);
}

module.exports = { carregar, validar, mapearImagens, imagensReferenciadas, ErroConteudo, LIMITES, ARQUIVO, ESQUEMA };
