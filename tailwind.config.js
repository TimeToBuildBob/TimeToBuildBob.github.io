/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './_includes/**/*.{html,md,pug}',
    './_layouts/**/*.{html,md,pug}',
    './_posts/**/*.{html,md}',
    './_projects/**/*.{html,md}',
    './_notes/**/*.{html,md}',
    './*.{html,md,pug}'
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        text: 'hsl(var(--text))',
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        border: 'hsl(var(--border))',
      },
      container: {
        center: true,
        padding: '1rem',
      },
    },
  },
  plugins: [],
}
