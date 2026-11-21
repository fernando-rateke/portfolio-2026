import { ColladaLoader } from "../node_modules/three/examples/jsm/loaders/ColladaLoader.js";
import { GLTFExporter } from "../node_modules/three/examples/jsm/exporters/GLTFExporter.js";
window.convert = (url) => new Promise((res, rej) => new ColladaLoader().load(url, (c) => {
  const s = c.scene; s.updateMatrixWorld(true);
  const info = []; s.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; info.push(o.name + ':' + ms.map((m) => m.name).join('|') + ':' + o.geometry.attributes.position.count); ms.forEach((m) => { m.map = null; }); } });
  new GLTFExporter().parse(s, (buf) => { const b = new Uint8Array(buf); let str = ''; for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); res({ info, b64: btoa(str) }); }, rej, { binary: true });
}, undefined, rej));
window.ready = true;
