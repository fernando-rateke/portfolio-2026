const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:1366,height:768}}); p.setDefaultTimeout(120000);
const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message));
await p.goto('http://localhost:8124/vale/',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.getByText('Português',{exact:true}).click();
await p.evaluate(()=>{ document.documentElement.dataset.theme='light'; }); await p.waitForTimeout(+(process.env.W||12000)); await p.evaluate(()=>{ document.documentElement.dataset.theme='light'; });
const shots = JSON.parse(process.argv[2]);
for (const [name, cam, tgt, wait, mouse] of shots) {
  await p.evaluate(([c,t])=>window.vale.cam(c,t),[cam,tgt]);
  if (mouse) await p.mouse.move(mouse[0], mouse[1], {steps: 8});
  await p.waitForTimeout(wait||2500); await p.screenshot({path:`f/${name}.png`});
}
console.log(errs.join('\n')||'sem erros'); await b.close(); })();
