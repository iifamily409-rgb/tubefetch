# TubeFetch

A modern YouTube video and Shorts downloader built with Next.js 14, TypeScript, and Tailwind CSS.

![TubeFetch](https://img.shields.io/badge/TubeFetch-YouTube%20Downloader-purple)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

## 🎯 Overview

TubeFetch is a full-stack web application that provides a clean, modern interface for downloading YouTube videos and Shorts. It features:

- **Real-time video analysis** using YouTube's oEmbed API
- **Multiple quality options** (1080p, 720p, 480p, 360p)
- **Audio extraction** (MP3, M4A)
- **Dark/Light theme** with system preference detection
- **Responsive design** optimized for mobile and desktop
- **Robust error handling** with user-friendly messages

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  TypeScript  │  │ Tailwind CSS │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Vercel Serverless Functions
                    ┌──────────────────┐
                    │  /api/analyze    │ → YouTube oEmbed API (public)
                    │  /api/download   │ → Cobalt Instance
                    └──────────────────┘
                            ↓
              ┌─────────────────────────────┐
              │   Cobalt Instance (External) │
              │   (Railway / Docker / VPS)   │
              │                              │
              │  - ffmpeg for processing     │
              │  - Persistent Node.js        │
              │  - Handles YouTube/Shorts    │
              └─────────────────────────────┘
```

### Why Cobalt Cannot Run on Vercel

Cobalt requires:
- **ffmpeg** binary for video/audio processing
- **Persistent processes** (not compatible with serverless)
- **Docker container** or VPS environment
- **Stateful operations** (file processing, temporary storage)

Vercel serverless functions are:
- Ephemeral (no persistent state)
- Time-limited (10 seconds on hobby, 60 seconds on pro)
- Cannot run Docker containers
- Cannot install system binaries like ffmpeg

**Solution:** Deploy Cobalt separately on Railway, Render, or a VPS, then connect TubeFetch via `VIDEO_PROVIDER_URL`.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Vercel account (free)
- A Cobalt instance (see deployment options below)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/tubefetch.git
cd tubefetch
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required for downloads
VIDEO_PROVIDER_URL=https://your-cobalt-instance.up.railway.app

# Optional: API key if your Cobalt instance requires auth
VIDEO_PROVIDER_API_KEY=
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## 🎬 Deploy Cobalt (Required for Downloads)

### Option 1: Railway One-Click Deploy (Recommended)

**Easiest method - no technical setup required**

1. **Deploy Cobalt to Railway:**
   - Go to: https://railway.com/deploy/cobalt-self-hosted-fix-youtube-downloads-on-railway--cobalt-youtube-downloader
   - Click "Deploy"
   - Wait for deployment (~2 minutes)
   - Copy your instance URL (e.g., `https://cobalt-xxxx.up.railway.app`)

2. **Configure TubeFetch:**
   ```bash
   # In your TubeFetch project
   vercel env add VIDEO_PROVIDER_URL
   # Paste: https://cobalt-xxxx.up.railway.app
   ```

3. **Deploy TubeFetch:**
   ```bash
   vercel --prod
   ```

**Railway Pricing:**
- $5 free credit per month (no credit card required)
- Cobalt typically uses $2-5/month for light usage
- If you exceed free credits, paid plans start at $5/month

### Option 2: Self-Host with Docker

**Full control, requires a VPS**

1. **Set up a VPS** (DigitalOcean, Hetzner, Linode, etc.)

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Deploy Cobalt:**
   ```bash
   git clone https://github.com/imputnet/cobalt
   cd cobalt
   docker-compose up -d
   ```

4. **Configure reverse proxy** (nginx/caddy) with HTTPS

5. **Set VIDEO_PROVIDER_URL** to your domain

Full guide: https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md

### Option 3: Community Instance

Some community-maintained Cobalt instances allow API access:

1. Visit: https://instances.cobalt.best/
2. Find an instance that allows API access
3. Contact the owner for an API key if required
4. Set `VIDEO_PROVIDER_URL` and optionally `VIDEO_PROVIDER_API_KEY`

**Note:** Community instances may have rate limits or availability issues.

## 📁 Project Structure

```
tubefetch/
├── api/                          # Vercel serverless functions
│   ├── analyze.ts               # Video metadata (YouTube oEmbed)
│   └── download.ts              # Media download (Cobalt proxy)
├── src/
│   ├── app/                     # Next.js app router
│   │   ├── page.tsx            # Homepage
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── UrlInput.tsx
│   │   ├── VideoPreview.tsx
│   │   ├── DownloadOptions.tsx
│   │   ├── DownloadProgress.tsx
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── videoService.ts     # Video analysis
│   │   └── downloadService.ts  # Download handling
│   ├── lib/                    # Utilities
│   │   ├── validation.ts       # URL validation
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
│       └── video.ts
├── tests/                      # Vitest tests
│   ├── validation.test.ts
│   ├── videoService.test.ts
│   └── downloadService.test.ts
├── public/                     # Static assets
├── .env.example               # Environment template
├── vercel.json                # Vercel config
└── package.json
```

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VIDEO_PROVIDER_URL` | **Yes** (for downloads) | URL of your Cobalt instance |
| `VIDEO_PROVIDER_API_KEY` | No | API key if your Cobalt instance requires auth |
| `VITE_APP_NAME` | No | App name (default: TubeFetch) |
| `VITE_APP_URL` | No | App URL (default: http://localhost:5173) |

### What Happens Without VIDEO_PROVIDER_URL?

- ✅ Video analysis works (uses YouTube oEmbed - public API)
- ❌ Downloads fail with clear error message
- ✅ UI shows "Provider not configured" error
- ✅ Error includes setup instructions

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

- ✅ URL validation (YouTube, Shorts, invalid URLs)
- ✅ Video service (metadata fetching, format selection)
- ✅ Download service (API responses, error handling)
- ✅ Content-Type validation
- ✅ File size validation
- ✅ Network error handling

## 📊 API Endpoints

### POST /api/analyze

Analyzes a YouTube URL and returns metadata.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "channel": "Rick Astley",
    "duration": "3:33",
    "uploadDate": "2009-10-25",
    "isShort": false
  },
  "formats": [
    { "formatId": "1080p", "quality": "1080p", "format": "MP4", "type": "video" },
    { "formatId": "720p", "quality": "720p", "format": "MP4", "type": "video" },
    { "formatId": "audio-mp3", "quality": "128kbps", "format": "MP3", "type": "audio" }
  ]
}
```

### POST /api/download

Downloads media using Cobalt instance.

**Request:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "formatId": "720p",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
- Streams actual media file (video/mp4 or audio/mpeg)
- Returns JSON error if download fails

## 🛠️ Tech Stack

- **Framework:** Vite + React 18
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Testing:** Vitest
- **Deployment:** Vercel (frontend) + Railway (Cobalt)
- **Video Processing:** Cobalt (open-source)

## 📝 Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## ⚠️ Disclaimer

TubeFetch is for educational purposes. Downloading YouTube videos may violate YouTube's Terms of Service. Always respect copyright and content creators' rights. Only download content you have permission to download.

## 🙏 Acknowledgments

- [Cobalt](https://github.com/imputnet/cobalt) - Open-source media processing
- [YouTube oEmbed](https://www.youtube.com/oembed) - Public metadata API
- [Vercel](https://vercel.com) - Frontend deployment
- [Railway](https://railway.com) - Cobalt hosting

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/tubefetch/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/tubefetch/discussions)
- **Cobalt Docs:** https://github.com/imputnet/cobalt/blob/main/docs/api.md
