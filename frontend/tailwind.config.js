/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        space: {
          950: "#05060f",
          900: "#0b0e1f",
          800: "#12162e",
        },
        aurora: {
          blue: "#4f8bff",
          violet: "#9d6bff",
          pink: "#ff6bb3",
          cyan: "#5ee7ff",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}

