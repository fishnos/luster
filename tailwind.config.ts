import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        luster: {
          card: "#ffffff",
          surface: "#fafaf7",
          subtle: "#f4f1ea",
          ink: "#1a1816",
          "ink-soft": "#3a352e",
          muted: "#6b6457",
          faint: "#a59f93",
          border: "#e8e3d8",
          "border-strong": "#d6cfc0",
          accent: "#a07a30",
          "accent-soft": "#fdf3e0",
          ok: "#3f6b3a",
          warn: "#a8631a",
          err: "#9b3b2a",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Charter",
          "Iowan Old Style",
          "New York",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
      },
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      boxShadow: {
        overlay:
          "0 1px 0 rgba(26, 24, 22, 0.04), 0 8px 24px -8px rgba(56, 47, 32, 0.16), 0 24px 48px -16px rgba(56, 47, 32, 0.10)",
        "overlay-edge": "0 0 0 1px rgba(26, 24, 22, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
