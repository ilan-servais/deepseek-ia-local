/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        pulse: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fadeIn: "fadeIn 0.5s ease forwards",
      },
      keyframes: {
        pulse: {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.3,
          },
        },
        fadeIn: {
          'from': { 
            opacity: 0, 
            transform: 'translateY(10px)'
          },
          'to': { 
            opacity: 1, 
            transform: 'translateY(0)'
          },
        }
      },
    },
  },
  plugins: [],
}
