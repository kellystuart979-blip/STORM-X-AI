import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        storm: { black: "#080808", purple: "#a855f7", cyan: "#06b6d4" }
      }
    }
  },
  plugins: [],
};
export default config;
