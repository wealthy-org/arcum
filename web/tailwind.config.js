/** @type {import('tailwindcss').Config} */
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcum: {
          bg: withOpacity('--arcum-bg'),
          bgElevated: withOpacity('--arcum-bg-elevated'),
          surface: withOpacity('--arcum-surface'),
          card: withOpacity('--arcum-card'),
          cardInner: withOpacity('--arcum-card-inner'),
          border: "var(--arcum-border)",
          borderLight: "var(--arcum-border-light)",
          borderGlow: "var(--arcum-border-glow)",
          gold: withOpacity('--arcum-gold'),
          goldLight: withOpacity('--arcum-gold-light'),
          goldMuted: withOpacity('--arcum-gold-muted'),
          goldDark: withOpacity('--arcum-gold-dark'),
          up: withOpacity('--arcum-up'),
          upLight: "#10B981",
          down: withOpacity('--arcum-down'),
          downLight: "#F43F5E",
          text: withOpacity('--arcum-text'),
          muted: withOpacity('--arcum-muted'),
          dark: withOpacity('--arcum-dark'),
          cyan: withOpacity('--arcum-cyan'),
          cobalt: withOpacity('--arcum-cobalt'),
          violet: "#8B3CFF",
          lime: "#80A800",
          cyanGlow: "var(--arcum-border-glow)",
        }
      },
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Unbounded', 'Space Grotesk', 'sans-serif'],
        brand: ['Unbounded', 'Cinzel', 'serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'bezel-outer': 'var(--shadow-bezel-outer)',
        'bezel-inner': 'var(--shadow-bezel-inner)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'cyan-glow': 'var(--shadow-glow-cyan)',
        'gold-bloom': '0 0 30px -5px rgba(212, 175, 55, 0.25)',
        'up-bloom': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'down-bloom': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-subtle': 'pulseSubtle 4s infinite ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'prism-pan': 'prismPan 6s linear infinite',
      },
      keyframes: {
        prismPan: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
