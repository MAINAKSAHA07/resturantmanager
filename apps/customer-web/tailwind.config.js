/** @type {import('tailwindcss').Config} */
const brandTokens = require('../../packages/ui/src/tailwind.brand.js');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // D3-based design tokens
        brand: brandTokens.brand,
        accent: brandTokens.accent,
        status: brandTokens.status,
        // Legacy accent colors for backward compatibility
        'accent-blue': '#4269D0',
        'accent-red': '#FF6B6B',
        'accent-teal': '#4ECDC4',
        'accent-cyan': '#45B7D1',
        'accent-salmon': '#FFA07A',
        'accent-mint': '#98D8C8',
        'accent-yellow': '#F7DC6F',
        'accent-purple': '#BB8FCE',
        'accent-sky': '#85C1E2',
        'accent-orange': '#F8B739',
        'accent-green': '#98D8C8', // mint
        'accent-pink': '#FF6B6B', // red
        'accent-brown': '#F8B739', // orange
        'accent-gray': '#666666',
        // Legacy primary/secondary for backward compatibility
        primary: {
          50: '#e8f0f8',
          100: '#c5d9f0',
          200: '#9fc0e7',
          300: '#7aa7de',
          400: '#5d94d7',
          500: '#4081d0',
          600: '#386cb0',
          700: '#2f5a95',
          800: '#26487a',
          900: '#1a2f52',
        },
        secondary: {
          50: '#f5f0f9',
          100: '#e8d9f0',
          200: '#d9c0e7',
          300: '#caa7de',
          400: '#be94d7',
          500: '#b281d0',
          600: '#9e7ab8',
          700: '#86669a',
          800: '#6e527c',
          900: '#4d3857',
        },
      },
    },
  },
  plugins: [],
};



