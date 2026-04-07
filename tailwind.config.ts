import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class" as const,
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark palette
        vault: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5b8fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        surface: {
          900: "#0a0a0f",
          800: "#0f0f1a",
          700: "#141420",
          600: "#1a1a2e",
          500: "#1e1e35",
          400: "#252540",
          300: "#2d2d50",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cal)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-vault":
          "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #1a1a2e 100%)",
        "gradient-gold":
          "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)",
        "gradient-card":
          "linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.02) 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-gold": "0 0 20px rgba(251, 191, 36, 0.15)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.4)",
        premium: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        shimmer: "shimmer 2s infinite",
        pulse_slow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        typing: "typing 1.5s steps(3) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(16px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        slideInRight: { from: { transform: "translateX(16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        typing: { "0%, 100%": { opacity: "0.2" }, "50%": { opacity: "1" } },
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [typography],
};

export default config;
