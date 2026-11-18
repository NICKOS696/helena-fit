import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Тёплые нейтральные, как в Mini App
        gray: colors.stone,
        primary: {
          DEFAULT: '#717C5A',
          light: '#8A9A6E',
          dark: '#5A6447',
        },
      },
    },
  },
  plugins: [],
}
