const bundleAnalyzer = require('@next/bundle-analyzer')
const webpack = require('webpack')

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@markw65/fit-file-writer'],
  distDir: process.env.NODE_ENV === 'production' ? '.next_prod' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
    ],
  },
  env: {
    TESTING: process.env.TESTING,
  },
  async redirects() {
    return [
      {
        source: '/phone',
        destination: '/client/control',
        permanent: true,
      },
      {
        source: '/control',
        destination: '/client/control',
        permanent: true,
      },
      {
        source: '/connect',
        destination: '/client/connect',
        permanent: true,
      },
      {
        source: '/mock',
        destination: '/client/mock',
        permanent: true,
      },
      {
        source: '/hrm',
        destination: '/client/connect',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Polyfill Node.js modules for client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback, // Preserve existing fallbacks
        stream: require.resolve('stream-browserify'), // Polyfill for 'stream' module
        path: require.resolve('path-browserify'),     // Polyfill for 'path' module
        util: require.resolve('util/'),               // Polyfill for 'util' module
        buffer: require.resolve('buffer/'),
      };
      // Ensure Buffer is globally available for modules that expect it
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    // Important: return the modified config
    return config;
  },
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', 'ws'],
}

module.exports = withBundleAnalyzer(nextConfig)
