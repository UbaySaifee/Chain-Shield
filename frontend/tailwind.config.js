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
        shield: {
          950: '#070A10', // Deepest background
          900: '#0B0F19', // Main Obsidian background
          850: '#101626', // Section background
          800: '#161F36', // Card surface
          750: '#1C2742', // Elevated card / hover
          700: '#263554', // Border light
          600: '#3A4D75', // Muted text
          500: '#546A9E', // Subtitle text
          cyan: '#06B6D4',   // Active Scan Accent
          emerald: '#10B981',// Safe
          amber: '#F59E0B',  // Warning
          rose: '#EF4444',   // Critical
          indigo: '#6366F1', // Primary brand
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
