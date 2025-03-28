/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#25A25A',
        'primary-dark': '#1E884C',
        'background': '#f4f4f4',
        'table': '#f9f9f9',
        'border': '#dddddd',
      }
    },
  },
  plugins: [],
}