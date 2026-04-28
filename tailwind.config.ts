import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        luster: {
          bg: "#0e0f12",
          panel: "#1a1c22",
          panel2: "#22252d",
          border: "#2c3038",
          ink: "#e6e8ee",
          muted: "#8a8f9c",
          accent: "#c8a85a",
          warn: "#e6a23c",
          err: "#d96a6a",
          ok: "#7ab97f",
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
        serif: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      boxShadow: {
        overlay:
          "0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
