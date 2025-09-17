/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    // Handle Three.js examples imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'three/examples/jsm': 'three/examples/jsm',
      'three/addons': 'three/examples/jsm',
    };
    return config;
  },
};

export default nextConfig;
