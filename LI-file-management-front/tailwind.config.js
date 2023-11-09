import { dvnkPreset } from './src/utils/theme/tailwindDvnkPreset';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {},
  },
  presets: [dvnkPreset],
  plugins: [],
}

