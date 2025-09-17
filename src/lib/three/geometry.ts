import * as THREE from 'three';

/**
 * Returns a standard cube geometry used for voxel instancing.
 * Keeping geometry creation centralized avoids duplicated BufferGeometry instances.
 */
export function createBlockGeometry() {
  return new THREE.BoxGeometry(1, 1, 1);
}
