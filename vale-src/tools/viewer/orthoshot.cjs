const { chromium } = require('playwright');
// vista ortográfica exata da caixa do modelo, sombreada pela normal, para marcar regiões em coordenadas 0..1
(async () => {
const [name, view, out, colored] = process.argv.slice(2);
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage({viewport:{width:800,height:800}}); p.setDefaultTimeout(600000);
await p.goto('http://localhost:8127/index.html'); await p.waitForFunction(()=>window.ready);
await p.evaluate(async ([u, view, colored]) => {
  const T = window.THREE; const g = await new Promise((res) => new window.GLTFLoader().load(u, res));
  const sc = new T.Scene(); sc.background = new T.Color('#EEEEEE'); const root = g.scene; sc.add(root);
  root.traverse((o) => { if (o.isMesh) o.material = colored === '1' && o.geometry.attributes.color ? new T.MeshLambertMaterial({ vertexColors: true }) : new T.MeshNormalMaterial(); });
  sc.add(new T.HemisphereLight(0xffffff, 0x888888, 0.9)); const dl = new T.DirectionalLight(0xffffff, 0.6); dl.position.set(0.3, 1, 1); sc.add(dl);
  const box = new T.Box3().setFromObject(root), mn = box.min, mx = box.max, c = box.getCenter(new T.Vector3());
  let w, h, pos;
  if (view === 'front') { w = mx.x - mn.x; h = mx.y - mn.y; pos = new T.Vector3(c.x, c.y, mx.z + 100); }
  else if (view === 'right') { w = mx.z - mn.z; h = mx.y - mn.y; pos = new T.Vector3(mx.x + 100, c.y, c.z); }
  else if (view === 'left') { w = mx.z - mn.z; h = mx.y - mn.y; pos = new T.Vector3(mn.x - 100, c.y, c.z); }
  else if (view === 'back') { w = mx.x - mn.x; h = mx.y - mn.y; pos = new T.Vector3(c.x, c.y, mn.z - 100); }
  const cam = new T.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 10000); cam.position.copy(pos); cam.lookAt(c);
  const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(800, 800); document.body.innerHTML = ''; document.body.style.margin = 0; document.body.appendChild(r.domElement);
  r.render(sc, cam);
}, [name + '.glb', view, colored || '0']);
await p.screenshot({ path: out }); await b.close(); })();
