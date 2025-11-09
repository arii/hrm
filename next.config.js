/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['node-fetch'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('node-fetch');
    }
    return config;
  },
  /* config options here */
};

module.exports = nextConfig;