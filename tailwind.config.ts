import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class", // ✅ poprawne w v4

  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
}

export default config
