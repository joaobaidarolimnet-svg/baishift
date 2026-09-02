# BaiShift — Identidade visual

Abra `identidade-baishift.html` no celular ou no navegador: é o guia completo,
com paleta clicável e todas as versões da marca.

## A marca

**BAISHIFT** em caixa alta. O "AI" em laranja dentro de uma caixa arredondada — é o
que separa o sobrenome (Bai), a inteligência artificial (AI) e a mudança (Shift) numa
palavra só. A seta ao final, divisa em cima e triângulo vazado embaixo, fecha a leitura
de movimento e serve como símbolo isolado.

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Azul BaiShift | `#142F7A` | Cor principal — letras e fundos |
| Azul Profundo | `#0E2258` | Faixas escuras e gradientes |
| Azul Claro | `#2A4FA8` | Topo do gradiente, estados ativos |
| Laranja IA | `#EF562E` | O AI, a caixa e a seta |
| Laranja Claro | `#FF7A3D` | Sobre fundo escuro |
| Névoa | `#F4F7FC` | Fundo de tela e cartões |
| Linha | `#DDE5F3` | Bordas e divisórias |
| Cinza Texto | `#5B6E93` | Texto de apoio |

As mesmas variáveis estão em `tokens.css`, prontas para colar no site.

## Tipografia

- **Sora** 600 — títulos e números grandes
- **Inter** 400 a 600 — corpo, listas e formulários
- **IBM Plex Mono** — rótulos, códigos e dados

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

O logotipo é vetor desenhado — não depende de nenhuma fonte instalada.

## Pastas

### 01-logo
Principal, com assinatura, sem seta, branca, branca com caixa preenchida, duas
monocromáticas e a seta isolada em três cores. SVG e PNG transparente em alta.

### 02-icone
Ícone de app em SVG e PNG de 16 a 1024 px, `AppStore-1024.png` sem transparência,
`maskable-512.png` para Android e PWA, `baishift.ico` (Windows) e `baishift.icns` (macOS).

### 03-favicon
Tudo que vai na raiz do site: `favicon.ico`, `favicon.svg`, os PNGs,
`site.webmanifest`, a imagem de compartilhamento e `como-instalar.html` com as
tags prontas para o `<head>`.

### 04-social
Avatar 1000×1000, capa do LinkedIn, capa do Facebook, post 1080×1080,
story 1080×1920 e a imagem OG 1200×630.

### 05-papelaria
Cartão de visita frente e verso (90×50 mm) e a assinatura de e-mail em HTML —
basta trocar o endereço da imagem pelo do seu servidor.

## Regras

- Respiro em volta: no mínimo a altura da caixa do AI
- Tamanho mínimo: 140 px de largura; abaixo disso, use a versão sem a seta
- O AI é sempre laranja e sempre dentro da caixa
- Sobre fundo escuro use o laranja claro `#FF7A3D`
- Nunca girar, inclinar, esticar, aplicar sombra ou contorno
- Nunca usar a versão azul sobre fundo escuro
