import * as THREE from 'three';
import { BlockRegistry } from './blocks';
import { createStandardMaterial } from './materials';
import { Block } from './block_types';

export type BlockMaterialDef = {
  type: Block;
  name: string;
  texture: string; // URL or hex color (e.g. "#003A4A")
  params?: Partial<THREE.MeshStandardMaterialParameters> | Partial<THREE.MeshDepthMaterialParameters>;
};

/**
 * Centralized list of blocks and their material sources.
 * 1) Add its enum in `lib/three/index.ts` (Block enum).
 * 2) Add an entry here with its texture or color + optional params.
 */
export const DEFAULT_BLOCKS: BlockMaterialDef[] = [
  { type: Block.Grass,       name: 'Grass',        texture: '/grass.jpg' },
  { type: Block.Dirt,        name: 'Dirt',         texture: '/dirt.png' },
  { type: Block.Stone,       name: 'Stone',        texture: '/stone.png' },
  { type: Block.RedFlower,   name: 'Red Flower',   texture: '/flower_red.png',   params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.OrangeFlower,name: 'Orange Flower',texture: '/flower_orange.png',params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.PinkFlower,  name: 'Pink Flower',  texture: '/flower_pink.png',  params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.WhiteFlower, name: 'White Flower', texture: '/flower_white.png', params: { side: THREE.DoubleSide, transparent: true } },
  // Overlay/utility material (semi transparent gizmos)
  { type: Block.Gizmos,      name: 'Gizmos',       texture: '#003A4A', params: {
      opacity: 0.1,
      depthWrite: false,
      depthTest: true,
      blending: THREE.LessDepth as any, // keep existing choice
      side: THREE.FrontSide,
      transparent: true,
    }
  },
];

/**
 * Builds a BlockRegistry from a list of block material definitions.
 * Pass a custom `defs` if you want to override or extend defaults.
 */
export function createDefaultBlockRegistry(
  loader: THREE.TextureLoader,
  defs: BlockMaterialDef[] = DEFAULT_BLOCKS
): BlockRegistry {
  const registry = new BlockRegistry();
  for (const def of defs) {
    const mat = createStandardMaterial(def.texture, loader, def.params);
    registry.register({ type: def.type, name: def.name, material: mat });
  }
  return registry;
}
