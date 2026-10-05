import type { VideoMetadata, VideoFormat, AnalyzeResponse } from '../types/video';
import { extractVideoId, isYouTubeShort, getThumbnailUrl } from '../lib/validation';
import { sleep } from '../lib/utils';

/**
 * Video Service
 * 
 * Handles video analysis and download preparation.
 * 
 * Analysis flow:
 * 1. Try calling /api/analyze (uses YouTube oEmbed for real metadata)
 * 2. If API is not available, fall back to local mock data
 * 
 * Download flow:
 * 1. prepareDownload() returns display info
 * 2. The actual download is handled by downloadService.ts calling /api/download
 * 
 * The /api/download endpoint uses cobalt API (requires COBALT_API_URL env var).
 */

// Mock video database for fallback when API is not available
const MOCK_VIDEOS: Record<string, VideoMetadata> = {
  'dQw4w9WgXcQ': {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    thumbnail: getThumbnailUrl('dQw4w9WgXcQ', 'maxres'),
    channel: 'Rick Astley',
    duration: '3:33',
    uploadDate: '2009-10-25',
    isShort: false,
    viewCount: '1.5B views',
    description: 'The official video for "Never Gonna Give You Up" by Rick Astley.',
  },
  'jNQXATDIZ0w': {
    id: 'jNQXATDIZ0w',
    title: 'Amazing Nature Documentary - 4K Ultra HD',
    thumbnail: getThumbnailUrl('jNQXATDIZ0w', 'maxres'),
    channel: 'Nature Films',
    duration: '12:34',
    uploadDate: '2024-03-15',
    isShort: false,
    viewCount: '2.3M views',
    description: 'Stunning nature footage in 4K resolution.',
  },
};

const MOCK_FORMATS_VIDEO: VideoFormat[] = [
  { formatId: '1080p', quality: '1080p', resolution: '1920x1080', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: '720p', quality: '720p', resolution: '1280x720', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: '480p', quality: '480p', resolution: '854x480', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: '360p', quality: '360p', resolution: '640x360', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
];

const MOCK_FORMATS_SHORT: VideoFormat[] = [
  { formatId: '1080p', quality: '1080p', resolution: '1080x1920', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: '720p', quality: '720p', resolution: '720x1280', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: '480p', quality: '480p', resolution: '480x854', format: 'MP4', fileSize: '—', hasAudio: true, hasVideo: true, type: 'video' },
];

const MOCK_FORMATS_AUDIO: VideoFormat[] = [
  { formatId: 'audio-m4a', quality: '192kbps', format: 'M4A', fileSize: '—', hasAudio: true, hasVideo: false, type: 'audio' },
  { formatId: 'audio-mp3', quality: '128kbps', format: 'MP3', fileSize: '—', hasAudio: true, hasVideo: false, type: 'audio' },
];

export async function validateUrl(url: string): Promise<{ valid: boolean; videoId: string | null; isShort: boolean }> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { valid: false, videoId: null, isShort: false };
  }
  return { valid: true, videoId, isShort: isYouTubeShort(url) };
}

export async function getMetadata(videoId: string): Promise<VideoMetadata | null> {
  await sleep(800 + Math.random() * 700);

  if (MOCK_VIDEOS[videoId]) {
    return MOCK_VIDEOS[videoId];
  }

  const isShort = videoId.startsWith('short') || videoId.length <= 8;
  return {
    id: videoId,
    title: isShort ? 'Amazing Short Video 🎬 #shorts' : 'YouTube Video - High Quality Content',
    thumbnail: getThumbnailUrl(videoId, isShort ? 'high' : 'maxres'),
    channel: 'Content Creator',
    duration: isShort ? '0:30' : '10:24',
    uploadDate: '2024-05-10',
    isShort,
    viewCount: '1.2M views',
    description: 'A great video worth watching.',
  };
}

export async function getAvailableFormats(isShort: boolean): Promise<VideoFormat[]> {
  await sleep(400 + Math.random() * 300);
  const videoFormats = isShort ? MOCK_FORMATS_SHORT : MOCK_FORMATS_VIDEO;
  return [...videoFormats, ...MOCK_FORMATS_AUDIO];
}

/**
 * Analyze a YouTube URL.
 * 
 * Tries the real /api/analyze endpoint first (which uses YouTube oEmbed).
 * Falls back to local mock data if the API is not available.
 */
export async function analyzeVideo(url: string): Promise<AnalyzeResponse> {
  const validation = await validateUrl(url);
  if (!validation.valid || !validation.videoId) {
    return {
      success: false,
      error: 'Invalid URL. Please enter a valid YouTube video or Shorts link.',
    };
  }

  // Try the real API first
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json() as {
        success: boolean;
        video?: VideoMetadata;
        formats?: VideoFormat[];
        error?: string;
        downloadAvailable?: boolean;
      };

      if (data.success && data.video) {
        return {
          success: true,
          video: data.video,
          formats: data.formats || await getAvailableFormats(data.video.isShort),
        };
      }

      if (data.error) {
        // API returned an error - use it
        return {
          success: false,
          error: data.error,
        };
      }
    }
  } catch {
    // API not available, fall through to mock
    console.log('[videoService] /api/analyze not available, using fallback');
  }

  // Fallback to mock data
  await sleep(500);
  const metadata = await getMetadata(validation.videoId);
  if (!metadata) {
    return {
      success: false,
      error: 'Video unavailable. The video may have been removed or is private.',
    };
  }

  const formats = await getAvailableFormats(metadata.isShort);

  return {
    success: true,
    video: metadata,
    formats,
  };
}

/**
 * Prepare download info for display purposes.
 * The actual download is handled by downloadService.ts.
 */
export async function prepareDownload(videoId: string, formatId: string): Promise<{
  fileName: string;
  fileSize: string;
  quality: string;
  format: string;
}> {
  await sleep(300);

  const allFormats = [...MOCK_FORMATS_VIDEO, ...MOCK_FORMATS_SHORT, ...MOCK_FORMATS_AUDIO];
  const selectedFormat = allFormats.find(f => f.formatId === formatId);

  if (!selectedFormat) {
    throw new Error('Format not available');
  }

  const metadata = await getMetadata(videoId);
  const safeTitle = metadata?.title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'video';

  return {
    fileName: `${safeTitle}.${selectedFormat.format.toLowerCase()}`,
    fileSize: selectedFormat.fileSize || '—',
    quality: selectedFormat.quality,
    format: selectedFormat.format,
  };
}

export function cleanup(): void {
  // No-op
}
