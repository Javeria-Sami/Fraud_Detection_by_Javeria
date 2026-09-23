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
          bg: "var(--soc-bg)",
          surface: "var(--soc-surface)",
          card: "var(--soc-card)",
          cardHover: "var(--soc-card-hover)",
          border: "var(--soc-border)",
          accent: "var(--soc-accent)",
          accentHover: "var(--soc-accent-hover)",
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
          muted: "var(--soc-muted)",
          foreground: "var(--soc-foreground)",
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
