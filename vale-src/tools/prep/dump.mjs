// dump das posições e normais (mundo) de um GLB para float32: x y z nx ny nz por vértice
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]);
const out = [];
for (const node of doc.getRoot().listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const M = node.getWorldMatrix();
  for (const p of mesh.listPrimitives()) { const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'); const a = [], n = [];
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, a); N.getElement(i, n);
      const x = M[0]*a[0]+M[4]*a[1]+M[8]*a[2]+M[12], y = M[1]*a[0]+M[5]*a[1]+M[9]*a[2]+M[13], z = M[2]*a[0]+M[6]*a[1]+M[10]*a[2]+M[14];
      const nx = M[0]*n[0]+M[4]*n[1]+M[8]*n[2], ny = M[1]*n[0]+M[5]*n[1]+M[9]*n[2], nz = M[2]*n[0]+M[6]*n[1]+M[10]*n[2]; const l = Math.hypot(nx, ny, nz) || 1;
      out.push(x, y, z, nx/l, ny/l, nz/l); } } }
fs.writeFileSync(process.argv[3], Buffer.from(new Float32Array(out).buffer)); console.log(out.length / 6, 'verts');
