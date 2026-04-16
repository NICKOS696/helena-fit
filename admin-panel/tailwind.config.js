/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#45B5C4',
          light: '#4DC8D4',
          dark: '#3DA3B0',
        },
      },
    },
  },
  plugins: [],
}
