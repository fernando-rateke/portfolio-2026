const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:1366,height:768}}); p.setDefaultTimeout(120000);
const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,200)); });
await p.goto('http://localhost:8124/vale/',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.getByText('Português',{exact:true}).click();
await p.waitForTimeout(3000); await p.evaluate(()=>window.mundos.open('arvore')); await p.waitForTimeout(8000);
await p.evaluate(()=>{ const a=document.getElementById('worldAction'); if(a) a.click(); });
for (let i=0;i<14;i++){ await p.waitForTimeout(3000); await p.screenshot({path:`f/toca-${i}.png`}); }
console.log(errs.join('\n')||'sem erros'); await b.close(); })();
