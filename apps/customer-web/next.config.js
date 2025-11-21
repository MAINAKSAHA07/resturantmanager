/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@restaurant/lib', '@restaurant/ui'],
  output: 'standalone',
};

module.exports = nextConfig;
