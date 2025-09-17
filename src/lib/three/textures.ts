import * as THREE from 'three';

/**
 * Crea una textura de forma estandarizada para PBR "game-like".
 * - sRGB para mapas de color (coincide con renderer.outputColorSpace).
 * - ClampToEdge por defecto (ladrillo/cubo).
 * - minFilter linear para evitar ringing al ser voxel art.
 */
export function createTexture(
  loader: THREE.TextureLoader,
  url: string,
  opts?: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    repeat?: [number, number];
    linear?: boolean; // si true, fuerza minFilter linear
    isColor?: boolean; // si true: sRGB
  }
): THREE.Texture {
  const {
    wrapS = THREE.ClampToEdgeWrapping,
    wrapT = THREE.ClampToEdgeWrapping,
    repeat = [1, 1],
    linear = true,
    isColor = true,
  } = opts || {};

  const tex = loader.load(url);
  tex.wrapS = wrapS;
  tex.wrapT = wrapT;
  tex.repeat.set(repeat[0], repeat[1]);
  if (linear) tex.minFilter = THREE.LinearFilter;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
