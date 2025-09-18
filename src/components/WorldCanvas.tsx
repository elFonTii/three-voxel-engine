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

    // Chunk loading with retry mechanism and better error handling
    const chunkLoadQueue = new Map<string, { priority: number; retries: number }>();
    const maxRetries = 3;
    const baseRetryDelay = 1000; // 1 second
    
    // Create reusable bounding box helper material for better performance
    const helperMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.4 
    });

    const loadChunkAt = async (cx: number, cz: number, priority: number = 0) => {
      const key = keyOf(cx, cz);
      if (loaded.has(key) || inflight.has(key) || disposed) return;
      
      // Add to queue with priority
      chunkLoadQueue.set(key, { priority, retries: 0 });
      inflight.add(key);

      const attemptLoad = async (retryCount: number = 0): Promise<void> => {
        if (disposed) return;
        
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const url = `/api/chunk?size=${CHUNK}&seed=${encodeURIComponent(WORLD_SEED)}&base=${BASE_BLOCK}&cx=${cx}&cy=0&cz=${cz}&surfaceScale=0.06&cavesScale=0.18&cavesThreshold=0.70&grassDepth=3&dirtDepth=3`;
          
          const res = await fetch(url, { 
            cache: 'force-cache',
            signal: controller.signal,
            headers: {
              'Accept': 'application/octet-stream',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          
          // Validate response content type
          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/octet-stream')) {
            console.warn(`Unexpected content type for chunk ${key}: ${contentType}`);
          }
          
          const buf = await res.arrayBuffer();
          if (buf.byteLength === 0) {
            throw new Error('Empty response buffer');
          }
          
          const expectedSize = CHUNK * CHUNK * CHUNK;
          if (buf.byteLength !== expectedSize) {
            throw new Error(`Invalid chunk size: expected ${expectedSize}, got ${buf.byteLength}`);
          }
          
          const grid = new Uint8Array(buf);
          if (disposed) return;
          
          // Validate grid data
          if (grid.length !== expectedSize) {
            throw new Error(`Invalid grid length: expected ${expectedSize}, got ${grid.length}`);
          }
          
          const { group } = buildInstancedChunk(grid, CHUNK, blockGeometry, registry);
          
          // Add optimized bounding box helper
          const half = CHUNK / 2;
          const box = new THREE.Box3(
            new THREE.Vector3(-half, -half, -half),
            new THREE.Vector3(half, half, half)
          );
          const helper = new THREE.Box3Helper(box, helperMaterial.color);
          helper.material = helperMaterial.clone();
          group.add(helper);
          
          group.position.set(cx * CHUNK, 0, cz * CHUNK);
          worldGroup.add(group);
          loaded.set(key, group);
          
          console.log(`Successfully loaded chunk ${key} from API`);
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`Chunk ${key} load attempt ${retryCount + 1} failed: ${errorMsg}`);
          
          // Retry with exponential backoff
          if (retryCount < maxRetries && !disposed) {
            const delay = baseRetryDelay * Math.pow(2, retryCount);
            console.log(`Retrying chunk ${key} in ${delay}ms...`);
            
            setTimeout(() => {
              if (!disposed && inflight.has(key)) {
                attemptLoad(retryCount + 1);
              }
            }, delay);
            return;
          }
          
          // Final fallback: local generation
          console.log(`Falling back to local generation for chunk ${key}`);
          try {
            const local = generateChunk(CHUNK, BASE_BLOCK);
            
            // Apply terrain modifications consistently
            PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Grass, 2, 'xyz', 'contiguous');
            PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Dirt, Math.floor(Math.random() * 4) + 1, 'xyz', 'any');
            
            if (!disposed) {
              const { group } = buildInstancedChunk(local, CHUNK, blockGeometry, registry);
              
              // Add bounding box helper for locally generated chunks too
              const half = CHUNK / 2;
              const box = new THREE.Box3(
                new THREE.Vector3(-half, -half, -half),
                new THREE.Vector3(half, half, half)
              );
              const helper = new THREE.Box3Helper(box, 0xff0000); // Red for local chunks
              helper.material = new THREE.LineBasicMaterial({ 
                color: 0xff0000, 
                transparent: true, 
                opacity: 0.3 
              });
              group.add(helper);
              
              group.position.set(cx * CHUNK, 0, cz * CHUNK);
              worldGroup.add(group);
              loaded.set(key, group);
              
              console.log(`Successfully generated local chunk ${key}`);
            }
          } catch (localErr) {
            console.error(`Failed to generate local chunk ${key}:`, localErr);
          }
        } finally {
          inflight.delete(key);
          chunkLoadQueue.delete(key);
        }
      };

      await attemptLoad();
    };

    const ensureChunksAround = (cx: number, cz: number) => {
      // Create priority-sorted chunk loading list based on distance
      const chunksToLoad: Array<{ x: number; z: number; priority: number }> = [];
      
      for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
        for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
          const chunkX = cx + dx;
          const chunkZ = cz + dz;
          const key = keyOf(chunkX, chunkZ);
          
          // Skip if already loaded or loading
          if (loaded.has(key) || inflight.has(key)) continue;
          
          // Calculate priority based on distance (closer = higher priority)
          const distance = Math.sqrt(dx * dx + dz * dz);
          const priority = Math.max(0, VIEW_RADIUS - distance);
          
          chunksToLoad.push({ x: chunkX, z: chunkZ, priority });
        }
      }
      
      // Sort by priority (higher priority first)
      chunksToLoad.sort((a, b) => b.priority - a.priority);
      
      // Load chunks with staggered timing to prevent overwhelming the API
      chunksToLoad.forEach((chunk, index) => {
        setTimeout(() => {
          if (!disposed) {
            loadChunkAt(chunk.x, chunk.z, chunk.priority);
          }
        }, index * 50); // 50ms delay between each chunk request
      });
      
      // Prune far chunks with improved cleanup
      const chunksToRemove: string[] = [];
      for (const [key, group] of loaded) {
        const [gx, gz] = key.split(',').map((n) => parseInt(n, 10));
        if (Math.abs(gx - cx) > VIEW_RADIUS + 1 || Math.abs(gz - cz) > VIEW_RADIUS + 1) {
          chunksToRemove.push(key);
        }
      }
      
      // Remove chunks in batches to avoid frame drops
      chunksToRemove.forEach((key, index) => {
        setTimeout(() => {
          const group = loaded.get(key);
          if (group) {
            worldGroup.remove(group);
            disposeObject(group);
            loaded.delete(key);
            console.log(`Pruned distant chunk ${key}`);
          }
        }, index * 10); // 10ms delay between removals
      });
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
      
      // Clear any pending chunk loads
      chunkLoadQueue.clear();
      inflight.clear();
      
      // Dispose of all loaded chunks
      for (const [, group] of loaded) disposeObject(group);
      loaded.clear();
      
      // Dispose of helper material
      helperMaterial.dispose();
      
      // Dispose of registry materials
      for (const mat of registry.allMaterials()) mat.dispose();
      
      scene.remove(worldGroup, sun);
      renderer.dispose();
      
      console.log('WorldCanvas cleanup completed');
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
