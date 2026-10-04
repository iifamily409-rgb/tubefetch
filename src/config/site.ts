export const siteConfig = {
  name: 'TubeFetch',
  description: 'Download YouTube videos and Shorts in any quality. Fast, free, and easy to use.',
  url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  appName: import.meta.env.VITE_APP_NAME || 'TubeFetch',
  version: '1.0.0',
  author: 'TubeFetch Team',
  github: 'https://github.com/tubefetch/tubefetch',
  links: {
    howItWorks: '/how-it-works',
    supportedFormats: '/supported-formats',
    faq: '/faq',
    about: '/about',
  },
} as const;
