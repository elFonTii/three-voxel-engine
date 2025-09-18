export * from './blocks';
export * from './chunk';
export * from './controls';
export * from './dispose';
export * from './instancing';
export * from './materials';
export * from './textures';
export * from './resize';
export * from './renderer';
export * from './geometry';
export * from './scene';
export * from './input';
export * from './block_defs';
import * as THREE from 'three';
export * from './block_types';
import { Block, WorldConfiguration } from './block_types';

export const WorldConfiguraton: WorldConfiguration = { 
  CHUNK: 32,
  CAMERA_INITIAL_POSITION: new THREE.Vector3(0,20, 80),
  WORLD_BASE_BLOCK: Block.Stone,
  RENDERER_CONFIG: {
    antialias: true,
    alpha: true,
    depth: true,
    powerPreference: 'default'
  }
};

// CHUNK = 8 -> 8^3 = 512 voxels
// CHUNK = 16 -> 16^3 = 4096 voxels
// CHUNK = 32 -> 32^3 = 32768 voxels
