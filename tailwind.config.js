/** Tailwind build config for the static site.
 *  Build: npm run build:css  (writes assets/css/tailwind.min.css)
 */
module.exports = {
  content: [
    './*.html',
    './blog/**/*.html',
    './services/**/*.html',
    './locksmith-near-me/**/*.html',
    './commercial-accounts/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#008080',
        secondary: '#5B6770',
        accent: '#FFD300',
        light: '#F8F9FA',
        dark: '#212529',
        'dark-secondary': '#495057',
        'primary-hover': '#006666',
        'accent-hover': '#00A3A3',
        border: '#DEE2E6',
        error: '#FF6B6B',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#495057',
            '--tw-prose-headings': '#5B6770',
            '--tw-prose-links': '#008080',
            '--tw-prose-bold': '#212529',
            '--tw-prose-bullets': '#008080',
            '--tw-prose-counters': '#008080',
            '--tw-prose-quote-borders': '#008080',
            '--tw-prose-th-borders': '#DEE2E6',
            '--tw-prose-td-borders': '#DEE2E6',
            maxWidth: 'none',
            a: { textDecoration: 'none', fontWeight: '600' },
            'a:hover': { textDecoration: 'underline' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
