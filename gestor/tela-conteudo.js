/* Telas de conteúdo da página principal e do site. Cada tela descreve seus campos com G.F. */
(function () {
  "use strict";
  const { el, F } = G;
  const L = () => G.conteudo.limites;
  const card = (titulo, ...kids) => el("div", { class: "card" }, titulo ? el("h2", { text: titulo }) : null, kids);
  const nota = t => el("p", { class: "ajuda-bloco", text: t });

  function tela(nome, titulo, descricao, montar) {
    G.TELAS[nome] = { titulo, async render(host) {
      await G.conteudo.garantir();
      host.append(el("div", { class: "tela-cab" }, el("div", {}, el("h1", { text: titulo }), el("p", { text: descricao }))));
      montar(host);
    } };
  }
  const cab = (base, rot) => [F.texto(base + ".rotulo", rot || "Rótulo pequeno acima do título", { max: L().item }), F.texto(base + ".titulo", "Título", { ajuda: "Use *asteriscos* no trecho em destaque." }), F.multilinha(base + ".lead", "Texto de apoio", { max: L().curto })];

  tela("inicio", "Provedores · topo", "O topo de /provedores: texto, botões, tags, os três cartões e o visual ao lado (painel demonstrativo ou carrossel).", host => {
    host.append(card("Texto do topo",
      F.texto("inicio.rotulo", "Rótulo acima do título", { max: L().item }),
      F.texto("inicio.titulo", "Título", { ajuda: "Use *asteriscos* no trecho que fica em azul." }),
      F.multilinha("inicio.subtitulo", "Subtítulo", { max: L().curto }),
      el("div", { class: "linha" }, F.texto("inicio.botaoPrincipal.texto", "Botão principal · texto", { max: L().item }), F.link("inicio.botaoPrincipal.link", "Botão principal · link")),
      el("div", { class: "linha" }, F.texto("inicio.botaoSecundario.texto", "Botão secundário · texto", { max: L().item, ajuda: "Em branco, o botão some." }), F.link("inicio.botaoSecundario.link", "Botão secundário · link")),
      F.listaTextos("inicio.tags", "Tags", { max: 8, itemMax: 40 })));
    host.append(card("Visual ao lado do texto",
      nota("Com imagens no carrossel, ele aparece no lugar do painel demonstrativo. Sem imagens, o painel volta (se estiver ligado). Painel desligado e carrossel vazio deixam só o texto."),
      F.chave("inicio.painelAtivo", "Painel demonstrativo ligado"),
      F.numero("inicio.carrossel.intervalo", "Intervalo do carrossel (segundos)", { min: L().intervaloMin, max: L().intervaloMax }),
      F.listaObjetos("inicio.carrossel.imagens", "Imagens do carrossel (até 3 · recomendado 1600 × 1000)", { max: 3, novo: () => ({ arquivo: "", alt: "", link: "" }), titulo: (im, i) => "Imagem " + (i + 1), textoAdicionar: "+ Adicionar imagem",
        campos: b => [F.imagem(b + ".arquivo", "Imagem", { contexto: "carrossel", alt: "alt" }), F.link(b + ".link", "Link ao clicar (opcional)")] })));
    host.append(card("Título da aba e descrição de /provedores",
      F.texto("inicio.tituloAba", "Título da aba / do Google"),
      F.multilinha("inicio.descricao", "Descrição para o Google", { max: L().curto, ajuda: "Até 160 caracteres aparecem no resultado da busca." })));
    host.append(card("Cartões 01 · 02 · 03 (abaixo do topo)", F.listaObjetos("inicio.frentesResumo", "", { fixo: true, titulo: (f, i) => "0" + (i + 1), campos: b => [F.texto(b + ".titulo", "Título", { max: L().item }), F.texto(b + ".texto", "Texto", { max: L().curto })] })));
  });

  tela("diagnostico", "Frente 01 · Diagnóstico", "Alimenta a seção em /provedores e a landing própria em /diagnostico. Os gráficos e os números da história continuam no código.", host => {
    host.append(card("Cabeçalho", cab("diagnostico")));
    host.append(card("Título da aba e descrição de /diagnostico",
      F.texto("diagnostico.tituloAba", "Título da aba / do Google"),
      F.multilinha("diagnostico.descricao", "Descrição para o Google", { max: L().curto })));
    host.append(card("As três afirmações", F.listaObjetos("diagnostico.afirmacoes", "", { fixo: true, titulo: (a, i) => "Afirmação " + (i + 1), campos: b => [F.texto(b + ".titulo", "Título", { ajuda: "*asteriscos* no trecho em azul." }), F.multilinha(b + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Cartão \"Diagnóstico de gestão\"",
      el("div", { class: "linha" }, F.texto("diagnostico.oferta.titulo", "Título", { max: L().item }), F.texto("diagnostico.oferta.selo", "Selo", { max: 40 })),
      F.listaObjetos("diagnostico.oferta.medidas", "Três medidas", { fixo: true, titulo: (m, i) => "Medida " + (i + 1), campos: b => [el("div", { class: "linha" }, F.texto(b + ".valor", "Valor", { max: 40 }), F.texto(b + ".texto", "Texto", { max: L().item }))] }),
      F.texto("diagnostico.oferta.tituloEntregas", "Título da lista", { max: L().item }),
      F.listaTextos("diagnostico.oferta.entregas", "Entregas", { min: 2, max: L().lista }),
      el("div", { class: "linha" }, F.texto("diagnostico.oferta.botao", "Botão do WhatsApp", { max: L().item }), F.texto("diagnostico.oferta.alternativa", "Link alternativo", { max: L().item }))));
  });

  tela("processos", "Frente 02 · Processos", "Cabeçalho, os três cartões e a linha de entrega. O fluxo animado continua no código.", host => {
    host.append(card("Cabeçalho", cab("processos")));
    host.append(card("Os três cartões", F.listaObjetos("processos.cartoes", "", { fixo: true, titulo: (k, i) => "Cartão " + (i + 1), campos: b => [el("div", { class: "linha" }, F.texto(b + ".rotulo", "Rótulo", { max: L().item }), F.texto(b + ".titulo", "Título", { max: L().item })), F.multilinha(b + ".texto", "Texto", { max: L().curto }), F.listaTextos(b + ".itens", "Itens", { min: 1, max: 6 })] })));
    host.append(card("Entrega", F.texto("processos.entrega", "Texto depois de \"Entrega ·\"", { max: L().curto })));
  });

  /* ---------- página inicial (hub) ---------- */
  tela("hub", "Início (hub)", "A página inicial: o topo, as três portas, o bloco \"quem faz\", a faixa de honestidade e a chamada de contato.", host => {
    host.append(card("Topo",
      F.texto("hub.titulo", "Título", { ajuda: "Use *asteriscos* no trecho em laranja." }),
      F.multilinha("hub.subtitulo", "Subtítulo", { max: L().curto })));
    host.append(card("As três portas",
      nota("A primeira porta é a principal e ocupa mais espaço; a segunda é a saída secundária. O endereço de cada uma fica no campo \"Link\"."),
      F.listaObjetos("hub.portas", "", { fixo: true, titulo: (pt, i) => ["1 · Provedores (aparece na home)", "2 · Outros Apps (só no menu)"][i],
        campos: b => [F.texto(b + ".quem", "Linha de cima (\"Você tem um provedor…\")", { max: L().item }),
                      F.texto(b + ".titulo", "Título", { max: L().item }),
                      F.multilinha(b + ".texto", "Texto", { max: L().curto }),
                      el("div", { class: "linha" }, F.texto(b + ".seloDestaque", "Selo · parte em negrito", { max: 40 }), F.texto(b + ".selo", "Selo · resto", { max: L().item })),
                      F.link(b + ".link", "Link da porta")] })));
    host.append(card("Quem faz",
      F.texto("hub.quemSomos.titulo", "Título"),
      F.multilinha("hub.quemSomos.apoio", "Texto de apoio", { max: L().curto }),
      F.listaObjetos("hub.quemSomos.fatos", "Os três fatos", { fixo: true, titulo: (f, i) => "Fato " + (i + 1),
        campos: b => [el("div", { class: "linha" }, F.texto(b + ".chave", "Número em destaque", { max: 40 }), F.texto(b + ".titulo", "Título", { max: L().item })), F.multilinha(b + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Honestidade poupa reunião",
      F.texto("hub.honestidade.titulo", "Título"),
      F.multilinha("hub.honestidade.texto", "Texto", { max: L().curto }),
      F.listaTextos("hub.honestidade.serve", "Serve (marcador laranja)", { min: 1, max: 6 }),
      F.listaTextos("hub.honestidade.naoServe", "Não serve (marcador cinza)", { min: 1, max: 6 })));
    host.append(card("Chamada de contato",
      F.texto("hub.contato.titulo", "Título", { ajuda: "*asteriscos* no trecho em laranja." }),
      F.multilinha("hub.contato.texto", "Texto", { max: L().curto }),
      F.texto("hub.contato.botaoWhatsapp", "Botão do WhatsApp", { max: L().item })));
  });

  /* ---------- painel do provedor ---------- */
  tela("painel", "Painel do provedor", "As três áreas do painel demonstrativo — comercial, financeiro e campo — que aparecem em /provedores/software/painel. Os números e os gráficos continuam no código.", host => {
    host.append(card("As três áreas",
      nota("A ordem é fixa e casa com os painéis do código: comercial, financeiro e campo."),
      F.listaObjetos("painel.areas", "", { fixo: true, titulo: (ar, i) => ["1 · Comercial", "2 · Financeiro", "3 · Campo"][i],
        campos: b => [el("div", { class: "linha" }, F.texto(b + ".nome", "Nome curto (botão)", { max: 40 }), F.texto(b + ".rotulo", "Rótulo acima do título", { max: L().item })),
                      F.texto(b + ".titulo", "Título"), F.multilinha(b + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Nota abaixo do painel", F.texto("painel.nota", "Aviso sobre os dados ilustrativos", { max: L().curto })));
  });

  /* ---------- catálogo de software para provedor ---------- */
  tela("software", "Software (catálogo)", "A página /provedores/software e a página de cada produto. Desligue \"no catálogo\" para tirar um produto do ar sem apagar o texto.", host => {
    host.append(card("Topo", cab("software")));
    host.append(card("Título da aba e descrição",
      F.texto("software.tituloAba", "Título da aba / do Google"),
      F.multilinha("software.descricao", "Descrição para o Google", { max: L().curto })));
    host.append(card("Nota abaixo dos cartões", F.texto("software.nota", "Nota", { max: L().curto })));
    host.append(card("Como um produto entra na operação",
      el("div", { class: "linha" }, F.texto("software.comoFunciona.rotulo", "Rótulo", { max: L().item }), F.texto("software.comoFunciona.titulo", "Título")),
      F.listaObjetos("software.comoFunciona.itens", "Passos", { max: 6, novo: () => ({ titulo: "", texto: "" }), titulo: it => it.titulo || "Passo", textoAdicionar: "+ Adicionar passo",
        campos: b => [F.texto(b + ".titulo", "Título", { max: L().item }), F.multilinha(b + ".texto", "Texto", { max: L().curto })] })));
    host.append(card("Produtos",
      nota("O produto marcado com \"mostra o painel ao vivo\" ganha as três áreas e o painel completo na página dele. Só um produto precisa disso."),
      F.listaObjetos("software.produtos", "", { max: 12, duplicar: true,
        novo: () => ({ slug: "novo-produto", nome: "Novo produto", ativo: false, demo: false, categoria: "Gestão", status: "em desenvolvimento", cor: "#2F5BD0", resumo: "", sub: "", titulo: "", lead: "", beneficios: [], preco: "" }),
        titulo: p => p.nome || "Produto", textoAdicionar: "+ Adicionar produto",
        campos: b => [
          el("div", { class: "linha" }, F.texto(b + ".nome", "Nome", { max: L().item }), F.texto(b + ".slug", "Endereço (/provedores/software/…)", { max: 40, ajuda: "Só letras minúsculas, números e hífen." })),
          el("div", { class: "linha" }, F.chave(b + ".ativo", "No catálogo"), F.chave(b + ".demo", "Mostra o painel ao vivo")),
          el("div", { class: "linha" }, F.texto(b + ".categoria", "Categoria", { max: 40 }), F.texto(b + ".status", "Situação", { max: L().item, ajuda: "\"no ar\" acende o ponto verde." })),
          F.cor(b + ".cor", "Cor do produto"),
          F.texto(b + ".resumo", "Resumo (no cartão do catálogo)", { max: L().curto }),
          F.texto(b + ".titulo", "Título da página", { ajuda: "*asteriscos* no trecho em laranja." }),
          F.multilinha(b + ".lead", "Texto de apoio da página", { max: L().curto }),
          F.multilinha(b + ".sub", "Frase curta do produto", { max: L().curto }),
          F.listaObjetos(b + ".beneficios", "O que ele resolve", { max: 6, novo: () => ({ titulo: "", texto: "" }), titulo: x => x.titulo || "Benefício", textoAdicionar: "+ Adicionar",
            campos: k => [F.texto(k + ".titulo", "Título", { max: L().item }), F.multilinha(k + ".texto", "Texto", { max: L().curto })] }),
          F.texto(b + ".preco", "Como é cobrado", { max: L().curto })
        ] })));
  });

  /* ---------- índice dos aplicativos ---------- */
  tela("apps", "Outros Apps (índice)", "A página /apps: topo, manifesto e fecho. Os cartões saem sozinhos dos produtos ativos, editados em \"Produtos\".", host => {
    host.append(card("Topo", cab("apps")));
    host.append(card("Título da aba e descrição",
      F.texto("apps.tituloAba", "Título da aba / do Google"),
      F.multilinha("apps.descricao", "Descrição para o Google", { max: L().curto })));
    host.append(card("Manifesto da linha", nota("Aparece acima dos cartões, explicando por que estes aplicativos ficam separados da frente de provedores."),
      F.multilinha("apps.manifesto", "Texto", { max: L().curto })));
    host.append(card("Sem aplicativos ativos", nota("Texto que aparece no lugar dos cartões quando nenhum produto está ativo."),
      F.texto("apps.vazio", "Aviso", { max: L().curto })));
    host.append(card("Fecho", F.texto("apps.fecho.titulo", "Título"), F.multilinha("apps.fecho.texto", "Texto", { max: L().curto })));
  });

  tela("dashboard", "Frente 03 · Dashboard", "Cabeçalho da frente e legenda do celular. Painéis e gráficos continuam no código.", host => {
    host.append(card("Cabeçalho", cab("dashboard"), F.texto("dashboard.legendaCelular", "Legenda abaixo do celular", { max: L().item })));
  });

  tela("modelos", "Modelos de contratação", "Título, texto de apoio, os cartões (de 2 a 4) e a nota final.", host => {
    host.append(card("Cabeçalho", F.texto("modelos.rotulo", "Rótulo", { max: L().item }), F.texto("modelos.titulo", "Título"), F.multilinha("modelos.apoio", "Texto de apoio", { max: L().curto })));
    host.append(card("Cartões", F.listaObjetos("modelos.cartoes", "", { min: 2, max: 4, duplicar: true, novo: () => ({ tag: "Recorrente", titulo: "Novo modelo", texto: "", itens: [""], paraQuem: "" }), titulo: k => k.titulo || "Cartão", textoAdicionar: "+ Adicionar cartão",
      campos: b => [el("div", { class: "linha" }, F.texto(b + ".tag", "Tag", { max: 40 }), F.texto(b + ".titulo", "Título", { max: L().item })), F.multilinha(b + ".texto", "Texto", { max: L().curto }), F.listaTextos(b + ".itens", "Itens", { min: 1, max: 8 }), F.texto(b + ".paraQuem", "Para quem…", { max: L().curto, ajuda: "Completa a frase \"Para quem\"." })] })));
    host.append(card("Nota", F.texto("modelos.nota", "Nota abaixo dos cartões", { max: L().curto })));
  });

  tela("perfil", "Serve / não serve", "As duas listas de perfil.", host => {
    host.append(card("Cabeçalho", F.texto("perfil.rotulo", "Rótulo", { max: L().item }), F.texto("perfil.titulo", "Título")));
    host.append(card("Serve bem", F.texto("perfil.serveTitulo", "Título da lista", { max: L().item }), F.listaTextos("perfil.serve", "Itens", { min: 1, max: 8 })));
    host.append(card("Não serve", F.texto("perfil.naoServeTitulo", "Título da lista", { max: L().item }), F.listaTextos("perfil.naoServe", "Itens", { min: 1, max: 8 })));
  });

  tela("faq", "Perguntas frequentes", "As perguntas alimentam a página e os dados estruturados do Google.", host => {
    host.append(card("Cabeçalho", F.texto("faq.rotulo", "Rótulo", { max: L().item }), F.texto("faq.titulo", "Título")));
    host.append(card("Perguntas", F.listaObjetos("faq.itens", "", { min: 1, max: 20, duplicar: true, novo: () => ({ pergunta: "", resposta: "" }), titulo: q => q.pergunta || "Nova pergunta", textoAdicionar: "+ Adicionar pergunta",
      campos: b => [F.texto(b + ".pergunta", "Pergunta"), F.multilinha(b + ".resposta", "Resposta", { max: L().longo, linhas: 4 })] })));
  });

  tela("contato", "Contato e rodapé", "A chamada final, as seis áreas e o cabeçalho do formulário. O e-mail e o WhatsApp ficam em \"Site\".", host => {
    host.append(card("Chamada", F.texto("contato.rotulo", "Rótulo", { max: L().item }), F.texto("contato.titulo", "Título", { ajuda: "*asteriscos* no trecho em laranja." }), F.multilinha("contato.texto", "Texto", { max: L().curto }), F.texto("contato.botaoWhatsapp", "Botão do WhatsApp", { max: L().item })));
    host.append(card("Áreas de atuação", F.listaObjetos("contato.areas", "", { min: 1, max: 6, novo: () => ({ titulo: "", texto: "" }), titulo: a => a.titulo || "Área", textoAdicionar: "+ Adicionar área",
      campos: b => [el("div", { class: "linha" }, F.texto(b + ".titulo", "Título", { max: L().item }), F.texto(b + ".texto", "Texto", { max: L().item }))] })));
    host.append(card("Formulário", F.texto("contato.formulario.titulo", "Título", { max: L().item }), F.texto("contato.formulario.subtitulo", "Subtítulo", { max: L().curto })));
  });

  tela("site", "Site", "Título da aba, descrições para o Google e redes, contato e a nota do rodapé.", host => {
    host.append(card("Google e redes", F.texto("site.tituloAba", "Título da aba / do Google"), F.multilinha("site.descricao", "Descrição para o Google", { max: L().curto, ajuda: "Até 160 caracteres aparecem no resultado da busca." }), F.multilinha("site.descricaoSocial", "Descrição ao compartilhar (WhatsApp, LinkedIn)", { max: L().curto })));
    host.append(card("Contato", el("div", { class: "linha" }, F.texto("site.whatsapp", "WhatsApp (só dígitos, com DDI e DDD)", { max: 20, placeholder: "5569999999999", ajuda: "Em branco, os botões de WhatsApp levam ao formulário." }), F.texto("site.email", "E-mail", { max: L().item, tipo: "email" })), F.texto("site.cidade", "Cidade, UF", { max: L().item })));
    host.append(card("Rodapé", F.multilinha("site.notaRodape", "Nota ao pé da página", { max: L().curto })));
  });
})();
