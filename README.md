# Voxel World Engine

A sophisticated 3D voxel world renderer with procedural terrain generation, chunk streaming, and first-person controls. Built with Three.js and Next.js.

## Features

- **Procedural Terrain Generation**: Uses Perlin noise for realistic terrain and cave systems
- **Infinite World Streaming**: Dynamic chunk loading/unloading based on camera position
- **First-Person Controls**: WASD movement with mouse look and pointer lock
- **Optimized Rendering**: Instanced rendering for high performance
- **Configurable World**: Customizable chunk size, terrain parameters, and block types
- **Caching System**: Server-side chunk caching with deterministic generation

## Controls

- **WASD**: Move forward/backward/left/right
- **Mouse**: Look around (click to enable pointer lock)
- **Space**: Move up
- **Shift**: Move down

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

- `src/components/WorldCanvas.tsx`: Main 3D world component
- `src/lib/three/`: Three.js utilities and world generation logic
- `src/app/api/chunk/`: Server-side chunk generation endpoint
- `src/types/`: TypeScript type definitions

## Configuration

World parameters can be modified in `src/lib/three/index.ts`:
- `CHUNK`: Chunk size (8, 16, 32)
- `VIEW_RADIUS`: Number of chunks to load around camera
- Terrain generation parameters (noise scales, thresholds)

## Performance

- Chunks are generated server-side and cached
- Instanced rendering for optimal GPU performance
- Automatic cleanup of distant chunks
- Configurable view distance

## License

MIT
