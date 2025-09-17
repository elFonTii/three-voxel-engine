import * as THREE from 'three';

// Utility: adjust renderer size and camera to fit the voxel world nicely

/**
 * Encapsula el cálculo de cámara + renderer para encuadrar el cubo instanciado.
 */
export function fitRendererAndCamera( 
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  lookAt: THREE.Vector3,
  CHUNK: number,
  initialPosition?: THREE.Vector3
) {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height, false);
  const fov = camera.fov * (Math.PI / 180);
  const cubeSize = CHUNK;
  const dist = (cubeSize * 0.54) / Math.tan(fov / 2); 
  
  camera.aspect = width / height;

  camera.position.set(initialPosition?.x ?? 0, initialPosition?.y ?? CHUNK/2, initialPosition?.z ?? dist * 2);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
}
