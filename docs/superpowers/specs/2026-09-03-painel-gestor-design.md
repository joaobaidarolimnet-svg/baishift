# Painel do gestor — especificação

Data: 2026-09-03 · Estado: aprovado em conversa, aguardando revisão do texto

## 1. Objetivo

Dar ao gestor da Baishift um painel em `www.baishift.com.br/gestor` para, sem mexer em
código:

- editar os textos do site (início, frentes 01/02/03, modelos, "serve / não serve", FAQ,
  contato e rodapé, dados de SEO e contato);
- controlar o visual do início: manter o painel demonstrativo ligado ou trocá-lo por um
  carrossel de até 3 imagens com temporizador;
- criar, editar, ordenar e ativar/desativar os produtos do menu **Outros**, cada um com sua
  página própria e blocos livres (texto, imagem, imagem com texto, lista, destaque);
- enviar e substituir imagens;
- publicar tudo isso no site em um clique;
- ver métricas de uso do site (visitas, origens, cidades, navegação por seção, cliques em
  anúncios e botões, formulários, produtos);
- entrar com e-mail e senha, trocar a senha no primeiro acesso e cadastrar outros usuários.

Fora de escopo nesta versão: trocar logos, favicon e imagem de compartilhamento; editar os
números e gráficos animados (painel demonstrativo, caminho dos dados, processo ao vivo,
"antes e depois"); página 404; envio de e-mail pelo servidor (o formulário continua abrindo
WhatsApp/e-mail do visitante); recuperação de senha por e-mail; recorte de imagens no painel;
mais de um idioma.

## 2. Decisões de arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Onde fica o conteúdo do site | Arquivo `conteudo/site.json` + pasta `conteudo/imagens/` **no repositório GitHub** | Versionado (dá para voltar atrás), continua sendo o mesmo lugar que o Claude Code edita, sem infra nova para conteúdo |
| Como o conteúdo vira HTML | O servidor gera `index.html`, `outros/*.html` e `sitemap.xml` a partir do JSON, ao subir e ao publicar. Os gerados continuam commitados, com aviso no topo | Mantém o site estático e navegável no repositório, como as landing pages já são hoje; `python3 -m http.server` e `build-single` seguem funcionando |
| Como publicar | Um commit único no GitHub (JSON + imagens + HTML gerado) e aplicação imediata no servidor | Vai ao ar na hora; o Railway republica com o mesmo conteúdo, sem janela de divergência |
| Onde ficam usuários, sessões e métricas | **Disco persistente do Railway** (volume), em arquivos JSON/JSONL | O repositório é público: senhas e dados de visita não podem ir para lá; eventos de visita não cabem em commits |
| Dependências | Nenhuma além do Node (≥ 20) | Regra do projeto |
| Painel | Aplicação de página única em HTML/CSS/JS puro, servida pelo mesmo `server.js` | Mesma regra; mesma tipografia e cores da marca |

Sem token do GitHub e rodando na máquina local, "Publicar" grava nos arquivos e o gestor faz
o commit como sempre. No Railway sem token, "Publicar" é bloqueado com a mensagem
"Configure GITHUB_TOKEN no Railway", porque o que fosse gravado só no container sumiria no
próximo deploy.

## 3. Estrutura de arquivos

```
server.js                  roteador HTTP: redirecionamento de host, /api/evento, /gestor, site estático
lib/
  conteudo.js              carrega, valida e normaliza conteudo/site.json (esquema, limites, slugs)
  render.js                JSON → HTML (index, produto, sitemap); escape; marcações *em*, **negrito**, [link](url)
  publicar.js              materializa imagens pendentes, gera páginas, commit no GitHub, grava local
  auth.js                  usuários (scrypt), cookie de sessão (HMAC), bloqueio por tentativas
  dados.js                 acesso ao disco persistente (usuarios.json, config.json, eventos/, pendentes/, publicacoes.json)
  metricas.js              registro de eventos, classificação (origem, dispositivo), geolocalização com cache, agregações
  imagens.js               validação de upload (assinatura do arquivo), nomes por conteúdo, gravação
  painel.js                rotas do painel (/gestor e /gestor/api/*)
templates/
  index.js                 função (conteudo) → HTML da página principal
  produto.js               função (produto, conteudo) → HTML da landing page
  comum.js                 cabeçalho, rodapé, <head>, helpers de marcação
conteudo/
  site.json                FONTE DA VERDADE do conteúdo editável
  imagens/                 imagens publicadas (nome = slug-hash8.ext)
gestor/
  login.html               tela de entrada (sem sessão)
  index.html               casca do painel (com sessão)
  gestor.css
  gestor.js
tools/
  build-site.mjs           gera index.html, outros/*.html e sitemap.xml a partir do JSON (substitui build-outros.mjs)
test/
  *.test.js                node --test
index.html, outros/*.html, sitemap.xml   GERADOS — com comentário "gerado a partir de conteudo/site.json; não edite aqui"
dados/                     (gitignored) disco persistente local; no Railway é o volume em /data
```

Removido: `tools/build-outros.mjs`. Mantidos sem mudança: `tools/build-single.mjs`,
`tools/verify.mjs`, `tools/shot.sh`, `tools/og.html`.

O servidor deixa de servir as pastas `lib/`, `templates/`, `gestor/` (esta só pelas rotas
do painel), `test/`, `docs/` e o arquivo `conteudo/site.json`; `conteudo/imagens/` é servida
normalmente.

## 4. Modelo de conteúdo (`conteudo/site.json`)

Todos os textos são texto puro. Marcações permitidas, aplicadas depois do escape de HTML:

- `*trecho*` → `<em>` (o destaque colorido dos títulos);
- `**trecho**` → `<strong>`;
- `[texto](url)` → link, só com `http(s)://`, `mailto:` ou `#` (qualquer outra coisa vira texto);
- em campos de várias linhas, linha em branco separa parágrafos e quebra simples vira `<br>`.

Limites gerais: título até 160 caracteres; textos curtos até 400; textos longos até 4.000;
itens de lista até 120; listas até 12 itens salvo quando indicado. O servidor rejeita o que
passar dos limites com mensagem apontando o campo.

```jsonc
{
  "versao": 1,
  "atualizadoEm": "2026-09-03T12:00:00Z",          // gravado pelo servidor ao publicar
  "site": {
    "tituloAba": "Baishift — Gestão, processos e software para provedores de internet",
    "descricao": "…",                                // meta description
    "descricaoSocial": "…",                          // og:description / twitter:description
    "whatsapp": "",                                  // só dígitos, DDI+DDD; vazio = botões caem no formulário/e-mail
    "email": "contato@baishift.com.br",
    "cidade": "Rolim de Moura, RO",
    "notaRodape": "Os painéis, o fluxo e os resultados desta página usam dados ilustrativos…"
  },
  "inicio": {
    "rotulo": "Diagnóstico · Processos · Dashboard",
    "titulo": "O provedor decidindo *com número*, não com sensação.",
    "subtitulo": "…",
    "botaoPrincipal":  { "texto": "Começar pelo diagnóstico",  "link": "#diagnostico" },
    "botaoSecundario": { "texto": "Ver o dashboard ao vivo",   "link": "#dashboard" },
    "tags": ["Gestão em ISP", "IXC Soft", "Controladoria", "Dashboards", "Software sob medida"],
    "painelAtivo": true,
    "carrossel": {
      "intervalo": 6,                                // segundos, 3 a 30
      "imagens": [                                   // 0 a 3
        { "arquivo": "conteudo/imagens/promo-3f9a1c2b.webp", "alt": "Texto alternativo", "link": "" }
      ]
    },
    "frentesResumo": [                               // exatamente 3 (cartões 01/02/03 sob o painel)
      { "titulo": "Diagnóstico", "texto": "Onde a empresa está, para onde pode ir e quanto custa o caminho." },
      { "titulo": "Consultoria de processos", "texto": "…" },
      { "titulo": "Dashboard", "texto": "…" }
    ]
  },
  "diagnostico": {
    "rotulo": "Diagnóstico", "titulo": "…", "lead": "…",
    "afirmacoes": [ { "titulo": "Sensação não fecha caixa. *Número fecha.*", "texto": "…" } ],   // exatamente 3
    "oferta": {
      "titulo": "Diagnóstico de gestão", "selo": "sem compromisso",
      "medidas": [ { "valor": "45 min", "texto": "de conversa" } ],                               // exatamente 3
      "tituloEntregas": "O que você recebe",
      "entregas": [ "Mapa dos processos atuais no IXC", "…" ],                                    // 2 a 12
      "botao": "Agendar pelo WhatsApp", "alternativa": "ou envie uma mensagem"
    }
  },
  "processos": {
    "rotulo": "Consultoria de processos", "titulo": "…", "lead": "…",
    "cartoes": [ { "rotulo": "Processos atuais", "titulo": "Como acontece hoje", "texto": "…", "itens": ["…"] } ],  // exatamente 3; itens 1 a 6
    "entrega": "processo escrito, parametrizado no IXC e treinado com a equipe"
  },
  "dashboard": { "rotulo": "Dashboard", "titulo": "A visão geral do provedor, viva.", "lead": "…", "legendaCelular": "A pergunta da diretoria, no celular" },
  "modelos": {
    "rotulo": "Modelos de contratação", "titulo": "…", "apoio": "…",
    "cartoes": [ { "tag": "Escopo fechado", "titulo": "Projeto pontual", "texto": "…", "itens": ["…"], "paraQuem": "já sabe onde o processo trava." } ],  // 2 a 4; itens 1 a 8
    "nota": "Escopo, prazo e valor são definidos a partir do diagnóstico · retorno em até dois dias úteis"
  },
  "perfil": {
    "rotulo": "Honestidade poupa reunião", "titulo": "Para quem serve — e para quem não serve.",
    "serveTitulo": "Serve bem", "serve": ["…"],                                                    // 1 a 8
    "naoServeTitulo": "Não serve", "naoServe": ["…"]                                               // 1 a 8
  },
  "faq": { "rotulo": "Perguntas frequentes", "titulo": "…", "itens": [ { "pergunta": "…", "resposta": "…" } ] },  // 1 a 20; alimenta também o JSON-LD FAQPage
  "contato": {
    "rotulo": "Vamos começar pelo diagnóstico",
    "titulo": "Primeiro os números aparecem. Depois eles *melhoram*.",
    "texto": "…", "botaoWhatsapp": "Chamar no WhatsApp",
    "areas": [ { "titulo": "Diagnóstico", "texto": "Situação real e plano priorizado" } ],        // 1 a 6
    "formulario": { "titulo": "Agendar o diagnóstico", "subtitulo": "Cinco campos. A Baishift responde em até dois dias úteis." }
  },
  "produtos": [ /* ver 4.1 */ ]
}
```

O que **não** está no JSON continua no código: menu principal (âncoras fixas), números e
gráficos animados, textos da faixa "O que o processo mostra", quadro de resultados da frente
01, celular e painéis da frente 03, campos do formulário de diagnóstico, dados estruturados
da organização.

### 4.1 Produto

```jsonc
{
  "slug": "severino",                    // único, [a-z0-9-], 2 a 40; gerado do nome ao criar, editável
  "nome": "Severino",
  "ativo": true,                         // aparece no menu Outros e a página responde; inativo → 404 e fora do sitemap
  "cor": "#F5A300",                      // hex
  "letra": "S",                          // 1 a 2 caracteres; usada no menu e na arte quando não há ícone/capa
  "icone":  { "arquivo": "", "alt": "" },  // opcional; substitui a letra no menu e na arte
  "status": "em desenvolvimento",
  "descricaoMenu": "Assistente de IA para o profissional autônomo",
  "descricao": "…",                      // meta description / og:description
  "publico": "Eletricista · Pedreiro · Encanador · Jardineiro",
  "titulo": "Ele fala. *O Severino anota.*",
  "lead": "…",
  "chips": ["Orçamento enviado · R$ 850", "Serviço amanhã · 8h", "Pagamento recebido"],   // 0 a 3
  "capa": { "arquivo": "", "alt": "" },  // opcional; se preenchida substitui a arte (letra + chips) no topo
  "comoFunciona": {
    "rotulo": "Como funciona", "titulo": "Três coisas, feitas direito.",
    "itens": [ { "titulo": "Agenda", "texto": "…" } ]                                   // 0 a 6; numerados 01, 02…
  },
  "blocos": [                                                                            // 0 a 20, em qualquer ordem
    { "tipo": "texto",       "titulo": "", "texto": "parágrafos" },
    { "tipo": "imagem",      "arquivo": "conteudo/imagens/…", "alt": "", "legenda": "" },
    { "tipo": "imagemTexto", "arquivo": "…", "alt": "", "titulo": "", "texto": "", "imagemDireita": true },
    { "tipo": "lista",       "titulo": "", "itens": ["…"] },
    { "tipo": "destaque",    "titulo": "", "texto": "", "botao": { "texto": "", "link": "" } }
  ],
  "listaEspera": {
    "ativa": true,
    "convite": "Entre na lista e seja avisado quando o Severino *abrir para os primeiros profissionais*.",
    "campo": "Sua profissão", "placeholder": "Ex.: eletricista"
  }
}
```

Regras de página do produto: o cabeçalho lista os outros produtos ativos; o menu **Outros**
da página principal só existe se houver ao menos um produto ativo; blocos são renderizados
na ordem, entre "Como funciona" e a lista de espera; a lista de espera desligada some junto
com o botão "Entrar na lista" do topo (fica só "Voltar para a Baishift"). Mudar o slug de um
produto publicado muda a URL; o painel avisa antes.

### 4.2 Visual do início

| `painelAtivo` | imagens no carrossel | O que aparece ao lado do texto |
|---|---|---|
| qualquer | 1 a 3 | carrossel |
| true | 0 | painel demonstrativo (como hoje) |
| false | 0 | nada: o texto ocupa a largura toda |

Carrossel: mesma caixa do painel (proporção 16:10, cantos e sombra iguais), imagem em
`object-fit: cover`, pontos de navegação, setas, troca automática a cada `intervalo`
segundos, pausa com o mouse em cima, com foco no teclado, com a aba em segundo plano e com
`prefers-reduced-motion`. Imagem com `link` vira um `<a>`. O painel recomenda 1600 × 1000.

## 5. Renderização e publicação

**Ao subir**, o servidor lê `conteudo/site.json`, valida, gera `index.html`, `outros/<slug>.html`
para cada produto ativo, apaga `outros/*.html` de produtos que não existem mais, gera
`sitemap.xml` e só então começa a atender. JSON inválido derruba o boot com a mensagem do
campo errado (o Railway mantém a versão anterior no ar).

**Caminhos de assets** nas páginas geradas passam a ser absolutos (`/assets/...`), para a
pré-visualização e as páginas em subpastas usarem o mesmo modelo. O versionamento por hash
(`?v=`) continua; imagens de `conteudo/imagens/` têm nome por conteúdo e recebem cache de
um ano.

**Pré-visualizar**: o painel envia o rascunho para `POST /gestor/api/previa` (com `pagina`
= `inicio` ou `produto:<slug>`), que devolve o HTML renderizado sem gravar nada. A página
sai marcada com `data-previa` e o `site.js` não envia métricas quando isso existe. Imagens
ainda não publicadas são servidas de `/gestor/api/pendentes/<id>` (exige sessão).

**Publicar** (`POST /gestor/api/publicar`, corpo = rascunho completo):

1. Validar (esquema, limites, slugs únicos, toda imagem referenciada existe em
   `conteudo/imagens/` ou em `dados/pendentes/`).
2. Materializar: cada imagem pendente referenciada vira `conteudo/imagens/<slug>-<hash8>.<ext>`
   e a referência é reescrita; imagens publicadas que deixaram de ser referenciadas são
   removidas no mesmo commit.
3. Gerar as páginas e o sitemap em memória. Gravar `atualizadoEm` e o hash do conteúdo.
4. Com `GITHUB_TOKEN`: um commit via Git Data API na `GITHUB_BRANCH` (padrão `main`) de
   `GITHUB_REPO` (padrão `joaobaidarolimnet-svg/baishift`): blobs (base64 para binários),
   árvore com base na atual (remoções incluídas), commit com autor = usuário do painel e
   mensagem `Painel: <resumo>` (ex.: "Painel: início, 2 produtos, 1 imagem"), atualização
   da referência. Se a referência mudou entre a leitura e a escrita, tenta uma segunda vez;
   se falhar, nada é gravado no servidor e o erro volta ao painel com o motivo (token
   inválido/vencido, sem permissão, falha de rede).
5. Gravar os arquivos localmente (escrita atômica: arquivo temporário + rename), remover os
   apagados, limpar os pendentes usados.
6. Registrar em `dados/publicacoes.json` (quando, quem, resumo, sha e URL do commit).
7. Responder `{ ok, commitUrl, publicadoEm }`. O painel mostra "Publicado às HH:MM · ver
   commit" e o aviso "O Railway republica em um ou dois minutos com este mesmo conteúdo."

Concorrência: o rascunho leva o `atualizadoEm` do conteúdo em que se baseou; se o servidor
tiver um mais novo (outra pessoa publicou), o painel pergunta antes de sobrescrever.

**Rascunho** fica no `localStorage` do navegador, por usuário, gravado a cada mudança. Ao
abrir o painel com rascunho pendente, o aviso "Você tem alterações não publicadas de
<data>" oferece continuar ou descartar. Imagens são enviadas na hora em que são escolhidas
(`POST /gestor/api/imagens`) e ficam em `dados/pendentes/<id>.<ext>` até a publicação;
pendentes com mais de 7 dias são apagados no boot.

## 6. Imagens

- Aceitas: JPEG, PNG, WebP e GIF. SVG e qualquer outro tipo são recusados. O servidor
  confere a assinatura do arquivo (magic bytes), não a extensão.
- O navegador redimensiona antes de enviar: lado maior até 1920 px; sai em WebP (qualidade
  0,85) ou JPEG quando o navegador não codifica WebP; PNG com transparência continua PNG
  redimensionado; GIF vai como está. Limite depois do redimensionamento: 4 MB.
- Nome final definido pelo servidor: `<slug do contexto>-<8 primeiros hex do sha1>.<ext>`
  (ex.: `severino-capa-9c1e02ab.webp`). O cliente nunca escolhe nome nem caminho.
- Cada imagem tem campo `alt` obrigatório para acessibilidade, com aviso no painel se vazio.
- Limites: 3 no carrossel; 1 capa e 1 ícone por produto; blocos até 20 por produto.

## 7. Acesso e usuários

- Não há link para `/gestor` em lugar nenhum do site. `robots.txt` ganha `Disallow: /gestor`
  e `Disallow: /api/`; as páginas do painel levam `noindex` e `X-Robots-Tag: noindex`.
- **Login** em `/gestor`: e-mail e senha. Erro sempre genérico ("e-mail ou senha incorretos").
  Cinco erros em 15 minutos, por IP ou por e-mail, bloqueiam novas tentativas por 15 minutos.
- **Usuários** em `dados/usuarios.json`: `id`, `nome`, `email` (único, minúsculo), `senha`
  (`scrypt`, sal de 16 bytes, N=16384), `admin`, `ativo`, `trocarSenha`, `versaoSenha`,
  `criadoEm`, `ultimoAcesso`.
- **Primeiro usuário**: no boot, se não houver usuários e `GESTOR_EMAIL` e
  `GESTOR_SENHA_INICIAL` estiverem definidos, cria o administrador com `trocarSenha: true`.
  Valores a configurar no Railway: `joaobaidarolimnet@gmail.com` e `12345689`. Nada disso
  vai para o código.
- **Troca obrigatória**: com `trocarSenha` ligado, toda rota do painel redireciona para
  "Trocar senha" (senha atual, nova, confirmação; mínimo 10 caracteres; diferente da atual).
  Trocar a senha incrementa `versaoSenha`, o que invalida as outras sessões daquele usuário.
- **Sessão**: cookie `gestor_sessao` = `base64url(payload).assinatura`, payload
  `{ uid, vs (versaoSenha), exp }`, HMAC-SHA256 com segredo de 32 bytes gerado no primeiro
  boot e guardado em `dados/config.json`. `HttpOnly`, `SameSite=Strict`, `Path=/gestor`,
  `Secure` fora de localhost, validade 7 dias. "Sair" limpa o cookie.
- **CSRF**: `SameSite=Strict` + API só aceita `Content-Type: application/json` e o cabeçalho
  `X-Gestor: 1`.
- **Papéis**: `admin` gerencia usuários (criar com senha provisória e `trocarSenha`, editar
  nome/e-mail, ativar/desativar, redefinir senha, promover/rebaixar); `editor` faz tudo o
  mais. O primeiro usuário criado não pode ser desativado nem rebaixado; um admin não pode
  desativar a si mesmo.
- **Escape**: a variável `GESTOR_RESET_SENHA`, se presente no boot, redefine a senha do
  usuário `GESTOR_EMAIL` para esse valor com `trocarSenha: true` e registra no log; o
  README manda removê-la depois.

## 8. Métricas

### 8.1 Coleta (site)

`assets/js/site.js` ganha um módulo pequeno que envia eventos por `navigator.sendBeacon`
(ou `fetch` com `keepalive`) para `POST /api/evento`, JSON de até 1 KB. Não envia quando
`navigator.doNotTrack === "1"`, quando a página está em pré-visualização ou quando a URL é
`localhost`/`127.0.0.1` (a menos que `window.BAISHIFT.metricasLocais` esteja ligado, para
testar).

| Evento | Quando | Campos |
|---|---|---|
| `pagina` | carregamento | `pagina` (caminho), `ref` (referrer), `utm` (source/medium/campaign), `largura` |
| `secao` | uma seção da página principal entra na tela pela primeira vez | `alvo` = `diagnostico`, `processos`, `dashboard`, `modelos`, `faq`, `contato` |
| `clique` | clique em botão ou link marcado | `alvo` = `whatsapp:<onde>`, `cta:diagnostico`, `cta:dashboard`, `cta:oferta`, `menu:outros:<slug>`, `carrossel:<n>`, `lista:<slug>`, `bloco:<slug>:<n>` |
| `slide` | o carrossel mostra uma imagem (uma vez por imagem por visita) | `alvo` = `<n>` |
| `formulario` | envio do formulário de diagnóstico ou de lista de espera | `alvo` = `diagnostico` ou `lista:<slug>` |

### 8.2 Registro (servidor)

- `POST /api/evento` é público, sem sessão. Limite de 120 eventos por minuto por IP
  (excedentes descartados em silêncio). Corpo validado: tipo conhecido, campos com tamanho
  máximo, `pagina` começando com `/`. User-agents de robôs (bot, crawler, spider, headless
  e afins) são ignorados.
- Enriquecimento: `disp` (`celular` se largura < 760 ou UA móvel, senão `computador`);
  `origem` a partir de `ref`/`utm` (`google`, `instagram`, `facebook`, `whatsapp`,
  `linkedin`, `youtube`, `direto`, ou o domínio); `vis` = 16 hex de
  `sha256(segredo + data + ip + ua)`, sal que muda todo dia; `cidade`, `uf`, `pais`.
- **Geolocalização**: só o servidor consulta um serviço público de localização por IP
  (`ipwho.is`, com `ipapi.co` como reserva), por HTTPS, com tempo limite de 1,5 s, cache em
  memória por IP por 24 h (até 5.000 entradas) e sem consulta para IPs privados. O IP é
  enviado ao serviço para a consulta e **não é gravado** em lugar nenhum. Falha ou tempo
  esgotado → cidade vazia ("desconhecida" no painel).
- Gravação: uma linha JSON por evento em `dados/eventos/AAAA-MM.jsonl` (append). Campos:
  `t`, `tipo`, `pagina`, `alvo`, `origem`, `utm`, `disp`, `cidade`, `uf`, `pais`, `vis`.
  Arquivos com mais de 13 meses são apagados no boot.
- Sem cookies, sem identificador no navegador, sem serviço de terceiros no navegador.

### 8.3 Visão geral (painel)

Filtro de período: 7, 30 ou 90 dias (até hoje). Agregação feita sob demanda lendo os
arquivos do período, com cache em memória por 60 s.

- Cartões: visitas (eventos `pagina`), visitantes (soma dos únicos de cada dia), formulários
  enviados, cliques em anúncios (carrossel), com comparação ao período anterior.
- Gráfico de visitas por dia (SVG desenhado pelo painel, sem biblioteca).
- Tabelas: páginas mais vistas; origens; cidades e estados (top 10); celular × computador;
  navegação (quantas visitas chegaram a cada seção, em ordem, com % da base); cliques por
  alvo; carrossel (exibições e cliques por imagem, com a miniatura); produtos (visualizações,
  cliques no menu, cliques em blocos, inscrições na lista).
- Rodapé da tela: "Métricas próprias, sem cookies. Localização por IP no servidor; o IP não
  é armazenado."

## 9. O painel

Aplicação de página única (`gestor/index.html` + `gestor.js` + `gestor.css`), roteamento por
hash. Menu lateral (vira barra inferior no celular):

1. **Visão geral** (métricas)
2. **Início** (textos do hero, botões, tags, cartões 01/02/03, chave do painel demonstrativo, carrossel)
3. **Diagnóstico** · 4. **Processos** · 5. **Dashboard** · 6. **Modelos** · 7. **Serve / não serve** · 8. **FAQ** · 9. **Contato e rodapé**
10. **Produtos** (lista com ordenar, ativar, novo; formulário por produto com blocos)
11. **Site** (título da aba, descrições, WhatsApp, e-mail, cidade, nota)
12. **Usuários** (só admin) · **Minha conta** (nome, trocar senha, sair)

Barra superior fixa: estado ("Tudo publicado" / "Alterações não publicadas"), botões
**Visualizar**, **Publicar**, **Descartar**. Publicar abre confirmação com o resumo do que
mudou (seções e contagem de imagens), mostra progresso e o resultado.

Formulários são gerados por um construtor pequeno a partir de descrições de campos
(`texto`, `multilinha`, `numero`, `cor`, `chave`, `lista de textos`, `lista de objetos`,
`imagem`, `blocos`), com validação igual à do servidor (limites e obrigatórios) e ajuda
curta em cada campo (ex.: "Use *asteriscos* para o trecho em destaque"). Listas têm
adicionar, remover, duplicar e mover para cima/baixo. Blocos têm um menu "Adicionar bloco"
com os cinco tipos. O campo de imagem mostra a miniatura, aceita arrastar e soltar, e faz o
redimensionamento antes de enviar.

Visual: fontes Sora/Inter/IBM Plex Mono e as cores da marca (`--ink`, `--blue`, `--orange`,
`--mist`), fundo claro, densidade de ferramenta (mais compacto que o site). Funciona a
partir de 360 px de largura.

## 10. Servidor (`server.js`)

Ordem de atendimento:

1. Redirecionamento de host/https (como hoje).
2. `POST /api/evento` → `metricas.registrar`.
3. `/gestor` e `/gestor/...` → `painel.atender` (login, casca, assets do painel, API).
4. Demais métodos além de GET/HEAD → 405.
5. Site estático (como hoje), com as exclusões da seção 3.

Rotas da API do painel (todas sob `/gestor/api/`, JSON, exigem sessão salvo `entrar`):

| Rota | Método | Função |
|---|---|---|
| `entrar` | POST | e-mail + senha → cookie |
| `sair` | POST | limpa o cookie |
| `eu` | GET | usuário atual, papel, `trocarSenha`, estado do GitHub (token presente/ausente) |
| `senha` | POST | trocar a própria senha |
| `conteudo` | GET | `site.json` publicado + `atualizadoEm` |
| `previa` | POST | HTML da página com o rascunho |
| `imagens` | POST | upload → `{ id, arquivo: "pendente:<id>", largura, altura, bytes }` |
| `pendentes/<id>` | GET | serve uma imagem pendente |
| `publicar` | POST | fluxo da seção 5 |
| `publicacoes` | GET | últimas 20 publicações |
| `metricas?periodo=7|30|90` | GET | agregados da seção 8.3 |
| `usuarios` | GET/POST | listar / criar (admin) |
| `usuarios/<id>` | PATCH | nome, e-mail, ativo, admin, redefinir senha (admin) |

Fora da API, sob `/gestor/`: `login.html` e `gestor.css` são públicos; `index.html` e
`gestor.js` exigem sessão (sem ela, redirecionam para o login). Nada de `gestor/` sai pelo
servidor estático.

Limites de corpo: 2 MB para JSON, 5 MB para upload. Respostas de erro:
`{ erro: "mensagem em português", campo?: "caminho.do.campo" }`.

Variáveis de ambiente:

| Variável | Uso | Padrão |
|---|---|---|
| `PORT` | porta | 3000 |
| `DADOS_DIR` | disco persistente | `RAILWAY_VOLUME_MOUNT_PATH` ou `./dados` |
| `GESTOR_EMAIL`, `GESTOR_SENHA_INICIAL` | primeiro usuário | — |
| `GESTOR_RESET_SENHA` | escape para redefinir a senha do primeiro usuário | — |
| `GITHUB_TOKEN` | publicar | — (sem ele: modo local / bloqueado no Railway) |
| `GITHUB_REPO` | repositório | `joaobaidarolimnet-svg/baishift` |
| `GITHUB_BRANCH` | branch | `main` |

## 11. Segurança (resumo)

- Todo valor do JSON passa por escape antes de entrar no HTML; as marcações são aplicadas
  depois do escape e só geram `em`, `strong`, `a` (com `href` filtrado), `br` e `p`.
- Cores validadas como hex; links de botões só `http(s)`, `mailto:`, `#` ou caminho `/`.
- Upload: assinatura do arquivo, tamanho, nome pelo servidor, sem SVG.
- Sessão assinada, cookie `HttpOnly`/`Secure`/`SameSite=Strict`, senha com `scrypt`,
  comparação em tempo constante, bloqueio por tentativas, erro genérico no login.
- API do painel: `SameSite=Strict` + cabeçalho `X-Gestor` + `Content-Type` JSON.
- Cabeçalhos do painel: `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  `Cache-Control: no-store`, `Content-Security-Policy` com `default-src 'self'`, fontes
  do Google e `img-src 'self' data: blob:` (miniaturas antes do envio).
- Métricas: sem IP gravado, sem cookies, limite por IP, corpo validado.
- Token do GitHub restrito a um repositório e só a "Contents: read and write"; fica só no
  Railway. O painel nunca o expõe (o `eu` diz apenas se existe).

## 12. Testes

`npm test` = `node --test test/`. Sem dependências.

- `render.test.js`: escape de `<script>` em todo campo; marcações (`*`, `**`, link válido e
  inválido, parágrafos); os três estados do visual do início; carrossel com 1 e 3 imagens;
  menu Outros com 0, 1 e 3 produtos ativos; página de produto com cada tipo de bloco, com
  e sem capa, com e sem lista de espera; FAQ no HTML e no JSON-LD; sitemap só com ativos.
- `conteudo.test.js`: limites de tamanho e de contagem; slug inválido/duplicado; cor
  inválida; link inválido; imagem referenciada inexistente; mensagens apontam o campo.
- `auth.test.js`: hash/verificação de senha; cookie válido, vencido, assinatura errada,
  `versaoSenha` antiga; bloqueio após 5 erros e liberação após 15 min (relógio injetado);
  regras de papel (primeiro usuário, autodesativação).
- `metricas.test.js`: classificação de origem e dispositivo; filtro de robôs; hash diário;
  agregação de um conjunto de eventos de exemplo (visitas, únicos, seções, cliques,
  carrossel, produtos, comparação com período anterior); cache de geolocalização e tempo
  limite (fetch simulado).
- `publicar.test.js`: com `fetch` simulado, verifica blobs, árvore (inclusive remoções),
  commit e atualização da referência; segunda tentativa após conflito; nenhuma gravação
  local quando o GitHub falha; modo local sem token; bloqueio no Railway sem token;
  materialização de pendentes e coleta de imagens órfãs.
- `imagens.test.js`: assinaturas JPEG/PNG/WebP/GIF aceitas, SVG e texto recusados; limite
  de tamanho; nome por conteúdo.
- `servidor.test.js`: sobe o servidor numa porta livre e confere: `/gestor` sem sessão →
  login; API sem sessão → 401; sem cabeçalho `X-Gestor` → 403; `POST /api/evento` grava;
  `lib/`, `templates/`, `gestor/`, `conteudo/site.json` não são servidos; páginas geradas
  saem com `?v=`.

Verificação da migração (feita uma vez, à mão): o `index.html` e os `outros/*.html`
gerados a partir do `site.json` inicial devem ser idênticos aos atuais, exceto pelas
mudanças intencionais (caminhos `/assets/...`, comentário de "gerado", marcações de
métricas nos botões e seções, script do carrossel). O `tools/verify.mjs` continua passando.

## 13. Entrada no ar

1. `railway volume add --mount-path /data` no serviço `app` (o Railway reinicia o serviço).
2. No Railway (serviço `app` → Variables): `GESTOR_EMAIL=joaobaidarolimnet@gmail.com`,
   `GESTOR_SENHA_INICIAL=12345689`, `GITHUB_TOKEN=<token>`. O token é criado pelo gestor em
   GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens →
   Generate new token → Repository access: *Only select repositories* → `baishift` →
   Repository permissions → *Contents: Read and write* → prazo máximo → Generate. O gestor
   cola o valor direto no Railway, sem passar pelo chat.
3. `git push` da implementação. Conferir no log do deploy: "conteúdo gerado", "usuário
   inicial criado", "disco persistente em /data", "GitHub: token presente".
4. Abrir `/gestor`, entrar, trocar a senha, publicar uma mudança pequena, conferir o commit
   no GitHub e o site.
5. README atualizado: estrutura nova, "não edite `index.html`, edite `conteudo/site.json`
   ou use o painel", variáveis, volume, token (e o que fazer quando vencer), privacidade
   das métricas, `GESTOR_RESET_SENHA`.

## 14. Ordem de implementação sugerida

1. `conteudo/site.json` + `templates/` + `lib/render.js` + `lib/conteudo.js` +
   `tools/build-site.mjs`; gerar e comparar com o site atual; testes de render/conteúdo.
2. Carrossel e marcações de métricas no `site.css`/`site.js`.
3. `lib/dados.js`, `lib/auth.js`, rotas de login/sessão/usuários; testes.
4. `lib/imagens.js`, `lib/publicar.js` (modo local e GitHub); testes.
5. `lib/metricas.js` + `POST /api/evento` + beacon no site; testes.
6. Painel (`gestor/`): casca, login, troca de senha, formulários de conteúdo, produtos com
   blocos, imagens, visualizar/publicar, usuários, visão geral.
7. README, robots, volume e variáveis no Railway, publicação e verificação no ar.
