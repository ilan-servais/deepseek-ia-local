/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'canvas': 'commonjs canvas' }];
    return config;
  }
};

module.exports = nextConfig;
