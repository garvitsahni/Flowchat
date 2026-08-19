/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: "#1F1E1D",
          900: "#262624",
          800: "#30302E",
        },
        current: {
          500: "#3F3D3B",
          300: "#8C8A86",
        },
        bio: {
          400: "#D97757",
          300: "#E68A6E",
        },
        scan: {
          500: "#F4A259",
        },
        flag: {
          500: "#E8544E",
        },
        foam: {
          50: "#ECECEC",
          200: "#B5B3AE",
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
