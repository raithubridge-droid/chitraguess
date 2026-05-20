import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d2530",
        palm: "#16825d",
        marigold: "#f4b942",
        paper: "#fffaf1"
      }
    }
  },
  plugins: []
};

export default config;

