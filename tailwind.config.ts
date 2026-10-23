import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { accent: "#0d6b5f", soft: "#e3efec" } } },
  plugins: [],
} satisfies Config;
