/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './_includes/**/*.{html,md,pug}',
    './_layouts/**/*.{html,md,pug}',
    './_posts/**/*.{html,md}',
    './_projects/**/*.{html,md}',
    './_notes/**/*.{html,md}',
    './pages/**/*.{html,md,pug}',
    './*.{html,md,pug}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          light: 'rgb(var(--primary) / 0.1)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          light: 'rgb(var(--success) / 0.1)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          light: 'rgb(var(--warning) / 0.1)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          light: 'rgb(var(--info) / 0.1)',
        }
      }
    }
  },
  plugins: [],
}
