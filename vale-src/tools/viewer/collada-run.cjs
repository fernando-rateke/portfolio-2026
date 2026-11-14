const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('PAGE', e.message));
await p.goto('http://localhost:8127/index.html');
await p.addScriptTag({ url: 'http://localhost:8127/conv.js' }); await p.waitForFunction(() => window.convert);
const r = await p.evaluate(() => window.convert('ramen/model.dae'));
console.log(r.info.join('\n')); fs.writeFileSync(process.argv[2], Buffer.from(r.b64, 'base64')); await b.close(); })();
