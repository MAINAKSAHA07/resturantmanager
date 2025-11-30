/** @type {import('tailwindcss').Config} */
const brandTokens = require('../../packages/ui/src/tailwind.brand.js');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: brandTokens.brand,
        accent: brandTokens.accent,
        status: brandTokens.status,
        'accent-green': '#7fc97f',
        'accent-purple': '#beaed4',
        'accent-orange': '#fdc086',
        'accent-yellow': '#ffff99',
        'accent-blue': '#386cb0',
        'accent-pink': '#f0027f',
        'accent-brown': '#bf5b17',
        'accent-gray': '#666666',
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


