/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#060606",
        foreground: "#e8e8e8",
        accent: "#538d4e",
        tile: {
          empty: "transparent",
          correct: "#538d4e",
          present: "#b59f3b",
          absent: "#3a3a3c"
        }
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'Space Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
