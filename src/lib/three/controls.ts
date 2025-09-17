import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export type OrbitController = {
  controls: OrbitControls;
  dispose: () => void;
};

export type OrbitOptions = {
  enableZoom?: boolean;
  minDistance?: number;
  maxDistance?: number;
  /** rango de yaw RELATIVO a la azimuth actual (radianes) */
  yawRange?: [number, number];
  /** rango de pitch RELATIVO a la pitch actual (grados) */
  pitchRangeDeg?: [number, number];
  damping?: number; // 0..1 (suele 0.05–0.15)
  enablePan?: boolean;
}

/**
 * Crea OrbitControls con límites relativos a la orientación inicial de la cámara.
 * - Mantiene una ventana de yaw/pitch parecida a la que tenías (-30..30 yaw, -18..18 pitch).
 * - El target suele ser el centro visual del mundo (por ej. el worldGroup.position).
 * - Llama a controls.update() en tu loop y tras cada resize.
 */
export function createOrbitController(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  opts?: OrbitOptions
): OrbitController {
  const {
    enableZoom = false,
    enablePan = false,
    minDistance = 2,
    maxDistance = 1000,
    pitchRangeDeg = [-18, 18],
    damping = 0.08,
  } = opts || {};

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = damping;
  controls.enablePan = enablePan;
  controls.enableZoom = enableZoom;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  controls.update();

  const dispose = () => controls.dispose();
  return { controls, dispose };
}

export type FlyOptions = {
  movementSpeed?: number;
  rollSpeed?: number;
  dragToLook?: boolean;
  autoForward?: boolean;
};

/**
 * Thin wrapper over three/examples FlyControls with sensible defaults.
 * Call `controls.update(delta)` every frame with a delta in seconds.
 */
export const createFlyCameraController = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  options: FlyOptions = {}
) => {
  const controls = new FlyControls(camera, renderer.domElement);

  controls.movementSpeed = options.movementSpeed ?? 20;
  controls.rollSpeed = options.rollSpeed ?? Math.PI / 12;
  controls.dragToLook = options.dragToLook ?? true;
  controls.autoForward = options.autoForward ?? false;

  return { controls };
};

/**
 * Pointer lock FPS controller. Use `enable()` on a user gesture to lock the pointer,
 * and `disable()` to unlock.
 */
export const createPointerLockController = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) => {
  const controls = new PointerLockControls(camera, renderer.domElement);

  const enable = () => controls.lock();
  const disable = () => controls.unlock();

  return { controls, enable, disable };
};
