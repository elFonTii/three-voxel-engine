'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import {
  Block,
  buildInstancedChunk,
  fitRendererAndCamera,
  disposeObject,
  generateChunk,
  WorldConfiguraton,
  createPointerLockController,
  setupRenderer,
  createBlockGeometry,
  createSceneContext,
  createKeyTracker,
  updateSunFromCamera,
} from '@/lib/three';

import { PaintLayer, TerrainRelief } from '@/lib/three/surface_details';

type WorldCanvasProps = { className?: string };

const CHUNK = WorldConfiguraton.CHUNK;
const TARGET = new THREE.Vector3(0, 0, 0);
const CAMERA_INITIAL_POSITION = WorldConfiguraton.CAMERA_INITIAL_POSITION;
const BASE_BLOCK = WorldConfiguraton.WORLD_BASE_BLOCK;
const WORLD_SEED = '1';
const VIEW_RADIUS = 6; // number of chunks around camera in X/Z

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ className}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = canvasRef.current!;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      ...WorldConfiguraton.RENDERER_CONFIG
    });
    setupRenderer(renderer);

    // Scene bootstrap
    const { scene, camera, sun, worldGroup, loader, registry } = createSceneContext();

    // Chunk streaming
    const blockGeometry = createBlockGeometry();
    const loaded = new Map<string, THREE.Group>();
    const inflight = new Set<string>();
    let disposed = false;

    const keyOf = (cx: number, cz: number) => `${cx},${cz}`;

    const loadChunkAt = async (cx: number, cz: number) => {
      const key = keyOf(cx, cz);
      if (loaded.has(key) || inflight.has(key) || disposed) return;
      inflight.add(key);
      try {
        const url = `/api/chunk?size=${CHUNK}&seed=${encodeURIComponent(WORLD_SEED)}&base=${BASE_BLOCK}&cx=${cx}&cy=0&cz=${cz}&surfaceScale=0.04&cavesScale=0.16&cavesThreshold=0.72&grassDepth=2&dirtDepth=3`;
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const grid = new Uint8Array(buf);
        if (disposed) return;
        const { group } = buildInstancedChunk(grid, CHUNK, blockGeometry, registry);
        // Add a bounding box helper around the chunk in local space
        const half = CHUNK / 2;
        const box = new THREE.Box3(
          new THREE.Vector3(-half, -half, -half),
          new THREE.Vector3(half, half, half)
        );
        const helper = new THREE.Box3Helper(box, 0x00ffff);
        // Subtle styling for better readability
        (helper.material as THREE.LineBasicMaterial).transparent = true;
        (helper.material as THREE.LineBasicMaterial).opacity = 0.4;
        group.add(helper);
        group.position.set(cx * CHUNK, 0, cz * CHUNK);
        worldGroup.add(group);
        loaded.set(key, group);
      } catch (err) {
        // Fallback: local generation
        const local = generateChunk(CHUNK, BASE_BLOCK);
        // TerrainRelief(local, CHUNK, { scale: 0.16, threshold: 0.72, mode: '3d', fill: Block.Air });
         // TerrainRelief(local, CHUNK, { scale: 0.04, mode: 'surface' });
        PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Grass, 2, 'xyz', 'contiguous');
        PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Dirt, Math.random() * 4 + 1, 'xyz', 'any');
        if (!disposed) {
          const { group } = buildInstancedChunk(local, CHUNK, blockGeometry, registry);
          group.position.set(cx * CHUNK, 0, cz * CHUNK);
          worldGroup.add(group);
          loaded.set(key, group);
        }
      } finally {
        inflight.delete(key);
      }
    };

    const ensureChunksAround = (cx: number, cz: number) => {
      for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
        for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
          loadChunkAt(cx + dx, cz + dz);
        }
      }
      // prune far chunks
      for (const [key, group] of loaded) {
        const [gx, gz] = key.split(',').map((n) => parseInt(n, 10));
        if (Math.abs(gx - cx) > VIEW_RADIUS + 1 || Math.abs(gz - cz) > VIEW_RADIUS + 1) {
          worldGroup.remove(group);
          disposeObject(group);
          loaded.delete(key);
        }
      }
    };

    // Initial chunks
    ensureChunksAround(Math.round(CAMERA_INITIAL_POSITION.x / CHUNK), Math.round(CAMERA_INITIAL_POSITION.z / CHUNK));

    // Pointer Lock Controls
    const { controls, enable } = createPointerLockController(camera, renderer);
    canvas.addEventListener('click', enable);

    // Movement keys
    const { keys, dispose: disposeKeys } = createKeyTracker(document);

    // Fit + Resize
    const fit = () => fitRendererAndCamera(container, renderer, camera, TARGET, CHUNK, CAMERA_INITIAL_POSITION);
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);

    let RequestFrame = 0;
    const clock = new THREE.Clock();
    const lastCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    const MAX_DT = 0.05;
    const speed = 30;
    let lastChunkX = NaN;
    let lastChunkZ = NaN;

    // Game Loop
    function updateLoop() {
      const delta = Math.min(clock.getDelta(), MAX_DT);

      // WASD + Space/Shift
      const vx = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
      const vz = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);
      const vy = (keys['Space'] ? 1 : 0) - (keys['ShiftLeft'] ? 1 : 0);

      const lenSq = vx*vx + vy*vy + vz*vz;
      if (lenSq > 0 && controls.isLocked) {
        const scale = (speed * delta) / Math.sqrt(lenSq);
        const dx = vx * scale;
        const dy = vy * scale;
        const dz = vz * scale;
        controls.moveRight(dx);
        controls.moveForward(-dz);
        camera.position.y += dy;
      }

      if (lastCamPos.manhattanDistanceTo(camera.position) > 1e-4) {
        lastCamPos.copy(camera.position);
        updateSunFromCamera(sun, camera, TARGET, CHUNK * 2);
        const ccx = Math.round(camera.position.x / CHUNK);
        const ccz = Math.round(camera.position.z / CHUNK);
        if (ccx !== lastChunkX || ccz !== lastChunkZ) {
          lastChunkX = ccx; lastChunkZ = ccz;
          ensureChunksAround(ccx, ccz);
        }
      }

      renderer.render(scene, camera);
      RequestFrame = window.requestAnimationFrame(updateLoop);
    }

    updateLoop();

    // Cleanup
    return () => {
      window.cancelAnimationFrame(RequestFrame);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('click', enable);
      disposeKeys();

      disposed = true;
      for (const [, group] of loaded) disposeObject(group);
      loaded.clear();
      for (const mat of registry.allMaterials()) mat.dispose();
      scene.remove(worldGroup, sun);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas className="z-50" ref={canvasRef} />
    </div>
  );
};

// (helpers moved into lib/three)
