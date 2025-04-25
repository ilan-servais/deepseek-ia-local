/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'canvas': 'commonjs canvas' }];
    return config;
  },
  // S'assurer que les environnements sont accessibles
  env: {
    OLLAMA_API_HOST: process.env.OLLAMA_API_HOST || 'http://localhost:11434',
  }
};

module.exports = nextConfig;
