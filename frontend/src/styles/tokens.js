/**
 * Champions Club - Centralized Design Tokens
 * 
 * Strict design system tokens for color palette, typography, spacing,
 * borders, shadows, and breakpoints.
 */

export const TOKENS = {
  colors: {
    // Primary Brand & Accents (Restrained Cyan / Sky Blue)
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7', // Primary Accent
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    // Dark Navy Shell (Sidebar, Brand header, Deep elements)
    navy: {
      800: '#1e293b',
      900: '#0f172a', // Primary Sidebar Dark Navy
      950: '#020617', // Sidebar Header / Deepest Background
    },
    // Neutral Workspace (Backgrounds, Borders, Cards)
    neutral: {
      50: '#f8fafc',  // Main Workspace Background
      100: '#f1f5f9', // Table Headers / Soft Dividers
      200: '#e2e8f0', // Standard Border
      300: '#cbd5e1', // Input Border Default
      400: '#94a3b8', // Muted Text / Placeholder
      500: '#64748b', // Secondary Text
      600: '#475569', // Body Text Subdued
      700: '#334155', // Body Text Default
      800: '#1e293b', // Headings / High Contrast Text
      900: '#0f172a', // Title Text
      white: '#ffffff',
    },
    // Domain Semantic States
    semantic: {
      success: {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        text: '#047857',
        solid: '#10b981',
      },
      warning: {
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#b45309',
        solid: '#f59e0b',
      },
      danger: {
        bg: '#fff1f2',
        border: '#fecdd3',
        text: '#be123c',
        solid: '#f43f5e',
      },
      info: {
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1d4ed8',
        solid: '#3b82f6',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
    modal: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

export default TOKENS;
