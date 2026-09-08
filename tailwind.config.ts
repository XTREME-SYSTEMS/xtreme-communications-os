import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { custom1: '#0a0a0a', custom2: '#1a1a1a', custom3: '#ffffff', custom4: '#f5f5f5', accent1: '#2ecc71', accent2: '#e74c3c' } } },
  plugins: []
};
export default config;
