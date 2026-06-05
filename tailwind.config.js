/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Primary Color Scale (from Figma - Main brand color)
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
        
        // Secondary Color Scale (from Figma - Supporting brand color)
        secondary: {
          10: '#f3fbff',
          20: '#d9f3ff',
          30: '#beebff',
          40: '#a4e3ff',
          50: '#88d9fc',  // Main secondary color
          60: '#6bb8da',
          70: '#5199b8',
          80: '#3a7a96',
          90: '#275d74',
          100: '#174052',
        },
        
        // Semantic Colors
        error: {
          100: '#f1d3d3',
          200: '#e4a6a7',
          300: '#d67a7c',
          400: '#c94d50',
          500: '#BB2124',
          600: '#961a1d',
          700: '#701416',
          800: '#4b0d0e',
          900: '#250707',
        },
        
        warning: {
          100: '#fcefdc',
          200: '#f9deb8',
          300: '#f6ce95',
          400: '#f3bd71',
          500: '#F0AD4E',
          600: '#c08a3e',
          700: '#90682f',
          800: '#60451f',
          900: '#302310',
        },
        
        success: {
          100: '#d3f1d6',
          200: '#a7e4ad',
          300: '#7ad685',
          400: '#4ec95c',
          500: '#22BB33',
          600: '#1b9629',
          700: '#14701f',
          800: '#0e4b14',
          900: '#07250a',
        },
        
        info: {
          100: '#def2f8',
          200: '#bde6f2',
          300: '#9dd9eb',
          400: '#7ccde5',
          500: '#5BC0DE',
          600: '#499ab2',
          700: '#377385',
          800: '#244d59',
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
          100: '#e1e3e6',
          200: '#c4c7cc',
          300: '#a6aab3',
          400: '#898e99',
          500: '#6B7280',
          600: '#565b66',
          700: '#40444d',
          800: '#2b2e33',
          900: '#15171a',
        },
        
        // Special Purpose Colors
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

        // Keep existing shadcn colors for compatibility
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      
      // Typography Scale (Base: 20px, Scale: 1.25)
      // Exact values from your typography component
      fontSize: {
        // Custom sizes with exact px values
        '8': ['8px', { lineHeight: '9.6px' }],      // 0.400rem
        '10': ['10px', { lineHeight: '12.0px' }],   // 0.500rem
        '13': ['13px', { lineHeight: '15.6px' }],   // 0.650rem
        'base': ['16px', { lineHeight: '19.2px' }], // 0.800rem
        'xl': ['20px', { lineHeight: '24.0px' }],   // 1.000rem - Base size
        '25': ['25px', { lineHeight: '30.0px' }],   // 1.250rem
        '31': ['31px', { lineHeight: '37.2px' }],   // 1.550rem
        '39': ['39px', { lineHeight: '46.8px' }],   // 1.950rem
        '49': ['49px', { lineHeight: '58.8px' }],   // 2.450rem
        '61': ['61px', { lineHeight: '73.2px' }],   // 3.050rem
        '76': ['76px', { lineHeight: '91.2px' }],   // 3.800rem
      },
      
      // Spacing Scale (4px base unit)
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
      },
      
      // Font Family
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['Krona One', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'none': '0',
        'DEFAULT': '8px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
      },
      
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
