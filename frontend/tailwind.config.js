/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: "class", // 🌙 Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        school: {
          DEFAULT: "#1D4ED8", // Blue 700
          dark: "#1E40AF",    // Blue 800
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        heading: ['Inter', 'ui-sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideInLeft: 'slideInLeft 0.4s ease-in-out',
      },
      screens: {
        xs: '480px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
