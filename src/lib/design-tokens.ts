/**
 * Design Tokens
 * Centralized design system tokens from Figma
 * https://www.figma.com/design/fzkZeIzkrU7MRLwunuYbTf/Job-Portal
 */

/**
 * Color Tokens
 */
export const colors = {
  // Primary Color Scale (Main brand color)
  primary: {
    10: '#effaff',
    20: '#ccf0ff',
    30: '#a9e5ff',
    40: '#82d5f8',
    50: '#5cc2ed',  // Main action color
    60: '#46a4cb',
    70: '#3386a9',
    80: '#236987',
    90: '#164e65',
    100: '#0c3343',
  },
  
  // Secondary Color Scale (Supporting brand color)
  secondary: {
    10: '#f3fbff',
    20: '#d9f3ff',
    30: '#beebff',
    40: '#a4e3ff',
    50: '#88d9fc',
    60: '#6bb8da',
    70: '#5199b8',
    80: '#3a7a96',
    90: '#275d74',
    100: '#174052',
  },
  
  // Semantic Colors
  error: {
    100: '#f1d3d3',
    500: '#BB2124',
    900: '#250707',
  },
  
  warning: {
    100: '#fcefdc',
    500: '#F0AD4E',
    900: '#302310',
  },
  
  success: {
    100: '#d3f1d6',
    500: '#22BB33',
    900: '#07250a',
  },
  
  info: {
    100: '#def2f8',
    500: '#5BC0DE',
    900: '#12262c',
  },
  
  // Neutral Colors
  grey: {
    100: '#eeeeee',
    200: '#dddddd',
    300: '#cccccc',
    400: '#bbbbbb',
    500: '#AAAAAA',
    600: '#888888',
    700: '#666666',
    800: '#444444',
    900: '#222222',
  },
  
  gray: {
    500: '#6B7280',
    900: '#15171a',
  },
  
  // Special Purpose
  text: {
    body: '#222222',
    action: '#5cc2ed',
    muted: '#6B7280',
    light: '#AAAAAA',
  },
  
  border: {
    primary: '#dddddd',
    light: '#eeeeee',
    dark: '#cccccc',
  },
  
  background: {
    white: '#ffffff',
    light: '#effaff',
    grey: '#f5f5f5',
  },
} as const

/**
 * Spacing Tokens (4px base unit)
 */
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
} as const

/**
 * Border Radius Tokens
 */
export const borderRadius = {
  none: '0',
  sm: '4px',
  default: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const

/**
 * Shadow Tokens
 */
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const

/**
 * Transition Tokens
 */
export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  smooth: '300ms ease-in-out',
  slow: '500ms ease-in-out',
} as const

/**
 * Z-Index Tokens
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const

/**
 * Breakpoints (for reference)
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

/**
 * Typography Weights
 */
export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

/**
 * Font Families
 */
export const fontFamilies = {
  sans: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
  display: 'Krona One, system-ui, sans-serif',
  inter: 'Inter, system-ui, sans-serif',
} as const

/**
 * Helper function to get color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Helper function to get spacing value
 */
export const getSpacing = (multiplier: number): string => {
  return `${multiplier * 4}px`
}

/**
 * Export all tokens
 */
export const tokens = {
  colors,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  fontWeights,
  fontFamilies,
} as const

export default tokens
