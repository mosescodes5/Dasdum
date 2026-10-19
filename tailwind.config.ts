import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary-deep": "rgb(var(--c-primary-deep) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        "gold-light": "rgb(var(--c-gold-light) / <alpha-value>)",
        "gold-text": "rgb(var(--c-gold-text) / <alpha-value>)",
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        soft: "rgb(var(--c-soft) / <alpha-value>)",
        soft2: "rgb(var(--c-soft2) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        text: "rgb(var(--c-text) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        hairline: "rgb(var(--c-hairline) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-roboto)", "system-ui", "sans-serif"],
        ui: ["var(--font-roboto)", "system-ui", "sans-serif"],
        script: ["var(--font-script-face)", "Brush Script MT", "cursive"],
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0) rotate(-4deg)" }, "50%": { transform: "translateY(-10px) rotate(3deg)" } },
      },
      animation: {
        marquee: "marquee 38s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
      maxWidth: { container: "1360px" },
      borderRadius: { sm: "2px", md: "4px" },
      transitionTimingFunction: { editorial: "cubic-bezier(0.22,1,0.36,1)" },
    },
  },
  plugins: [],
};

export default config;
