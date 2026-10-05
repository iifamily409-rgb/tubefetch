import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/analyze
 * 
 * Analyzes a YouTube URL:
 * 1. Fetches metadata from YouTube oEmbed API (public, no auth needed)
 * 2. Checks if cobalt download provider is configured
 * 3. Returns metadata + available formats
 * 
 * Environment Variables:
 * - COBALT_API_URL: (optional) URL of a cobalt API instance for downloads
 * - COBALT_API_KEY: (optional) API key for the cobalt instance
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid URL.',
    });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: 'Invalid YouTube URL. Please enter a valid YouTube video or Shorts link.',
    });
  }

  const isShort = /youtube\.com\/shorts\//.test(url);

  console.log('[analyze] DIAGNOSTIC: Analyzing video', { videoId, isShort });

  try {
    // Fetch metadata from YouTube oEmbed (public API, no auth needed)
    const metadata = await fetchYouTubeMetadata(videoId);

    if (!metadata) {
      console.log('[analyze] DIAGNOSTIC: oEmbed returned no data for', videoId);
      return res.status(404).json({
        success: false,
        error: 'Video not found or unavailable.',
      });
    }

    // Check if download provider is configured
    const providerUrl = process.env.VIDEO_PROVIDER_URL;
    const downloadAvailable = !!providerUrl;

    console.log('[analyze] DIAGNOSTIC: Download available:', downloadAvailable);

    return res.status(200).json({
      success: true,
      video: {
        id: videoId,
        title: metadata.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/${isShort ? 'hq' : 'max'}default.jpg`,
        channel: metadata.author_name,
        duration: '—',
        uploadDate: new Date().toISOString().split('T')[0],
        isShort,
      },
      formats: getFormats(isShort),
      downloadAvailable,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log('[analyze] DIAGNOSTIC: Error:', message);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze video. Please try again.',
    });
  }
}

async function fetchYouTubeMetadata(videoId: string): Promise<{ title: string; author_name: string } | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { title: string; author_name: string };
    return { title: data.title, author_name: data.author_name };
  } catch {
    return null;
  }
}

function getFormats(isShort: boolean) {
  const videoFormats = [
    { formatId: '1080p', quality: '1080p', resolution: isShort ? '1080x1920' : '1920x1080', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' as const },
    { formatId: '720p', quality: '720p', resolution: isShort ? '720x1280' : '1280x720', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' as const },
    { formatId: '480p', quality: '480p', resolution: isShort ? '480x854' : '854x480', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' as const },
    { formatId: '360p', quality: '360p', resolution: isShort ? '360x640' : '640x360', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' as const },
  ];

  const audioFormats = [
    { formatId: 'audio-mp3', quality: '128kbps', format: 'MP3', fileSize: '—', hasAudio: true, hasVideo: false, type: 'audio' as const },
  ];

  return [...videoFormats, ...audioFormats];
}

function extractVideoId(url: string): string | null {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.trim().match(regex);
  return match ? match[5] : null;
}
