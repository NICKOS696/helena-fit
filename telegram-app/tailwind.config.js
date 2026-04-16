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
          DEFAULT: '#088395',
          light: '#0A9AAE',
          dark: '#066D7C',
        },
        background: {
          DEFAULT: '#F5F5F5',
          card: '#FFFFFF',
        },
        text: {
          primary: '#333333',
          secondary: '#888888',
        },
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
