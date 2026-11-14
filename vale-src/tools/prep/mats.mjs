import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMaterials()) console.log(m.getName(), 'base:', !!m.getBaseColorTexture(), 'normal:', !!m.getNormalTexture(), 'mr:', !!m.getMetallicRoughnessTexture(), 'emit:', !!m.getEmissiveTexture(), 'occ:', !!m.getOcclusionTexture(), 'alpha:', m.getAlphaMode(), 'side2:', m.getDoubleSided(), 'cor:', m.getBaseColorFactor().map(v=>v.toFixed(2)).join(','));
