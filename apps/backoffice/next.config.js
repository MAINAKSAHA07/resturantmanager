/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@restaurant/lib', '@restaurant/ui'],
  // Do not use standalone output for Netlify - the plugin handles it
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
};

module.exports = nextConfig;

