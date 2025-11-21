/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@restaurant/lib', '@restaurant/ui'],
  // Remove 'standalone' output for Netlify compatibility
  // output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8090',
        pathname: '/api/files/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/files/**',
      },
    ],
  },
  // Skip static generation for pages that use dynamic features
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
