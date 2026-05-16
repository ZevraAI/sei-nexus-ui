/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          muted: 'var(--bg-surface-muted)',
        },
        'sidebar-bg': 'var(--bg-sidebar)',
        'item-hover': 'var(--bg-hover)',
        line: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        foreground: 'var(--text-primary)',
        'muted-fg': 'var(--text-secondary)',
        'dim-fg': 'var(--text-tertiary)',
        'off-fg': 'var(--text-disabled)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          soft: 'var(--accent-soft)',
          line: 'var(--accent-line)',
        },
        ok: {
          DEFAULT: 'var(--success)',
          bg: '#E6F2ED',
        },
        caution: {
          DEFAULT: 'var(--warning)',
          bg: '#FDF0E0',
        },
        risk: {
          DEFAULT: 'var(--danger)',
          bg: '#F9EAEA',
        },
        note: {
          DEFAULT: 'var(--info)',
          bg: '#EBF2F8',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '12px',
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.3' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        '3xl': ['28px', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
};
