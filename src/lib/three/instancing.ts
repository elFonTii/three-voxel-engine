import * as THREE from 'three';
import { Block } from './block_types';
import { BlockRegistry } from './blocks';

// Instanced voxel chunk builder utilities

export type InstancingResult = {
  group: THREE.Group;
  meshes: Partial<Record<Block, THREE.InstancedMesh>>;
};

/**
 * Counts how many instances of each Block type are present in the grid.
 * Used to preallocate InstancedMesh capacity per material.
 */
export function countBlocks(grid: Uint8Array, CHUNK: number) {
  const counts: Record<Block, number> = {
    [Block.Air]: 0,
    [Block.Grass]: 0,
    [Block.Gizmos]: 0,
    [Block.Dirt]: 0,
    [Block.Stone]: 0,
    [Block.RedFlower]: 0,
    [Block.OrangeFlower]: 0,
    [Block.PinkFlower]: 0,
    [Block.WhiteFlower]: 0,
  };

  const totalBlocks = CHUNK * CHUNK * CHUNK; // Guarda el total de bloques para agregar. (chunk = 8 -> 512 bloques)
  
  for (let i = 0; i < totalBlocks; i++) {
    const block = grid[i] as Block;
    
    counts[block]++;
  }
  
  return counts;
}

/**
 * Construye InstancedMesh por tipo de bloque y setea matrices por posición.
 * Deja el grupo centrado respecto al origen (offset 0.5 para centrar cubos).
 */
export function buildInstancedChunk(
  grid: Uint8Array,
  CHUNK: number,
  cubeGeo: THREE.BufferGeometry,
  registry: BlockRegistry
): InstancingResult {

  const group = new THREE.Group();
  const counts = countBlocks(grid, CHUNK);
  
  const makeMesh = (block: Block) => {
    const meshMaterial = registry.materialOf(block);

    const mesh = new THREE.InstancedMesh(cubeGeo, meshMaterial, Math.max(1, counts[block]));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  };

  const grassMesh = makeMesh(Block.Grass);
  const dirtMesh = makeMesh(Block.Dirt);
  const gizmosMesh = makeMesh(Block.Gizmos);
  const stoneMesh = makeMesh(Block.Stone);
  const redFlowerMesh = makeMesh(Block.RedFlower);
  const orangeFlowerMesh = makeMesh(Block.OrangeFlower);
  const pinkFlowerMesh = makeMesh(Block.PinkFlower);
  const whiteFlowerMesh = makeMesh(Block.WhiteFlower);
  group.add(grassMesh);
  group.add(dirtMesh);
  group.add(gizmosMesh);
  group.add(stoneMesh);
  group.add(redFlowerMesh);
  group.add(orangeFlowerMesh);
  group.add(pinkFlowerMesh);
  group.add(whiteFlowerMesh);

  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();

  const cursor: Record<Block, number> = {
    [Block.Air]: 0, [Block.Grass]: 0, [Block.Gizmos]: 0, [Block.Dirt]: 0, [Block.Stone]: 0,
    [Block.RedFlower]: 0, [Block.OrangeFlower]: 0, [Block.PinkFlower]: 0, [Block.WhiteFlower]: 0,
  };

  const GRID_HALF = CHUNK / 2;
  const offset = new THREE.Vector3(-GRID_HALF + 0.5, -GRID_HALF + 0.5, -GRID_HALF + 0.5);


  for (let z = 0; z < CHUNK; z++) {
    for (let y = 0; y < CHUNK; y++) {
      for (let x = 0; x < CHUNK; x++) {
        const i = x + y * CHUNK + z * CHUNK * CHUNK;
        const b = grid[i] as Block;
        if (b === Block.Air) continue;
        tempPosition.set(x, y, z).add(offset);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);
        switch (b) {
          case Block.Grass:  grassMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Gizmos: gizmosMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Dirt:   dirtMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Stone:  stoneMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.RedFlower:   redFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.OrangeFlower: orangeFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.PinkFlower:   pinkFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.WhiteFlower:  whiteFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
        }
      }
    }
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  gizmosMesh.instanceMatrix.needsUpdate = true;
  dirtMesh.instanceMatrix.needsUpdate = true;
  stoneMesh.instanceMatrix.needsUpdate = true;
  redFlowerMesh.instanceMatrix.needsUpdate = true;
  orangeFlowerMesh.instanceMatrix.needsUpdate = true;
  pinkFlowerMesh.instanceMatrix.needsUpdate = true;
  whiteFlowerMesh.instanceMatrix.needsUpdate = true;

  return {
    group,
    meshes: { [Block.Grass]: grassMesh, [Block.Dirt]: dirtMesh, [Block.Stone]: stoneMesh, [Block.RedFlower]: redFlowerMesh, [Block.OrangeFlower]: orangeFlowerMesh, [Block.PinkFlower]: pinkFlowerMesh, [Block.WhiteFlower]: whiteFlowerMesh, [Block.Gizmos]: gizmosMesh }
  };
} 

type BillboardBuildOpts = {
  layout?: 'xzy' | 'xyz';
  air?: number;                     // Block.Air or 0
  // map a block id to an atlas frame + size (w,h in world units)
  frameOf?: (blockId: number) => number;
  sizeOf?: (blockId: number) => { w: number; h: number };
  yOffset?: number;                 // how high above the supporting block
};

// returns the mesh; also mutates voxels (sets found detail cells to Air)
export function buildBillboardLayerFromVoxels(
  voxels: Uint16Array | number[],
  size: number,
  detailSet: number[],              // e.g. [Block.FlowerRed, Block.FlowerBlue, Block.TallGrass]
  material: THREE.ShaderMaterial,
  {
    layout = 'xzy',
    air = (window as any).Block?.Air ?? 0,
    frameOf = () => 0,
    sizeOf = () => ({ w: 0.9, h: 1.2 }),
    yOffset = 1
  }: BillboardBuildOpts = {}
) {
  const idx_xzy = (x:number,y:number,z:number)=> x + z*size + y*size*size;
  const idx_xyz = (x:number,y:number,z:number)=> x + y*size + z*size*size;
  const IDX = layout === 'xzy' ? idx_xzy : idx_xyz;

  // First pass: count instances
  let count = 0;
  for (let y=0; y<size; y++) {
    for (let z=0; z<size; z++) {
      for (let x=0; x<size; x++) {
        const i = IDX(x,y,z);
        if (detailSet.includes(voxels[i])) count++;
      }
    }
  }
  if (!count) return null;

  // Geometry: a single unit quad in XY centered on origin (we scale in shader via aSize)
  const quad = new THREE.PlaneGeometry(1, 1, 1, 1);

  const mesh = new THREE.InstancedMesh(quad, material, count);
  const m = new THREE.Matrix4();
  const aSize = new Float32Array(count * 2);
  const aFrame = new Float32Array(count);

  let n = 0;
  for (let y=0; y<size; y++) {
    for (let z=0; z<size; z++) {
      for (let x=0; x<size; x++) {
        const i = IDX(x,y,z);
        const id = voxels[i];
        if (!detailSet.includes(id)) continue;

        // center on voxel; raise a bit so it sits on the block top
        m.makeTranslation(x + 0.5, y + yOffset - 0.5, z + 0.5);
        mesh.setMatrixAt(n, m);

        const { w, h } = sizeOf(id);
        aSize[n*2 + 0] = w;
        aSize[n*2 + 1] = h;
        aFrame[n] = frameOf(id);

        voxels[i] = air; // prevent the cube renderer from drawing a box here
        n++;
      }
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aSize',  new THREE.InstancedBufferAttribute(aSize, 2));
  mesh.geometry.setAttribute('aFrame', new THREE.InstancedBufferAttribute(aFrame, 1));

  // draw after solid voxels for best visuals
  mesh.renderOrder = 2;

  return mesh;
}
