import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider, isProviderConfigured } from './lib/providers';
import { isSafeUrl } from './lib/security';

/**
 * POST /api/analyze
 * 
 * Analyzes a YouTube URL using the configured provider (Piped or Invidious).
 * Falls back to YouTube oEmbed for basic metadata if no provider is configured.
 * 
 * Environment Variables:
 * - VIDEO_PROVIDER_TYPE: 'piped' | 'invidious' (optional)
 * - VIDEO_PROVIDER_URL: URL of the provider instance (optional)
 * - VIDEO_PROVIDER_API_KEY: API key for the provider (optional)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Missing or invalid URL.' },
    });
  }

  // Validate URL format
  if (!isSafeUrl(url)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Invalid or unsafe URL.' },
    });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Invalid YouTube URL. Please enter a valid YouTube video or Shorts link.' },
    });
  }

  const isShort = /youtube\.com\/shorts\//.test(url);

  console.log('[analyze] DIAGNOSTIC: Analyzing video', { videoId, isShort });

  // Try to use configured provider first
  const provider = getProvider();
  
  if (provider) {
    console.log('[analyze] DIAGNOSTIC: Using provider:', provider.name);
    
    try {
      const result = await provider.analyze(url);
      
      if (result.success && result.video && result.formats) {
        console.log('[analyze] DIAGNOSTIC: Provider analysis successful');
        
        return res.status(200).json({
          success: true,
          video: result.video,
          formats: result.formats,
          downloadAvailable: true,
        });
      }
      
      if (result.error) {
        console.log('[analyze] DIAGNOSTIC: Provider error:', result.error);
        
        // Map provider errors to our error codes
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('[analyze] DIAGNOSTIC: Provider failed:', error);
      // Fall through to oEmbed fallback
    }
  }

  // Fallback to YouTube oEmbed (public API, no auth needed)
  console.log('[analyze] DIAGNOSTIC: Falling back to YouTube oEmbed');
  
  try {
    const metadata = await fetchYouTubeMetadata(videoId);

    if (!metadata) {
      console.log('[analyze] DIAGNOSTIC: oEmbed returned no data for', videoId);
      return res.status(404).json({
        success: false,
        error: { code: 'VIDEO_UNAVAILABLE', message: 'Video not found or unavailable.' },
      });
    }

    // Check if download provider is configured
    const downloadAvailable = isProviderConfigured();

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
      error: { code: 'ANALYZE_FAILED', message: 'Failed to analyze video. Please try again.' },
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
