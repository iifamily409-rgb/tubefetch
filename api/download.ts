import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from './lib/providers';
import { isSafeUrl, isUrlFromProvider } from './lib/security';

/**
 * POST /api/download
 * 
 * Downloads media using the configured provider (Piped or Invidious).
 * 
 * Environment Variables:
 * - VIDEO_PROVIDER_TYPE: 'piped' | 'invidious' (required)
 * - VIDEO_PROVIDER_URL: URL of the provider instance (required)
 * - VIDEO_PROVIDER_API_KEY: API key for the provider (optional)
 * 
 * Request Body:
 * {
 *   videoId: string,
 *   formatId: string,  // "1080p" | "720p" | "480p" | "360p" | "audio-mp3"
 *   url: string        // original YouTube URL
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are accepted.' },
    });
  }

  const { videoId, formatId, url } = req.body || {};

  // Validate request
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid videoId.' },
    });
  }

  if (!formatId || typeof formatId !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid formatId.' },
    });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid URL.' },
    });
  }

  // Validate videoId format (YouTube IDs are 11 chars)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_VIDEO_ID', message: 'The video ID format is invalid.' },
    });
  }

  // Validate URL safety
  if (!isSafeUrl(url)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'The URL is invalid or unsafe.' },
    });
  }

  // Check provider configuration
  const provider = getProvider();

  if (!provider) {
    console.log('[download] DIAGNOSTIC: Provider is not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Download provider is not configured. Set VIDEO_PROVIDER_TYPE and VIDEO_PROVIDER_URL environment variables. See README.md for setup instructions.',
      },
    });
  }

  console.log('[download] DIAGNOSTIC: Request received', { videoId, formatId, provider: provider.name });

  try {
    // Determine download mode based on formatId
    const isAudio = formatId.startsWith('audio-');
    const downloadMode = isAudio ? 'audio' : 'auto';
    const quality = isAudio ? undefined : formatId;
    const audioFormat = isAudio ? formatId.replace('audio-', '') : undefined;

    // Call provider to get media URL
    const downloadResult = await provider.prepareDownload(url, quality, audioFormat, downloadMode);

    if (!downloadResult.success || !downloadResult.mediaUrl) {
      console.log('[download] DIAGNOSTIC: Provider failed to prepare download:', downloadResult.error);
      
      return res.status(502).json({
        success: false,
        error: downloadResult.error || { code: 'DOWNLOAD_FAILED', message: 'Failed to prepare download' },
      });
    }

    const mediaUrl = downloadResult.mediaUrl;
    const fileName = downloadResult.fileName || generateFileName(videoId, formatId);

    console.log('[download] DIAGNOSTIC: Media URL obtained');

    // SSRF protection: Verify the media URL is safe
    if (!isSafeUrl(mediaUrl)) {
      console.log('[download] DIAGNOSTIC: Media URL failed safety check:', mediaUrl);
      return res.status(502).json({
        success: false,
        error: {
          code: 'UNSAFE_MEDIA_URL',
          message: 'The media URL from the provider is unsafe.',
        },
      });
    }

    // Fetch the actual media
    console.log('[download] DIAGNOSTIC: Fetching media from provider');

    const mediaResponse = await provider.fetchMedia(mediaUrl);

    console.log('[download] DIAGNOSTIC: Media fetch status:', mediaResponse.contentType);
    console.log('[download] DIAGNOSTIC: Media Content-Length:', mediaResponse.contentLength);

    // Verify the response is actual media
    if (!isMediaContentType(mediaResponse.contentType)) {
      console.log('[download] DIAGNOSTIC: Non-media content type:', mediaResponse.contentType);
      return res.status(502).json({
        success: false,
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: `Provider returned "${mediaResponse.contentType}" instead of media.`,
        },
      });
    }

    // Verify content length is reasonable
    if (mediaResponse.contentLength) {
      const size = parseInt(mediaResponse.contentLength, 10);
      if (size < 1024) {
        console.log('[download] DIAGNOSTIC: Media too small:', size, 'bytes');
        return res.status(502).json({
          success: false,
          error: {
            code: 'MEDIA_TOO_SMALL',
            message: `Media is only ${size} bytes. The download link may have expired.`,
          },
        });
      }
    }

    // Stream media to the client
    res.setHeader('Content-Type', mediaResponse.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(fileName)}"`);
    if (mediaResponse.contentLength) {
      res.setHeader('Content-Length', mediaResponse.contentLength);
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (mediaResponse.body) {
      const reader = mediaResponse.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const canContinue = res.write(value);
          if (!canContinue) {
            await new Promise<void>(resolve => res.once('drain', () => resolve()));
          }
        }
        res.end();
        console.log('[download] DIAGNOSTIC: Media stream completed successfully');
      } catch (streamError) {
        console.log('[download] DIAGNOSTIC: Stream error:', (streamError as Error).message);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: { code: 'STREAM_ERROR', message: 'Error while streaming media to client.' },
          });
        }
        res.end();
      }
    } else {
      return res.status(502).json({
        success: false,
        error: { code: 'EMPTY_MEDIA_RESPONSE', message: 'Provider returned empty media response.' },
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[download] DIAGNOSTIC: Unhandled error:', errorMessage);

    if (res.headersSent) {
      res.end();
      return;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return res.status(504).json({
        success: false,
        error: { code: 'PROVIDER_TIMEOUT', message: 'Provider API did not respond in time. Please try again.' },
      });
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'PROVIDER_UNREACHABLE',
          message: 'Cannot reach the provider instance. Check your VIDEO_PROVIDER_URL configuration.',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'DOWNLOAD_FAILED', message: 'An internal error occurred while processing the download.' },
    });
  }
}

/**
 * Check if a content type represents actual media data
 */
function isMediaContentType(contentType: string): boolean {
  if (!contentType) return false;
  const mediaTypes = [
    'video/',
    'audio/',
    'application/octet-stream',
    'application/mp4',
    'audio/mp4',
    'audio/mpeg',
    'audio/x-m4a',
  ];
  return mediaTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Generate a safe filename for the download
 */
function generateFileName(videoId: string, formatId: string): string {
  const ext = formatId.startsWith('audio') ? (formatId === 'audio-mp3' ? 'mp3' : 'm4a') : 'mp4';
  return `youtube_${videoId}.${ext}`;
}

/**
 * Sanitize filename to prevent header injection
 */
function sanitizeFilename(filename: string): string {
  // Remove any characters that could cause issues in Content-Disposition header
  return filename.replace(/[^a-zA-Z0-9_\-\. ]/g, '_').substring(0, 255);
}
