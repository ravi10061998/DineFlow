/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches the web app's brand gradient accents (amber -> orange -> rose)
        brand: {
          amber: '#f59e0b',
          orange: '#f97316',
          rose: '#e11d48',
        },
      },
    },
  },
  plugins: [],
};
