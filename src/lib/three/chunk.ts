import { Block } from './block_types';

/** Indexador 3D -> 1D para un grid cúbico CHUNK^3 */
export const idx = (x: number, y: number, z: number, CHUNK: number) =>
  x + y * CHUNK + z * CHUNK * CHUNK;

/** Crea y rellena un grid CHUNK^3 con un bloque inicial */
export function generateChunk(CHUNK: number, fill: Block): Uint8Array {
  return new Uint8Array(CHUNK * CHUNK * CHUNK).fill(fill);
}
