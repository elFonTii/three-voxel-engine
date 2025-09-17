import * as THREE from 'three';

export function disposeObject(object: THREE.Object3D, { disposeGeometry = false, disposeMaterial = false } = {}) {
  object.traverse(o => {
    if ((o as any).geometry && disposeGeometry) (o as any).geometry.dispose?.();
    if ((o as any).material && disposeMaterial) {
      const mat = (o as any).material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(m => m.dispose?.());
      else mat.dispose?.();
    }
  });
}
