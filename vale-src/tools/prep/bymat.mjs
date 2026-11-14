import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]);
const t = new Map();
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
  const m = p.getMaterial(); const k = (m ? m.getName() : 'none') + ' ' + (m ? m.getBaseColorFactor().map(v=>v.toFixed(2)).join(',') : '') + ' col:' + !!p.getAttribute('COLOR_0');
  const i = p.getIndices(); const n = (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3;
  const e = t.get(k) || [0, []]; e[0] += n; if (e[1].length < 4) e[1].push(mesh.getName()); t.set(k, e);
}
for (const [k, [n, ms]] of t) console.log(Math.round(n), k, ms.join('|'));
