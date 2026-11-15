// Capturas do vale. Uso: node shot.cjs '<json>'   (servidor em localhost:8124, ver CONTEXTO.md)
// json: { out: "pasta", w: 1366, h: 768, mobile: false, theme: "light", wait: 9000, raw: false,
//         base: outra URL (ex.: http://localhost:3111/ com `next start` e o banco de mentira em tools/test/mock.cjs)
//         shots: [ { name, cam: [[x,y,z],[tx,ty,tz]], js: "código antes", time: 123, wait: 1500, clip: {x,y,width,height} } ] }
// raw: usa vale-src/vale.js sem minificar (stack legível). time: fixa o relógio do vale naquele quadro.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const cfg = JSON.parse(process.argv[2]); const out = cfg.out || 'f'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(cfg.mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: cfg.w || 1366, height: cfg.h || 768 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const errs = []; p.on('pageerror', (e) => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 600)); });
  if (cfg.raw) for (const f of ['vale.js', 'mundos.js']) await p.route('**/vale/' + f, (r) => r.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8'), contentType: 'text/javascript' }));
  if (cfg.init) await p.addInitScript(cfg.init);
  await p.goto((cfg.base || 'http://localhost:8124/vale/') + (cfg.query || ''), { waitUntil: 'load' }); await p.waitForTimeout(1500);
  if (cfg.pre) await p.evaluate(cfg.pre);
  if (!cfg.noLang) await p.getByText('Português', { exact: true }).click();
  const theme = cfg.theme || 'light';
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme); await p.waitForTimeout(cfg.wait || 9000);
  for (const s of cfg.shots || []) {
    await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, s.theme || theme);
    if (s.js) { const r = await p.evaluate(s.js); if (r !== undefined) console.log(s.name, JSON.stringify(r)); }
    if (s.click) await p.mouse.click(s.click[0], s.click[1]);
    if (s.cam) await p.evaluate(([c, t]) => window.vale.cam(c, t), s.cam);
    if (s.time != null) { await p.evaluate((t) => window.vale.time(t), s.time); await p.waitForTimeout(s.settle || 700); await p.evaluate((t) => window.vale.time(t), s.time); }
    await p.waitForTimeout(s.wait || 1200);
    if (s.name) await p.screenshot({ path: `${out}/${s.name}.png`, clip: s.clip });
  }
  console.log(errs.length ? [...new Set(errs)].join('\n') : 'sem erros'); await b.close();
})();
