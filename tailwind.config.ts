import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        luster: {
          card: "#131110",
          surface: "#1a1715",
          subtle: "#221e1b",
          ink: "#f5f0e6",
          "ink-soft": "#d9d2c2",
          muted: "#9c9586",
          faint: "#6b665c",
          border: "rgba(245,240,230,0.14)",
          "border-strong": "rgba(245,240,230,0.26)",
          accent: "#f5f0e6",
          "accent-soft": "rgba(245,240,230,0.1)",
          ember: "#d99a6c",
          rose: "#d98a8a",
          jade: "#9bbf9a",
          ivory: "#f5f0e6",
          ok: "#c8dcc8",
          warn: "#e6c69b",
          err: "#ecc8c8",
          ink0: "#0c0a0a",
          ink1: "#131110",
          ink2: "#1a1715",
          ink3: "#26221f",
          ink4: "#3a3530",
          mute1: "#9c9586",
          mute2: "#6b665c",
          chalk1: "#d9d2c2",
          chalk0: "#f5f0e6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter Tight Variable",
          "Inter Tight",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Instrument Serif",
          "Iowan Old Style",
          "Apple Garamond",
          "Times New Roman",
          "ui-serif",
          "serif",
        ],
        display: [
          "Instrument Serif",
          "Iowan Old Style",
          "Apple Garamond",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "JetBrains Mono Variable",
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
        "out-strong": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      boxShadow: {
        overlay:
          "0 1px 0 rgba(0, 0, 0, 0.4), 0 12px 32px -10px rgba(0, 0, 0, 0.55), 0 28px 64px -20px rgba(0, 0, 0, 0.45)",
        "overlay-edge": "0 0 0 1px rgba(255, 255, 255, 0.06)",
        "glass-inset":
          "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.02)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "blur-in": {
          from: {
            opacity: "0",
            filter: "blur(12px)",
            transform: "translateY(6px)",
          },
          to: { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        "drift-a": {
          "0%, 100%": { transform: "translate3d(-10%, -8%, 0) scale(1)" },
          "50%": { transform: "translate3d(8%, 6%, 0) scale(1.15)" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate3d(12%, 10%, 0) scale(1.1)" },
          "50%": { transform: "translate3d(-6%, -10%, 0) scale(0.95)" },
        },
        "shimmer-gray": {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blur-in": "blur-in 720ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "drift-a": "drift-a 22s ease-in-out infinite",
        "drift-b": "drift-b 28s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
