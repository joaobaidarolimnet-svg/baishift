# baishift.com.br

Site institucional da **Baishift** — gestão, processos e software para provedores de internet.

Site estático, sem framework e sem etapa de build. Os gráficos são desenhados em SVG
por JavaScript próprio, sem nenhuma biblioteca externa. As únicas requisições a
terceiros são as fontes do Google Fonts.

## Estrutura

```
index.html              página única, com todas as seções
404.html                página de erro
assets/css/site.css     estilos (paleta, componentes, responsivo)
assets/js/site.js       motor de gráficos SVG, menu, revelações
assets/img/             favicon, ícones do app e imagem de compartilhamento
robots.txt              liberação para buscadores + aponta o sitemap
sitemap.xml             mapa do site
site.webmanifest        manifesto (instalação como app)
favicon.ico             ícone para navegadores antigos
dist/                   versão em arquivo único (gerada)
tools/                  scripts de geração de imagens e verificação
```

## Rodar localmente

O site precisa ser servido por HTTP — os caminhos dos assets começam com `/`.

```bash
python3 -m http.server 8899
# abra http://localhost:8899
```

## Publicar

Basta subir a raiz do projeto. Não há compilação.

- **Cloudflare Pages / Netlify / Vercel** — conecte o repositório, deixe o comando de
  build vazio e o diretório de publicação como `/`.
- **GitHub Pages** — publique a branch na raiz e aponte o domínio em Settings › Pages.
- **Hospedagem tradicional (cPanel, FTP)** — copie todos os arquivos para `public_html`.

Depois de publicar, confirme que o domínio responde em HTTPS e que
`https://baishift.com.br/sitemap.xml` abre. Em seguida cadastre o site no
[Google Search Console](https://search.google.com/search-console).

### O que trocar antes de ir ao ar

| Onde | O quê |
|---|---|
| `index.html` — rodapé | comentário com o modelo de botão do WhatsApp: preencha `wa.me/55DDDNUMERO` |
| `index.html` — JSON-LD | acrescente `telephone` e o CNPJ, se quiser aparecer no perfil da empresa |
| `sitemap.xml` | atualize `<lastmod>` quando mudar o conteúdo |

Se o domínio final for diferente de `baishift.com.br`, troque também as URLs absolutas
em `index.html` (canonical, `og:*`, JSON-LD), `robots.txt` e `sitemap.xml`.

## Manutenção

**Números dos painéis.** Todos os dados de demonstração ficam no bloco
`DADOS DO PAINEL DEMONSTRATIVO`, no fim de `assets/js/site.js`. São ilustrativos, como
avisa a nota no rodapé da página. Para trocar um gráfico, mude o array correspondente
(`REC`, `DES`, `ATIV`, `CANC`) ou o objeto passado na chamada `on("id", ...)`.

**Fluxo do pedido ao caixa.** Editável no array `STEPS`, no mesmo arquivo.

**Cores e tipografia.** Variáveis CSS no `:root` de `assets/css/site.css`.

## Scripts auxiliares

```bash
node tools/build-single.mjs    # gera dist/baishift-site.html (CSS e JS embutidos)
./tools/shot.sh tools/og.html assets/img/og.png 1200 630   # regera a imagem de compartilhamento
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
