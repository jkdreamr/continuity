import type { Config } from "tailwindcss";

/**
 * Continuity design tokens.
 *
 * The product is a "private creative control room": editorial desk + project
 * binder + sound-mixing console. Color is used semantically, not decoratively —
 * most surfaces stay neutral (paper / ink) and color marks state and provenance.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101419",
          muted: "#5A6472",
          faint: "#8A94A3",
        },
        paper: "#F7F8F9",
        surface: {
          DEFAULT: "#FFFFFF",
          sunk: "#F1F3F5",
        },
        signal: {
          DEFAULT: "#3157E8",
          soft: "#EBEEFC",
          ink: "#23409F",
        },
        rust: {
          DEFAULT: "#C85C3B",
          soft: "#F8ECE6",
          ink: "#9A431F",
        },
        green: {
          DEFAULT: "#60756A",
          soft: "#E9EFEB",
          ink: "#3E5247",
        },
        rule: {
          DEFAULT: "#D9DEE4",
          soft: "#E7EBEF",
        },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["var(--font-newsreader)", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "7px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,20,25,0.04), 0 1px 1px rgba(16,20,25,0.03)",
        lift: "0 8px 30px -12px rgba(16,20,25,0.18), 0 2px 6px -2px rgba(16,20,25,0.08)",
        rail: "inset 0 0 0 1px rgba(16,20,25,0.05)",
      },
      maxWidth: {
        canvas: "76rem",
      },
      keyframes: {
        "thread-flow": {
          "0%": { strokeDashoffset: "16" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "thread-flow": "thread-flow 1.1s linear infinite",
        "fade-rise": "fade-rise 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
