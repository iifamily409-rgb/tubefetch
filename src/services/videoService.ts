import type { VideoMetadata, VideoFormat, AnalyzeResponse } from '../types/video';
import { extractVideoId, isYouTubeShort, getThumbnailUrl } from '../lib/validation';
import { sleep } from '../lib/utils';

// Mock video database for demo purposes
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
  'jNQvPA2VpB8': {
    id: 'jNQvPA2VpB8',
    title: 'Amazing Nature Documentary - 4K Ultra HD',
    thumbnail: getThumbnailUrl('jNQvPA2VpB8', 'maxres'),
    channel: 'Nature Films',
    duration: '12:34',
    uploadDate: '2024-03-15',
    isShort: false,
    viewCount: '2.3M views',
    description: 'Stunning nature footage in 4K resolution.',
  },
  'shorts001': {
    id: 'shorts001',
    title: 'Incredible Sunset Timelapse 🌅 #shorts',
    thumbnail: getThumbnailUrl('shorts001', 'high'),
    channel: 'Timelapse Daily',
    duration: '0:45',
    uploadDate: '2024-06-20',
    isShort: true,
    viewCount: '890K views',
    description: 'Beautiful sunset captured in timelapse.',
  },
};

const MOCK_FORMATS_VIDEO: VideoFormat[] = [
  { formatId: 'v-1080', quality: '1080p', resolution: '1920x1080', format: 'MP4', fileSize: '145 MB', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: 'v-720', quality: '720p', resolution: '1280x720', format: 'MP4', fileSize: '85 MB', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: 'v-480', quality: '480p', resolution: '854x480', format: 'MP4', fileSize: '45 MB', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: 'v-360', quality: '360p', resolution: '640x360', format: 'MP4', fileSize: '25 MB', hasAudio: true, hasVideo: true, type: 'video' },
];

const MOCK_FORMATS_SHORT: VideoFormat[] = [
  { formatId: 'v-1080s', quality: '1080p', resolution: '1080x1920', format: 'MP4', fileSize: '12 MB', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: 'v-720s', quality: '720p', resolution: '720x1280', format: 'MP4', fileSize: '8 MB', hasAudio: true, hasVideo: true, type: 'video' },
  { formatId: 'v-480s', quality: '480p', resolution: '480x854', format: 'MP4', fileSize: '5 MB', hasAudio: true, hasVideo: true, type: 'video' },
];

const MOCK_FORMATS_AUDIO: VideoFormat[] = [
  { formatId: 'a-m4a', quality: '192kbps', format: 'M4A', fileSize: '8 MB', hasAudio: true, hasVideo: false, type: 'audio' },
  { formatId: 'a-mp3', quality: '320kbps', format: 'MP3', fileSize: '12 MB', hasAudio: true, hasVideo: false, type: 'audio' },
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

  // Generate a plausible mock for any video ID
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

export async function analyzeVideo(url: string): Promise<AnalyzeResponse> {
  await sleep(500);

  const validation = await validateUrl(url);
  if (!validation.valid || !validation.videoId) {
    return {
      success: false,
      error: 'Invalid URL. Please enter a valid YouTube video or Shorts link.',
    };
  }

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
    fileSize: selectedFormat.fileSize || 'Unknown',
    quality: selectedFormat.quality,
    format: selectedFormat.format,
  };
}

export function cleanup(): void {
  // Cleanup temporary files - no-op in demo
}
