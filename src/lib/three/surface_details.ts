import { idx } from './chunk';
import { makeNoise } from './perlin';
import { Block } from './block_types';

type ReliefOptions = {
  scale?: number;      // how zoomed in/out the noise is
  threshold?: number;  // what noise value cuts blocks
  mode?: 'surface' | '3d' | 'reverse-surface'; // surface = heightmap, 3d = volumetric caves, reverse-surface = inverted heightmap
  fill?: Block; // what block to fill the void with
};

export function TerrainRelief(grid: Uint8Array, CHUNK: number, options: ReliefOptions = {}) {
  const {
    scale = 0.1,
    threshold = 0.5,
    mode = 'surface',
    fill = Block.Air,
  } = options;

  const noise = makeNoise(Math.random());

  if (mode === 'surface') {
    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        const heightNoise = noise(x * scale, z * scale);
        const maxY = Math.floor(heightNoise * CHUNK);
        for (let y = CHUNK - 1; y > maxY; y--) {
          grid[idx(x, y, z, CHUNK)] = fill;
        }
      }
    }
  }

  if (mode === 'reverse-surface') {
    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        const heightNoise = noise(x * scale, z * scale);
        const minY = Math.floor(heightNoise * CHUNK);
        for (let y = 0; y < minY; y++) {
          grid[idx(x, y, z, CHUNK)] = fill;
        }
      }
    }
  }


  if (mode === '3d') {
    for (let x = 0; x < CHUNK; x++) {
      for (let y = 0; y < CHUNK; y++) {
        for (let z = 0; z < CHUNK; z++) {
          const n = noise(x * scale, y * scale, z * scale);
          if (n > threshold) {
            grid[idx(x, y, z, CHUNK)] = fill;
          }
        }
      }
    }
  }
}

/**
 * Replace the top N solid blocks in each (x,z) column of a flat voxel buffer.
 *
 * @param voxels Flat array of block ids (e.g., Uint16Array)
 * @param size   Chunk size (width = height = depth = size)
 * @param from   Block id to match, or null to ignore type
 * @param to     Block id to write
 * @param depth  How many blocks from the top to replace (default 3)
 * @param layout Memory layout of the flat array: 'xzy' or 'xyz' (default 'xzy')
 * @param mode   'contiguous' -> replace while blocks == from (default)
 *               'any'        -> replace top `depth` solids (optionally filtered by `from`)
 */
export function PaintLayer(
  voxels: Uint16Array | number[],
  size: number,
  from: Block | null,
  to: Block,
  depth = 3,
  layout: 'xzy' | 'xyz' = 'xzy',
  mode: 'contiguous' | 'any' = 'contiguous'
) {
  const idx_xzy = (x: number, y: number, z: number) => x + z * size + y * size * size;
  const idx_xyz = (x: number, y: number, z: number) => x + y * size + z * size * size;
  const IDX = layout === 'xzy' ? idx_xzy : idx_xyz;

  const isEmpty = (v: any) => v === 0 || v === Block.Air || v == null;
  const matches = (v: any) => (from == null ? true : v === from);

  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      // 1) find the top-most solid voxel in this (x,z) column
      let y = size - 1;
      while (y >= 0 && isEmpty(voxels[IDX(x, y, z)])) y--;
      if (y < 0) continue; // column is empty

      // 2) replace up to `depth` blocks downward from that top
      let replaced = 0;
      while (y >= 0 && replaced < depth) {
        const i = IDX(x, y, z);
        const b = voxels[i];

        if (isEmpty(b)) break; // shouldn't happen unless there are cavities right at the top

        if (mode === 'contiguous') {
          if (!matches(b)) break;        // stop on first non-matching block
          voxels[i] = to;                // replace and continue
          replaced++;
          y--;
        } else {
          // mode === 'any'
          if (matches(b)) {
            voxels[i] = to;              // replace if it matches (or from == null)
            replaced++;
          }
          y--;                            // always step down in 'any' mode
        }
      }
    }
  }
}
