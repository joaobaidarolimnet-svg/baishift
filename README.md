# baishift.com.br

Site institucional da **Baishift** — gestão, processos e software para provedores de internet.

Site estático, sem framework e sem etapa de build. Os gráficos são desenhados em SVG
por JavaScript próprio, sem nenhuma biblioteca externa. As únicas requisições a
terceiros são as fontes do Google Fonts.

## Estrutura

O site é uma página única organizada em **três frentes** — Diagnóstico, Consultoria de
processos e Dashboard — mais modelos de contratação, FAQ e contato. O menu **Outros**
leva às landing pages dos produtos fora do provedor.

```
index.html              página principal: hero, 01 Diagnóstico, 02 Processos, 03 Dashboard, modelos, FAQ, contato
outros/*.html           landing pages de Severino, Aprova · Ordem e Aprova · Suficiência (geradas)
404.html                página de erro
assets/css/site.css     estilos (paleta, componentes, responsivo, landing pages)
assets/js/site.js       motor de gráficos SVG, animações contínuas, menu, formulários
assets/marca/           kit oficial da marca (logos, ícones, favicons e o guia marca-baishift.html)
assets/img/             favicon e ícones do app (copiados do kit) e imagem de compartilhamento
server.js               servidor estático (Railway): URLs limpas, cache versionado, 404
robots.txt · sitemap.xml · site.webmanifest · favicon.ico
dist/                   versão em arquivo único (gerada)
tools/                  geradores (landing pages, arquivo único, imagens) e verificação
```

**Gráficos em movimento contínuo.** Frente 01: `dataPath()` — fontes (ERP, Omnichannel,
Recebimentos, Pagamentos) → núcleo vertical Baishift Gestão → Painel, alta/baixa
performance, Fechamento, com pacotes percorrendo os fios e um feixe descendo o núcleo.
Frente 02: `procFlow()` — Negociação → Viabilidade → Venda → Instalação → Faturamento,
com fita de volume e pacotes. Frente 03: `liveLine()` (monitor de recebimentos que anda
sozinho), painéis com troca de período (`renderPanels`), feed de eventos e contadores.
Tudo pausa com a aba em segundo plano ou o elemento fora da tela.

## Rodar localmente

O site precisa ser servido por HTTP — os caminhos dos assets começam com `/`.

```bash
python3 -m http.server 8899
# abra http://localhost:8899
```

## Publicar

O site está no ar no **Railway**, que lê do GitHub e republica sozinho a cada push.

- **Endereço atual:** https://app-production-db06.up.railway.app
- **Repositório:** https://github.com/joaobaidarolimnet-svg/baishift
- **Projeto Railway:** `baishift` › serviço `app`

O Railway executa um processo em vez de servir arquivos parados, então o site é
entregue por `server.js` — um servidor estático em Node, sem nenhuma dependência.
Ele resolve caminhos apenas dentro da pasta do site (barrando `../`, inclusive
percent-encoded, e qualquer trecho oculto como `.git/`), devolve o `404.html` com
status 404 e não serve os arquivos de projeto (`server.js`, `package.json`,
`README.md`, `tools/`, `dist/`).

Aceita URLs limpas: `/a/b/c` encontra `a/b/c.html` ou `a/b/c/index.html`. Para
acrescentar uma página nova, basta criar o arquivo — `servicos.html` fica disponível
em `/servicos`.

**Cache.** O servidor versiona o CSS e o JS pelo conteúdo: o HTML sai com
`site.css?v=<hash>`, então cada publicação força o navegador a baixar o arquivo novo,
e o arquivo em si pode ficar um ano em cache. O HTML é sempre revalidado (`no-cache`
+ ETag). Não é preciso trocar nome de arquivo nem "limpar cache" depois de publicar.

Para atualizar, basta enviar para a `main`:

```bash
git add -A && git commit -m "descrição da mudança" && git push
```

Rodar o servidor de produção localmente:

```bash
PORT=8900 npm start     # abra http://localhost:8900
```

### Ligar o domínio baishift.com.br

O DNS do domínio está na **Locaweb**. No Railway, adicione o domínio ao serviço:

```bash
railway domain baishift.com.br
railway domain status <id>      # mostra o registro exato a criar
```

O Railway devolve um destino `CNAME`. Como `baishift.com.br` é domínio raiz (apex) e
a Locaweb não faz CNAME na raiz, o caminho usual é:

| Tipo | Nome | Valor |
|---|---|---|
| CNAME | `www` | (o destino que o Railway informar) |
| — | `@` (raiz) | redirecionamento da Locaweb de `baishift.com.br` para `www.baishift.com.br` |

Se preferir o domínio raiz direto, é possível colocar a Cloudflare na frente (CNAME
achatado na raiz). Depois de propagar, confira com `railway domain status <id>` até o
certificado ficar emitido.

### O que trocar antes de ir ao ar

| Onde | O quê |
|---|---|
| `index.html` — rodapé | comentário com o modelo de botão do WhatsApp: preencha `wa.me/55DDDNUMERO` |
| `index.html` — JSON-LD | acrescente `telephone` e o CNPJ, se quiser aparecer no perfil da empresa |
| `sitemap.xml` | atualize `<lastmod>` quando mudar o conteúdo |

Se o domínio final for diferente de `baishift.com.br`, troque também as URLs absolutas
em `index.html` (canonical, `og:*`, JSON-LD), `robots.txt` e `sitemap.xml`.

## Contato: WhatsApp e formulário

Os botões de WhatsApp e o formulário do rodapé leem uma configuração no `<head>` do
`index.html`:

```html
window.BAISHIFT = { whatsapp: "", email: "contato@baishift.com.br" };
```

- **Com o número preenchido** (só dígitos, com DDI e DDD — ex.: `5569999999999`): todos os
  botões viram links `wa.me` com mensagem pronta, e o formulário abre o WhatsApp com os
  campos preenchidos.
- **Vazio**: os botões de WhatsApp levam ao formulário, e o formulário abre o e-mail do
  visitante com a mensagem pronta. Nada fica quebrado enquanto o número não existe.

O formulário não depende de servidor: monta a mensagem e entrega no canal configurado.

## Manutenção

**Números dos painéis.** Todos os dados de demonstração ficam no bloco
`DADOS DO PAINEL DEMONSTRATIVO`, no fim de `assets/js/site.js`. São ilustrativos, como
avisa a nota no rodapé da página. Para trocar um gráfico, mude o array correspondente
(`REC`, `DES`, `ATIV`, `CANC`) ou o objeto passado na chamada `on("id", ...)`.

**Processo ao vivo.** Etapas, volumes e tempos no array `STEPS` de `site.js`. Os quatro
números da frente 01 e o quadro "O que o processo mostra" precisam contar a mesma história
(214 vendidos → 169 instalados → 45 parados × R$ 104 = R$ 4.680/mês).

**Caminho dos dados.** Fontes e saídas nos arrays `S` e `O` dentro de `dataPath()`.

**Painéis por período.** Dados de 7 dias, 30 dias e 12 meses no objeto `PANELS`.

**Landing pages.** Textos em `tools/build-outros.mjs`; rode o script para regerar.

**Feed de eventos do painel.** Lista `EV` dentro de `feed()`.

**FAQ.** As perguntas estão duas vezes: no HTML (`<details>`) e no JSON-LD `FAQPage`
no fim do `index.html`. Ao mudar uma, mude a outra.

**Marca.** O kit oficial está em `assets/marca/` (guia em `marca-baishift.html`). O
cabeçalho usa `baishift-principal.svg` sobre fundo claro e `baishift-branco.svg` sobre
o hero escuro (troca automática pela classe `on-dark` da barra); o rodapé e o diagrama
usam a versão branca. Regras do guia: AI sempre laranja e dentro da caixa, versão
branca sobre fundo escuro, mínimo de 140 px de largura, sem sombra ou inclinação.
Favicon e ícones do app são cópias de `03-favicon/` e `02-icone/`.

**Cores e tipografia.** Variáveis CSS no `:root` de `assets/css/site.css`.

## Scripts auxiliares

```bash
node tools/build-outros.mjs    # regera as landing pages de outros/ a partir dos textos no script
node tools/build-single.mjs    # gera dist/baishift-site.html (CSS, JS e logos embutidos)
./tools/shot.sh tools/og.html assets/img/og.png 1200 630   # regera a imagem de compartilhamento (usa a logo do kit)
```

`tools/verify.mjs` abre o site no Chrome headless, rola a página inteira, confere que
todos os gráficos montaram, mede transbordo horizontal e reporta erros de console.
Requer o Chrome rodando com `--remote-debugging-port=9333` e o servidor local no ar.

## Acessibilidade e desempenho

- Navegação por teclado com link "pular para o conteúdo" e foco visível.
- `prefers-reduced-motion` desliga animações, pulsos e transições.
- Animações em `requestAnimationFrame` param quando a aba fica em segundo plano ou o
  elemento sai da tela.
- Sem JavaScript, o conteúdo continua visível (`<noscript>` neutraliza as revelações).
- Uma falha em qualquer gráfico não derruba o restante da página.
- Contadores, feed de eventos e pacotes animados param com a aba em segundo plano.
