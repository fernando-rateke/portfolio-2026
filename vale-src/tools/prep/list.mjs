import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const doc = await io.read(process.argv[2]);
for (const mesh of doc.getRoot().listMeshes()) for (const [i, p] of mesh.listPrimitives().entries()) {
  const pos = p.getAttribute('POSITION'), idx = p.getIndices(), uv = p.getAttribute('TEXCOORD_0');
  const mx = pos.getMax([]);
  const m = p.getMaterial();
  console.log(mesh.getName(), i, 'mat:', m && m.getName(), 'tris:', (idx ? idx.getCount() : pos.getCount()) / 3, 'min', pos.getMin([]).map(v=>v.toFixed(2)).join(','), 'max', mx.map(v=>v.toFixed(2)).join(','), 'uv:', !!uv, 'tex:', m && m.getBaseColorTexture() ? m.getBaseColorTexture().getName() : '-', 'cor:', m && m.getBaseColorFactor().map(v=>v.toFixed(2)).join(','));
}
