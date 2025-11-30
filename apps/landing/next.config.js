/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Do not use standalone output for Netlify - the plugin handles it
  // output: 'standalone', // Disabled for Netlify deployment
};

module.exports = nextConfig;


