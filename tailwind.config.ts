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
        pop: { "0%": { transform: "scale(1.5)" }, "100%": { transform: "scale(1)" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        pop: "pop 0.35s cubic-bezier(0.22,1,0.36,1)",
        "fade-up": "fadeUp 0.3s ease-out both",
      },
      maxWidth: { container: "1360px" },
      borderRadius: { sm: "2px", md: "4px" },
      transitionTimingFunction: { editorial: "cubic-bezier(0.22,1,0.36,1)" },
    },
  },
  plugins: [],
};

export default config;
