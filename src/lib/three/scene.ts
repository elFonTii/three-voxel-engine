import * as THREE from 'three';
import { BlockRegistry } from './blocks';
import { createDefaultBlockRegistry, DEFAULT_BLOCKS } from './block_defs';

export type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  worldGroup: THREE.Group;
  sun: THREE.DirectionalLight;
  loader: THREE.TextureLoader;
  registry: BlockRegistry;
};

/**
 * Creates a typical outdoor scene for the voxel world: fog, sun light with shadows,
 * hemisphere + ambient lights, a perspective camera, and a container group for world meshes.
 */
export function createSceneContext(
  {
    fov = 60,
    near = 0.1,
    far = 1000,
    fogColor = '#666157',
    fogDensity = 0.01,
  }: {
    fov?: number;
    near?: number;
    far?: number;
    fogColor?: string | number;
    fogDensity?: number;
  } = {}
): SceneContext {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(fogColor as any, fogDensity);

  const loader = new THREE.TextureLoader();
  // Centralized block/material setup
  const registry: BlockRegistry = createDefaultBlockRegistry(loader, DEFAULT_BLOCKS);

  const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, near, far);

  const worldGroup = new THREE.Group();

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.castShadow = true;
  // Shadow map tuned for large-ish terrains
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x3f2e21, 0.35);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);

  // Wider shadow camera frustum to cover the playable area
  const d = 60; const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -d; cam.right = d; cam.top = d; cam.bottom = -d; cam.near = 1; cam.far = 600; cam.updateProjectionMatrix();

  scene.add(sun, sun.target, worldGroup, hemi, ambientLight);

  return { scene, camera, sun, worldGroup, loader, registry };
}

/**
 * Repositions a directional light to orbit around `target` following the camera direction.
 * Uses camera->target vector as a sun direction proxy (simple but effective).
 */
export function updateSunFromCamera(
  sun: THREE.DirectionalLight,
  camera: THREE.Camera,
  target: THREE.Vector3,
  scalar = 1
) {
  const dir = new THREE.Vector3().copy(camera.position).sub(target).normalize();
  sun.position.copy(dir.multiplyScalar(scalar).add(target));
}
