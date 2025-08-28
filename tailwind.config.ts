import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "#E2045B",
          secondary: "#FF992C", 
          text: "#8A8A93",
          accent: "#0D0F1000",
          blue: "#00A6FB",
          white: "#FFFFFF",
          black: "#000000",
          background: "#FDF7F2",
          success: "#05BC44",
        }
      },
      fontFamily: {
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      gridTemplateColumns: {
        'fluid-320': 'repeat(auto-fit, minmax(320px, 1fr))',
        'fluid-280': 'repeat(auto-fit, minmax(280px, 1fr))',
        'fluid-480': 'repeat(auto-fit, minmax(480px, 1fr))',
      },
    },
  },
  plugins: [],
};
export default config;
