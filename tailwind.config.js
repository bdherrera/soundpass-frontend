/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: { 50: '#f5f3ff', 100: '#ede9fe', 600: '#6d28d9', 700: '#5b21b6', 800: '#4c1d95' },
      },
    },
  },
  plugins: [],
};
