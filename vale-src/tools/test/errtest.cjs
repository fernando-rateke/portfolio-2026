const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('PAGE '+e.message+'\n'+e.stack));
await p.goto('http://localhost:8124/vale/',{waitUntil:'load'}); await p.waitForTimeout(5000); await b.close(); })();
