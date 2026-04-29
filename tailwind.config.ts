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
          card: "#111111",
          surface: "#1a1a1a",
          subtle: "#1f1f1f",
          ink: "#fafafa",
          "ink-soft": "#d4d4d4",
          muted: "#9a9a9a",
          faint: "#6b6b6b",
          border: "rgba(255,255,255,0.08)",
          "border-strong": "rgba(255,255,255,0.14)",
          accent: "#fafafa",
          "accent-soft": "rgba(255,255,255,0.08)",
          ok: "#b8c5b8",
          warn: "#c7bba6",
          err: "#c7a6a6",
          ink0: "#0a0a0a",
          ink1: "#111111",
          ink2: "#1a1a1a",
          ink3: "#2a2a2a",
          ink4: "#3d3d3d",
          mute1: "#6b6b6b",
          mute2: "#9a9a9a",
          chalk1: "#d4d4d4",
          chalk0: "#fafafa",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Geist Variable",
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Geist Variable",
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Geist Mono Variable",
          "Geist Mono",
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
