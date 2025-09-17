'use client';
import { WorldCanvas } from '@/components/WorldCanvas';

export default function Home() {
  return (
    <main className="h-screen w-screen relative">
      <WorldCanvas className="absolute inset-0" />
      
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
        <h2 className="text-lg font-bold mb-2">Voxel World Engine</h2>
        <div className="text-sm space-y-1">
          <p><strong>Click</strong> to enable mouse look</p>
          <p><strong>WASD</strong> - Move around</p>
          <p><strong>Space</strong> - Move up</p>
          <p><strong>Shift</strong> - Move down</p>
          <p><strong>Mouse</strong> - Look around</p>
        </div>
      </div>

      {/* Performance info */}
      <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
        <p>Procedural terrain generation</p>
        <p>Infinite chunk streaming</p>
        <p>Instanced rendering</p>
      </div>
    </main>
  );
}
