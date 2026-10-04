# TubeFetch

A modern YouTube video and Shorts downloader interface.

![TubeFetch](https://img.shields.io/badge/TubeFetch-v1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

## Features

- 🎬 Download YouTube videos in multiple qualities (1080p, 720p, 480p, 360p)
- 📱 Full YouTube Shorts support with automatic detection
- 🎵 Audio extraction (MP3, M4A)
- ⚡ Lightning-fast analysis and download preparation
- 🎨 Premium dark UI with glassmorphism design
- 🌓 Dark/Light theme support
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🔒 No registration required
- 🚫 No ads, no tracking

## Screenshots

The application features:
- Clean hero section with URL input
- Video preview with thumbnail and metadata
- Quality selector with video and audio options
- Real-time download progress tracking
- Beautiful error states

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 6
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Vitest + Testing Library
- **Language**: TypeScript (strict mode)

## Project Structure

```text
tubefetch/
├── .github/
│   └── workflows/
│       └── ci.yml
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── UrlInput.tsx
│   │   ├── VideoPreview.tsx
│   │   ├── DownloadOptions.tsx
│   │   ├── DownloadProgress.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── FAQ.tsx
│   │   └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── FAQPage.tsx
│   │   ├── SupportedFormatsPage.tsx
│   │   └── HowItWorksPage.tsx
│   ├── services/
│   │   └── videoService.ts
│   ├── lib/
│   │   ├── validation.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── video.ts
│   ├── config/
│   │   └── site.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── validation.test.ts
│   └── videoService.test.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── tsconfig.json
```

## Installation

```bash
git clone https://github.com/tubefetch/tubefetch.git
cd tubefetch
npm install
```

## Environment Variables

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

```env
VITE_APP_NAME=TubeFetch
VITE_APP_URL=http://localhost:5173
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch
```

## Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Start Production Server

```bash
npm run preview
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host"]
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Disclaimer

TubeFetch is a demonstration project. Downloading YouTube videos may violate YouTube's Terms of Service. Always respect copyright and content creators' rights. This tool is for educational purposes only.
