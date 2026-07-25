import type { Config } from 'tailwindcss';
import path from 'path';

const joinPath = (subpath: string) => path.join(__dirname, subpath).replace(/\\/g, '/');

const config: Config = {
  darkMode: ['class'],
  content: [
    joinPath('src/pages/**/*.{js,ts,jsx,tsx,mdx}'),
    joinPath('src/components/**/*.{js,ts,jsx,tsx,mdx}'),
    joinPath('src/app/**/*.{js,ts,jsx,tsx,mdx}'),
    joinPath('src/features/**/*.{js,ts,jsx,tsx,mdx}'),
    joinPath('src/lib/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      colors: {
        zoho: {
          blue: '#1366D9',
          'blue-hover': '#0F56B3',
          'blue-light': '#EBF2FC',
          green: '#22A06B',
          red: '#DE350B',
          amber: '#FFAB00',
          orange: '#FF8B00',
        },
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      fontSize: {
        'zoho-xs': ['11px', { lineHeight: '1.4', fontWeight: '600' }],
        'zoho-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'zoho-base': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'zoho-md': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
