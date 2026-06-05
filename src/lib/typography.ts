/**
 * Typography Utilities
 * Based on 1.25 modular scale with 20px base
 * Figma: https://www.figma.com/design/fzkZeIzkrU7MRLwunuYbTf/Job-Portal
 */

export const typographyScale = {
  // Size: 76px | 3.800rem | Line Height: 91.2px
  display: {
    size: '76px',
    rem: '3.800rem',
    lineHeight: '91.2px',
    class: 'text-76 leading-[91.2px]',
  },
  
  // Size: 61px | 3.050rem | Line Height: 73.2px
  h1: {
    size: '61px',
    rem: '3.050rem',
    lineHeight: '73.2px',
    class: 'text-61 leading-[73.2px]',
  },
  
  // Size: 49px | 2.450rem | Line Height: 58.8px
  h2: {
    size: '49px',
    rem: '2.450rem',
    lineHeight: '58.8px',
    class: 'text-49 leading-[58.8px]',
  },
  
  // Size: 39px | 1.950rem | Line Height: 46.8px
  h3: {
    size: '39px',
    rem: '1.950rem',
    lineHeight: '46.8px',
    class: 'text-39 leading-[46.8px]',
  },
  
  // Size: 31px | 1.550rem | Line Height: 37.2px
  h4: {
    size: '31px',
    rem: '1.550rem',
    lineHeight: '37.2px',
    class: 'text-31 leading-[37.2px]',
  },
  
  // Size: 25px | 1.250rem | Line Height: 30.0px
  h5: {
    size: '25px',
    rem: '1.250rem',
    lineHeight: '30.0px',
    class: 'text-25 leading-[30.0px]',
  },
  
  // Size: 20px | 1.000rem | Line Height: 24.0px (Base)
  bodyLarge: {
    size: '20px',
    rem: '1.000rem',
    lineHeight: '24.0px',
    class: 'text-xl leading-[24.0px]',
  },
  
  // Size: 16px | 0.800rem | Line Height: 19.2px
  bodyBase: {
    size: '16px',
    rem: '0.800rem',
    lineHeight: '19.2px',
    class: 'text-base leading-[19.2px]',
  },
  
  // Size: 13px | 0.650rem | Line Height: 15.6px
  bodySmall: {
    size: '13px',
    rem: '0.650rem',
    lineHeight: '15.6px',
    class: 'text-13 leading-[15.6px]',
  },
  
  // Size: 10px | 0.500rem | Line Height: 12.0px
  caption: {
    size: '10px',
    rem: '0.500rem',
    lineHeight: '12.0px',
    class: 'text-10 leading-[12.0px]',
  },
  
  // Size: 8px | 0.400rem | Line Height: 9.6px
  tiny: {
    size: '8px',
    rem: '0.400rem',
    lineHeight: '9.6px',
    class: 'text-8 leading-[9.6px]',
  },
} as const

/**
 * Typography component classes for easy use
 */
export const typographyClasses = {
  // Display & Headings
  display: 'text-76 leading-[91.2px] font-bold font-display',
  h1: 'text-61 leading-[73.2px] font-bold font-display',
  h2: 'text-49 leading-[58.8px] font-semibold font-sans',
  h3: 'text-39 leading-[46.8px] font-semibold font-sans',
  h4: 'text-31 leading-[37.2px] font-semibold font-sans',
  h5: 'text-25 leading-[30.0px] font-medium font-sans',
  h6: 'text-xl leading-[24.0px] font-medium font-sans',
  
  // Body Text
  bodyXL: 'text-xl leading-[24.0px] font-normal',
  bodyLarge: 'text-xl leading-relaxed font-normal',
  bodyBase: 'text-base leading-[19.2px] font-normal',
  bodySmall: 'text-13 leading-[15.6px] font-normal',
  bodyXS: 'text-10 leading-[12.0px] font-normal',
  
  // Special
  caption: 'text-13 leading-[15.6px] text-text-muted',
  label: 'text-13 leading-[15.6px] font-medium text-text-body',
  link: 'text-base leading-[19.2px] text-text-action hover:underline',
} as const

/**
 * Get typography class by variant
 */
export const getTypographyClass = (variant: keyof typeof typographyClasses): string => {
  return typographyClasses[variant]
}

/**
 * Typography React Components (Type-safe)
 */
export type TypographyVariant = keyof typeof typographyClasses

interface TypographyProps {
  variant?: TypographyVariant
  className?: string
  children: React.ReactNode
}

// Export type for use in components
export type { TypographyProps }
