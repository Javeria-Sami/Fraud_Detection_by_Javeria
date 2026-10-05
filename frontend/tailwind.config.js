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
          deepGreen: "#1B5E20",
          lightGreen: "#E8F5E9",
          softGreen: "#F4FAF5",
          gold: "#B8860B",
          goldHover: "#996F09",
          goldLight: "#FDF8E7",
          darkText: "#17221A",
          secondaryText: "#526057",
          critical: "#DC2626",
          criticalBg: "rgba(220, 38, 38, 0.10)",
          criticalBorder: "rgba(220, 38, 38, 0.25)",
          high: "#EA580C",
          highBg: "rgba(234, 88, 12, 0.10)",
          highBorder: "rgba(234, 88, 12, 0.25)",
          medium: "#B8860B",
          mediumBg: "rgba(184, 134, 11, 0.12)",
          mediumBorder: "rgba(184, 134, 11, 0.30)",
          low: "#1B5E20",
          lowBg: "rgba(27, 94, 32, 0.10)",
          lowBorder: "rgba(27, 94, 32, 0.25)",
          muted: "rgb(var(--soc-muted) / <alpha-value>)",
          foreground: "rgb(var(--soc-foreground) / <alpha-value>)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soc-sm': '0 1px 2px 0 rgba(27, 94, 32, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'soc-md': '0 4px 6px -1px rgba(27, 94, 32, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'soc-lg': '0 10px 15px -3px rgba(27, 94, 32, 0.10), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow-green': '0 0 20px rgba(27, 94, 32, 0.20)',
        'glow-gold': '0 0 20px rgba(184, 134, 11, 0.25)',
        'glow-critical': '0 0 20px rgba(220, 38, 38, 0.25)',
        'glow-success': '0 0 20px rgba(27, 94, 32, 0.25)',
      }
    },
  },
  plugins: [],
}
