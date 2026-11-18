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
        background: '#F6F4EF',
      },
      // Скругления и тени карточек — как в Mini App
      borderRadius: {
        lg: '14px',
      },
      boxShadow: {
        DEFAULT: '0 1px 2px rgba(60, 50, 30, 0.04), 0 6px 20px rgba(60, 50, 30, 0.06)',
        sm: '0 1px 2px rgba(60, 50, 30, 0.05)',
      },
    },
  },
  plugins: [],
}
