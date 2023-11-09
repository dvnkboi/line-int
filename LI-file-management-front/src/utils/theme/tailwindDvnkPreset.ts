import forms from '@tailwindcss/forms';
import plugin from 'tailwindcss/plugin';
import { fontFamily } from 'tailwindcss/defaultTheme';
// @ts-ignore
import animatePlugin from 'tailwindcss-animate';
import { Config } from 'tailwindcss/types/config';

export const dvnkboiPlugin = plugin(async ({ addBase, addComponents, }) => {

  // const defaultTheme = {
  //   background: "hsl(var(--background) / <alpha-value>)",
  //   color: "hsl(var(--foreground) / <alpha-value>)",
  //   "font-feature-settings": '"rlig" 1, "calt" 1'
  // };

  // addBase({
  //   body: defaultTheme,
  //   html: defaultTheme,
  //   "#app": defaultTheme
  // });

  addComponents({
    '.overflow-overlay': {
      'overflow': 'overlay',
    },
    '.overflow-x-overlay': {
      'overflow-x': 'overlay',
    },
    '.overflow-y-overlay': {
      'overflow-y': 'overlay',
    },
  });

}, {
  content: [
    // sharedUI
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        'noise': 'var(--background-noise)'
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: '0' },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: '0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
    },
  },
} as Config);


export const dvnkPreset: Config = {
  darkMode: 'class',
  content: [],
  plugins: [dvnkboiPlugin, animatePlugin, forms()]
};

export default dvnkPreset;