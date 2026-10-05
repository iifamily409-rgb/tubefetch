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

# REQUIRED for actual video downloads:
VIDEO_PROVIDER_URL=
VIDEO_PROVIDER_API_KEY=
```

### Download Provider Configuration

TubeFetch uses **[cobalt](https://github.com/imputnet/cobalt)** (44.7k ⭐ on GitHub) as the download provider. Cobalt is an open-source media processing API that supports YouTube, YouTube Shorts, TikTok, Twitter, and more.

**Important:** The official `api.cobalt.tools` instance has bot protection and is NOT for programmatic use. You must either self-host an instance or get access to a community instance.

#### Option A: Self-host a cobalt instance (Recommended)

1. Deploy cobalt on Railway, Render, Fly.io, or any Docker host:
   ```bash
   # Using Docker
   docker pull ghcr.io/imputnet/cobalt:10
   docker run -p 9000:9000 ghcr.io/imputnet/cobalt:10
   ```
   Full guide: https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md

2. Set environment variables in Vercel:
   ```
   COBALT_API_URL=https://your-cobalt-instance.example.com
   COBALT_API_KEY=your-api-key  # Only if your instance requires auth
   ```

#### Option B: Use a community cobalt instance

1. Find instances at: https://instances.cobalt.best/
2. Contact the instance owner for API access
3. Set the environment variables in Vercel

#### Without a configured provider

The app will:
- ✅ Still analyze videos (using YouTube's public oEmbed API - no config needed)
- ❌ Show a clear error when download is attempted
- 📋 Display exact setup instructions in the error message

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

## Architecture

### Pipeline

```
Browser (React SPA on Vercel)
    ↓ POST /api/analyze
/api/analyze.ts
    ↓ YouTube oEmbed API (public, no auth)
Returns: video metadata + available formats

    ↓ User selects quality, clicks download
    ↓ POST /api/download
/api/download.ts
    ↓ POST to COBALT_API_URL (cobalt instance)
Cobalt API
    ↓ Returns tunnel URL or redirect URL
/api/download.ts
    ↓ Fetches actual media from tunnel/redirect
    ↓ Streams media to browser with proper headers
Browser receives actual media bytes
    ↓ Creates Object URL from Blob
File saved to disk
```

### Key Design Decisions

1. **No fake downloads**: The frontend validates every response. If the provider doesn't return actual media bytes, the user sees a clear error.
2. **Serverless-compatible**: No local filesystem, no background workers. Everything runs in Vercel serverless functions.
3. **Provider-agnostic**: Works with any API that returns downloadable media.
4. **Proper error propagation**: JSON errors from the API are surfaced to the user with actionable messages.
5. **Content validation**: The download service checks Content-Type, Content-Length, and minimum file size before accepting a response as valid media.

## Disclaimer

TubeFetch is a demonstration project. Downloading YouTube videos may violate YouTube's Terms of Service. Always respect copyright and content creators' rights. This tool is for educational purposes only.
