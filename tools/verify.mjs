import { writeFileSync } from "node:fs";
const PORT = 9333;
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(t.find(x => x.type === "page").webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === "Runtime.consoleAPICalled" && ["error","warning"].includes(m.params.type))
    errors.push(m.params.type + ": " + m.params.args.map(a => a.value ?? a.description).join(" "));
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push("LOG: " + m.params.entry.text);
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = expression => send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then(r => r.result?.value);
const wait = ms => new Promise(r => setTimeout(r, ms));
await new Promise(r => ws.addEventListener("open", r));
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");

async function load(w, h, mobile) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile, screenWidth: w, screenHeight: h });
  await send("Page.navigate", { url: "http://127.0.0.1:8899/" });
  await wait(2600);
}
async function scrollAll() {
  await ev(`(async()=>{const H=document.documentElement.scrollHeight;
    for(let y=0;y<H;y+=Math.round(window.innerHeight*0.7)){window.scrollTo(0,y);
      await new Promise(r=>setTimeout(r,140));}
    window.scrollTo(0,H);await new Promise(r=>setTimeout(r,500));window.scrollTo(0,0);
    await new Promise(r=>setTimeout(r,400));return 1;})()`);
}
async function shot(name, full) {
  const d = full ? JSON.parse(await ev(`JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})`)) : null;
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!full,
    ...(full ? { clip: { x: 0, y: 0, width: d.w, height: Math.min(d.h, 20000), scale: full === "half" ? 0.42 : 1 } } : {}) });
  writeFileSync(`tools/${name}.png`, Buffer.from(s.data, "base64"));
  console.log(name + ".png");
}

/* desktop: rola tudo para disparar as revelações, depois captura a página inteira */
await load(1440, 900, false);
await scrollAll();
const revel = await ev(`JSON.stringify({total:document.querySelectorAll('.rv').length,visiveis:document.querySelectorAll('.rv.in').length})`);
console.log("revelações:", revel);
await shot("full-desktop", "half");

/* mobile: menu */
await load(390, 844, true);
await ev(`document.getElementById('navtoggle').click()`); await wait(420);
const menuAberto = await ev(`JSON.stringify({aberto:document.getElementById('navlinks').classList.contains('open'),
  expanded:document.getElementById('navtoggle').getAttribute('aria-expanded'),
  altura:Math.round(document.getElementById('navlinks').getBoundingClientRect().height),
  itens:document.querySelectorAll('#navlinks a').length})`);
console.log("menu mobile:", menuAberto);
await shot("mobile-menu", false);
await ev(`document.getElementById('navtoggle').click()`); await wait(320);
await scrollAll();
await shot("full-mobile", "half");

/* medições finais */
const check = await ev(`JSON.stringify({
  overflowX: document.documentElement.scrollWidth > window.innerWidth,
  scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  svgs: document.querySelectorAll('svg').length,
  chartsVazios: [...document.querySelectorAll('.chart')].filter(c=>!c.querySelector('svg')).length,
  kpiReceita: document.getElementById('k2').textContent
})`);
console.log("mobile 390px:", check);
console.log("\nErros de console:", errors.length ? "\n  " + errors.join("\n  ") : "nenhum");
ws.close();
