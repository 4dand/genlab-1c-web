/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme — deeper, more refined tones
        bg: {
          primary: '#0a0c10',
          secondary: '#11141a',
          tertiary: '#1a1e28',
          overlay: '#252a36',
        },
        border: {
          default: 'rgba(255, 255, 255, 0.06)',
          muted: 'rgba(255, 255, 255, 0.03)',
        },
        text: {
          primary: '#eceff4',
          secondary: '#8b95a8',
          muted: '#565e6e',
        },
        accent: {
          blue: '#5b9bf5',
          green: '#3ecf6e',
          yellow: '#e5b44a',
          orange: '#e07a3a',
          red: '#ef5656',
          purple: '#a27ef7',
          pink: '#e668a0',
        },
        // SMOP colors — enriched
        smop: {
          excellent: '#3ecf6e',   // 10 — Отлично
          good: '#7ae8a0',        // 8 — Хорошо
          acceptable: '#e5b44a',  // 6 — Приемлемо
          weak: '#e07a3a',        // 4 — Слабо
          bad: '#ef5656',         // 2 — Плохо
          fail: '#565e6e',        // 0 — Провал
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'code': '13px',
      },
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '68px',
        'chat': '320px',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(91, 155, 245, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(162, 126, 247, 0.3)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
