import * as THREE from 'three';

/**
 * Configure a WebGLRenderer with defaults suitable for voxel/PBR scenes.
 * Keeps tone mapping, shadows, and clear color consistent across canvases.
 */
export function setupRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.7;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
}
