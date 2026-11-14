// prepara um modelo para o vale: texturas certas, malha simplificada, texturas em webp menores
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, textureCompress, prune, join, flatten, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const [, , input, output, cfgPath] = process.argv;
const cfg = cfgPath ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
// texturas e cores por material
for (const m of root.listMaterials()) {
  const c = (cfg.materials || {})[m.getName()];
  if (!c) continue;
  if (c.tex) { const t = doc.createTexture(c.tex).setImage(fs.readFileSync(c.tex)).setMimeType(c.tex.endsWith('.png') ? 'image/png' : 'image/jpeg'); m.setBaseColorTexture(t); }
  if (c.color) m.setBaseColorFactor(c.color);
  if (c.alpha != null) { m.setAlphaMode('BLEND'); const f = m.getBaseColorFactor(); f[3] = c.alpha; m.setBaseColorFactor(f); }
  if (c.drop) for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) if (p.getMaterial() === m) { mesh.removePrimitive(p); p.dispose(); }
}
// só a cor importa no vale: tira relevo, rugosidade, brilho e oclusão
if (cfg.stripMaps) for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setEmissiveTexture(null); m.setOcclusionTexture(null); m.setEmissiveFactor([0, 0, 0]); }
if (cfg.opaque) for (const m of root.listMaterials()) m.setAlphaMode('OPAQUE');
if (cfg.stripColors) for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('COLOR_0', null);
if (cfg.flipV) for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { const uv = p.getAttribute('TEXCOORD_0'); if (!uv) continue; const a = uv.getArray().slice(); for (let i = 1; i < a.length; i += 2) a[i] = 1 - a[i]; uv.setArray(a); }
if (cfg.mask) for (const m of root.listMaterials()) if (m.getAlphaMode() === 'BLEND' && m.getBaseColorTexture()) { m.setAlphaMode('MASK'); m.setAlphaCutoff(0.5); }
await MeshoptSimplifier.ready;
const ops = [dedup()];
if (cfg.flatten) ops.push(flatten(), join());
if (cfg.ratio && cfg.ratio < 1) ops.push(weld({}), simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error || 0.002, lockBorder: !!cfg.lockBorder }));
ops.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.texSize || 1024, cfg.texSize || 1024], quality: 82 }), prune());
await doc.transform(...ops);
await io.write(output, doc);
let tris = 0; for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
console.log(output, (fs.statSync(output).size / 1e6).toFixed(2), 'MB', Math.round(tris), 'tris');
