const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:1366,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8124/vale/',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.getByText('English',{exact:true}).click(); await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>[...document.querySelectorAll('.tx-note')].map(e=>e.textContent.slice(0,90)).join('\n')));
console.log(errs.join('\n')||'sem erros'); await b.close(); })();
