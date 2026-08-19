/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: "#05141F",
          900: "#0A1F2E",
          800: "#122C3D",
        },
        current: {
          500: "#1B4F72",
          300: "#3A7CA5",
        },
        bio: {
          400: "#2DE1C2",
          300: "#6BF0D9",
        },
        scan: {
          500: "#F4A259",
        },
        flag: {
          500: "#E8544E",
        },
        foam: {
          50: "#EAF6F6",
          200: "#C4D8DA",
        },
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
        hindi: ["Noto Sans Devanagari", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
