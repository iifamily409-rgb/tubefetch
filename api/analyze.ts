import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/analyze
 * 
 * Analyzes a YouTube URL using RapidAPI YouTube downloader service.
 * Returns video metadata including title, thumbnail, author, duration.
 * 
 * Environment Variables:
 * - VIDEO_PROVIDER_TYPE: 'rapidapi' (required)
 * - RAPIDAPI_KEY: RapidAPI key (required)
 * - RAPIDAPI_HOST: RapidAPI host (optional, defaults to youtube-mp4-mp3-downloader.p.rapidapi.com)
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

  // Extract video ID from URL
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Invalid YouTube URL. Please enter a valid YouTube video or Shorts link.' },
    });
  }

  const isShort = /youtube\.com\/shorts\//.test(url);

  console.log('[analyze] DIAGNOSTIC: Analyzing video', { videoId, isShort });

  // Check if RapidAPI is configured
  const providerType = process.env.VIDEO_PROVIDER_TYPE;
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'youtube-mp4-mp3-downloader.p.rapidapi.com';

  if (providerType !== 'rapidapi' || !rapidApiKey) {
    console.log('[analyze] DIAGNOSTIC: RapidAPI not configured');
    
    // Fallback to YouTube oEmbed for basic metadata
    try {
      const metadata = await fetchYouTubeMetadata(videoId);
      
      if (!metadata) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIDEO_UNAVAILABLE', message: 'Video not found or unavailable.' },
        });
      }

      return res.status(200).json({
        success: true,
        video: {
          id: videoId,
          title: metadata.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/${isShort ? 'hq' : 'max'}default.jpg`,
          channel: metadata.author_name,
          duration: null,
          uploadDate: null,
          description: null,
          isShort,
        },
        formats: getFormats(isShort),
        downloadAvailable: false,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: { code: 'ANALYZE_FAILED', message: 'Failed to analyze video.' },
      });
    }
  }

  // Use RapidAPI to fetch video info
  try {
    console.log('[analyze] DIAGNOSTIC: Calling RapidAPI for video info');

    const response = await fetch(`https://${rapidApiHost}/api/v2/ytb?id=${videoId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    });

    if (!response.ok) {
      console.log('[analyze] DIAGNOSTIC: RapidAPI returned', response.status);
      
      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIDEO_UNAVAILABLE', message: 'Video not found or unavailable.' },
        });
      }

      return res.status(502).json({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: `RapidAPI returned HTTP ${response.status}` },
      });
    }

    const data = await response.json() as any;

    console.log('[analyze] DIAGNOSTIC: RapidAPI response received');

    // Extract video metadata from RapidAPI response
    // RapidAPI returns data inside videoDetails object
    const videoDetails = data.videoDetails || {};
    
    // Get highest quality thumbnail
    const thumbnails = videoDetails.thumbnails || [];
    const bestThumbnail = thumbnails.length > 0 
      ? thumbnails[thumbnails.length - 1]?.url 
      : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Format duration only if it exists and is > 0
    const duration = videoDetails.duration && videoDetails.duration > 0 
      ? formatDuration(videoDetails.duration) 
      : null;

    // Get description if available
    const description = videoDetails.description || videoDetails.shortDescription || null;

    const video = {
      id: videoId,
      title: videoDetails.title || 'Untitled',
      thumbnail: bestThumbnail,
      channel: videoDetails.author || 'Unknown',
      duration: duration, // null if not available
      uploadDate: null, // API doesn't provide this, so always null
      description: description, // null if not available
      isShort,
      viewCount: videoDetails.viewCount ? formatViewCount(videoDetails.viewCount) : undefined,
    };

    return res.status(200).json({
      success: true,
      video,
      formats: getFormats(isShort),
      downloadAvailable: true,
    });

  } catch (error) {
    console.error('[analyze] DIAGNOSTIC: Error:', error);
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
  // Robust regex to extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/mobile\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '—';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViewCount(views: number): string {
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B views`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M views`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K views`;
  }
  return `${views} views`;
}
