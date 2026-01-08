/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude recharts from the server-side bundle
      // This prevents issues with client-side code running on the server during build
      config.externals.push('recharts');
      // You might need to add other D3-related dependencies if issues persist
      // e.g., config.externals.push('d3-scale', 'd3-array', ...);
    }
    return config;
  },
};

module.exports = nextConfig;
