import type { Config } from 'tailwindcss';
import path from 'path';

// Helper to guarantee absolute, forward-slash normalization across Windows & Monorepo worker threads
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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
};

export default config;
