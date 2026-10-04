/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "rgb(var(--soc-bg) / <alpha-value>)",
          surface: "rgb(var(--soc-surface) / <alpha-value>)",
          card: "rgb(var(--soc-card) / <alpha-value>)",
          cardHover: "rgb(var(--soc-card-hover) / <alpha-value>)",
          border: "rgb(var(--soc-border) / <alpha-value>)",
          accent: "rgb(var(--soc-accent) / <alpha-value>)",
          accentHover: "rgb(var(--soc-accent-hover) / <alpha-value>)",
          critical: "#EF4444",
          criticalBg: "rgba(239, 68, 68, 0.12)",
          criticalBorder: "rgba(239, 68, 68, 0.3)",
          high: "#F97316",
          highBg: "rgba(249, 115, 22, 0.12)",
          highBorder: "rgba(249, 115, 22, 0.3)",
          medium: "#EAB308",
          mediumBg: "rgba(234, 179, 8, 0.12)",
          mediumBorder: "rgba(234, 179, 8, 0.3)",
          low: "#10B981",
          lowBg: "rgba(16, 185, 129, 0.12)",
          lowBorder: "rgba(16, 185, 129, 0.3)",
          muted: "rgb(var(--soc-muted) / <alpha-value>)",
          foreground: "rgb(var(--soc-foreground) / <alpha-value>)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soc-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'soc-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'soc-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.35)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-critical': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
