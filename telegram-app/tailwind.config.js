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
        // Тёплые нейтральные вместо холодных серых — в тон обложкам
        gray: colors.stone,
        primary: {
          DEFAULT: '#717C5A',
          light: '#8A9A6E',
          dark: '#5A6447',
        },
        background: {
          DEFAULT: '#F6F4EF',
          card: '#FFFFFF',
        },
        text: {
          primary: '#2F302B',
          secondary: '#8B8A82',
        },
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(60, 50, 30, 0.04), 0 6px 20px rgba(60, 50, 30, 0.06)',
      },
    },
  },
  plugins: [],
}
