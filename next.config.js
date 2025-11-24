import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
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
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

// Sentry configuration
const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  // IMPORTANT: Replace these values with your Sentry organization and project slugs
  // You can find these values in your Sentry project settings
  org: process.env.SENTRY_ORG || 'YOUR_ORG_SLUG',
  project: process.env.SENTRY_PROJECT || 'YOUR_PROJECT_SLUG',
}

const sentryAuthConfig = {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
}

// Only enable Sentry if the DSN is configured
const shouldEnableSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN

const finalConfig = withBundleAnalyzer(nextConfig)

export default shouldEnableSentry
  ? withSentryConfig(finalConfig, sentryConfig, sentryAuthConfig)
  : finalConfig
