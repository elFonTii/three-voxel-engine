import * as THREE from 'three';
import { Block } from './block_types';

export type BlockKey = keyof typeof Block;

export interface BlockDescriptor {
  type: Block;
  name: string;
  material: THREE.Material;
}

export class BlockRegistry {
  private byType = new Map<Block, BlockDescriptor>();

  register(desc: BlockDescriptor) {
    this.byType.set(desc.type, desc);
  }

  materialOf(type: Block): THREE.Material {
    const d = this.byType.get(type);
    if (!d) throw new Error(`Material no registrado para Block ${type}`);
    return d.material;
  }

  /** Por si quieres iterar materiales para dispose() */
  allMaterials(): THREE.Material[] {
    return [...this.byType.values()].map(d => d.material);
  }
}
