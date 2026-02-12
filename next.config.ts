import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname),
    },
  },
};

export default nextConfig;
