/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@restaurant/lib', '@restaurant/ui'],
  // Do not use standalone output for Netlify - the plugin handles it
  // output: 'standalone', // Disabled for Netlify deployment
  // Disable experimental features that might cause build trace issues
  experimental: {
    // Disable server components external packages optimization that can cause NFT issues
    serverComponentsExternalPackages: [],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8090',
        pathname: '/api/files/**',
      },
      {
        protocol: 'http',
        hostname: '18.218.140.182',
        port: '8090',
        pathname: '/api/files/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/files/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/api/files/**',
      },
    ],
  },
  // Ensure proper webpack configuration for Netlify
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure all chunks are properly resolved
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Disable build trace collection to avoid NFT file errors
  // This is safe for Netlify deployment as the plugin handles optimization
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

