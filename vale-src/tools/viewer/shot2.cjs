const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:1200,height:800}}); p.setDefaultTimeout(600000);
p.on('pageerror',e=>console.log('PAGE',e.message));
await p.goto('http://localhost:8127/index.html'); await p.waitForFunction(()=>window.ready);
const [name, ...views] = process.argv.slice(2);
const f = await p.evaluate((u)=>window.load(u), name + '.glb'); console.log(name, JSON.stringify(f));
let k=0; for (const v of views) { const [az, el, zoom] = v.split(',').map(Number); await p.evaluate(([a,e,z])=>{ const f=window.fit; const r=f.r; window.fit.r = r*(z||1); window.shot(a,e); window.fit.r=r; },[az,el,zoom]); await p.screenshot({path:`ana/v-${name}-${k++}.png`}); }
await b.close(); })();
