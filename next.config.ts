import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'canvas': 'commonjs canvas' }];
    return config;
  }
};

export default nextConfig;
