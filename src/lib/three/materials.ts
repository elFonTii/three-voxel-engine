import * as THREE from 'three';
import { createTexture } from './textures';

/**
 * Standard PBR material factory for this project.
 * - Accepts a hex color string (e.g. "#003A4A") or a texture URL.
 * - Uses roughness=1 and metalness=0 for a matte voxel look by default.
 */

/**
 * Crea un MeshStandardMaterial con un map usando la imagen provista.
 * Mantiene defaults razonables para look "minecraft" pero
 */
export function createStandardMaterial(
  textureUrl: string,
  loader: THREE.TextureLoader,
  params?: Partial<THREE.MeshStandardMaterialParameters> | Partial<THREE.MeshDepthMaterialParameters>,
): THREE.MeshStandardMaterial {
  const isColor = textureUrl.includes('#');
  
  if(isColor) {
    const mat = new THREE.MeshStandardMaterial({
      color: textureUrl,
      roughness: 1,
      metalness: 0,
      ...params,
    });
    return mat;
  }


  const map = createTexture(loader, textureUrl, { isColor, linear: true });
  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 1,
    metalness: 0,
    ...params,
  });
  return mat;
}

/** Helper para materiales con emisión (lava, glow) */
export function createEmissiveMaterial(
  textureUrl: string,
  loader: THREE.TextureLoader,
  emissive: THREE.ColorRepresentation,
  emissiveIntensity: number,
  params?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  return createStandardMaterial(textureUrl, loader, {
    emissive,
    emissiveIntensity,
    ...params,
  });
}
