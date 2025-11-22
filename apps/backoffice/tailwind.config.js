/** @type {import('tailwindcss').Config} */
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
        accent: {
          green: '#7fc97f',
          purple: '#beaed4',
          orange: '#fdc086',
          yellow: '#ffff99',
          blue: '#386cb0',
          pink: '#f0027f',
          brown: '#bf5b17',
          gray: '#666666',
        },
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



