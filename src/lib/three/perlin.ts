// perlin.ts
type NoiseFunction = (x: number, y: number, z?: number) => number;

export function makeNoise(seed = Math.random()): NoiseFunction {
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(seed * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  
    function fade(t: number) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
  
    function lerp(a: number, b: number, t: number) {
      return a + t * (b - a);
    }
  
    function grad(hash: number, x: number, y: number, z: number) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
  
    return function noise(x: number, y: number, z: number = 0) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;
  
      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);
  
      const u = fade(x);
      const v = fade(y);
      const w = fade(z);
  
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
      const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  
      return lerp(
        lerp(
          lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
          lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u),
          v
        ),
        lerp(
          lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
          lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u),
          v
        ),
        w
      ) * 0.5 + 0.5;
    };
  }
