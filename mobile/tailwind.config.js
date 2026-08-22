/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (never toggled) rather than the default 'media': the app is deliberately
  // light-only, same as the web frontend's forced `color-scheme: light` in globals.css.
  // Leaving this as 'media' let something in the RN/react-navigation stack (used
  // internally by expo-router) call Appearance.setColorScheme() on web, which
  // NativeWind rejects outright when darkMode is 'media' — a real uncaught crash
  // found via Playwright, not a cosmetic issue.
  darkMode: 'class',
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
