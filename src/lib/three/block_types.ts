import * as THREE from 'three';

export enum Block {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  RedFlower = 4,
  OrangeFlower = 5,
  PinkFlower = 6,
  WhiteFlower = 7,
  Gizmos = 8,
}

export type WorldConfiguration = { 
  CHUNK: number
  CAMERA_INITIAL_POSITION: THREE.Vector3
  WORLD_BASE_BLOCK: Block
  RENDERER_CONFIG: THREE.WebGLRendererParameters
};
