import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/download
 * 
 * Downloads a YouTube video using cobalt API.
 * 
 * Environment Variables:
 * - COBALT_API_URL: (required) URL of a cobalt API instance
 * - COBALT_API_KEY: (optional) API key for the cobalt instance
 * 
 * Request Body:
 * {
 *   videoId: string,
 *   formatId: string,  // e.g., "1080p", "720p", "audio-mp3"
 *   url: string        // original YouTube URL
 * }
 * 
 * Returns:
 * - Streams the media file with proper Content-Type and Content-Disposition
 * - Or returns JSON error if download fails
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  // Validate videoId format
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_VIDEO_ID', message: 'The video ID format is invalid.' },
    });
  }

  // Check cobalt configuration
  const cobaltUrl = process.env.COBALT_API_URL;
  const cobaltApiKey = process.env.COBALT_API_KEY;

  if (!cobaltUrl) {
    console.log('[download] DIAGNOSTIC: COBALT_API_URL is not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Download provider is not configured. Set COBALT_API_URL environment variable to enable downloads. See README.md for setup instructions.',
      },
    });
  }

  console.log('[download] DIAGNOSTIC: Request received', { videoId, formatId, url });

  try {
    // Prepare cobalt request based on format
    const cobaltRequest = buildCobaltRequest(url, formatId);

    console.log('[download] DIAGNOSTIC: Calling cobalt at', cobaltUrl);

    // Call cobalt API
    const cobaltResponse = await fetch(cobaltUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(cobaltApiKey ? { 'Authorization': `Api-Key ${cobaltApiKey}` } : {}),
      },
      body: JSON.stringify(cobaltRequest),
      signal: AbortSignal.timeout(30000),
    });

    console.log('[download] DIAGNOSTIC: Cobalt responded with status', cobaltResponse.status);

    if (!cobaltResponse.ok) {
      const errorText = await cobaltResponse.text().catch(() => 'Unknown error');
      console.log('[download] DIAGNOSTIC: Cobalt error:', errorText.substring(0, 200));

      if (cobaltResponse.status === 401 || cobaltResponse.status === 403) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'PROVIDER_AUTH_FAILED',
            message: 'Cobalt API authentication failed. Check your COBALT_API_KEY configuration.',
          },
        });
      }

      return res.status(502).json({
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: `Cobalt API returned HTTP ${cobaltResponse.status}.`,
        },
      });
    }

    const cobaltData = await cobaltResponse.json() as any;
    console.log('[download] DIAGNOSTIC: Cobalt response status:', cobaltData.status);

    // Handle cobalt error response
    if (cobaltData.status === 'error') {
      return res.status(502).json({
        success: false,
        error: {
          code: cobaltData.error?.code || 'COBALT_ERROR',
          message: `Cobalt processing error: ${cobaltData.error?.code || 'Unknown error'}`,
        },
      });
    }

    // Handle tunnel mode (cobalt proxies the file)
    if (cobaltData.status === 'tunnel') {
      const tunnelUrl = cobaltData.url;
      const fileName = cobaltData.filename || generateFileName(videoId, formatId);

      console.log('[download] DIAGNOSTIC: Fetching media from tunnel URL');

      // Fetch the actual media from cobalt's tunnel
      const mediaResponse = await fetch(tunnelUrl, {
        headers: cobaltApiKey ? { 'Authorization': `Api-Key ${cobaltApiKey}` } : {},
        signal: AbortSignal.timeout(60000),
      });

      console.log('[download] DIAGNOSTIC: Media fetch status:', mediaResponse.status);
      console.log('[download] DIAGNOSTIC: Media Content-Type:', mediaResponse.headers.get('content-type'));
      console.log('[download] DIAGNOSTIC: Media Content-Length:', mediaResponse.headers.get('content-length'));

      if (!mediaResponse.ok) {
        return res.status(502).json({
          success: false,
          error: { code: 'MEDIA_FETCH_FAILED', message: 'Failed to fetch media from cobalt tunnel.' },
        });
      }

      const mediaContentType = mediaResponse.headers.get('content-type') || 'video/mp4';
      const mediaContentLength = mediaResponse.headers.get('content-length');

      // Verify it's actual media
      if (!isMediaContentType(mediaContentType)) {
        console.log('[download] DIAGNOSTIC: Non-media content type:', mediaContentType);
        return res.status(502).json({
          success: false,
          error: {
            code: 'INVALID_MEDIA_RESPONSE',
            message: 'Cobalt returned a non-media response.',
          },
        });
      }

      // Verify content length
      if (mediaContentLength) {
        const size = parseInt(mediaContentLength, 10);
        if (size < 1024) {
          console.log('[download] DIAGNOSTIC: Media too small:', size, 'bytes');
          return res.status(502).json({
            success: false,
            error: {
              code: 'MEDIA_TOO_SMALL',
              message: 'The media resource is too small to be valid.',
            },
          });
        }
      }

      // Stream media to client
      res.setHeader('Content-Type', mediaContentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      if (mediaContentLength) {
        res.setHeader('Content-Length', mediaContentLength);
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
        } catch (streamError) {
          console.log('[download] DIAGNOSTIC: Stream error:', (streamError as Error).message);
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: { code: 'STREAM_ERROR', message: 'Error while streaming media.' },
            });
          }
          res.end();
        }
      } else {
        const buffer = await mediaResponse.arrayBuffer();
        res.end(Buffer.from(buffer));
      }

      console.log('[download] DIAGNOSTIC: Media stream completed');
      return;
    }

    // Handle redirect mode (direct URL)
    if (cobaltData.status === 'redirect') {
      const mediaUrl = cobaltData.url;
      const fileName = cobaltData.filename || generateFileName(videoId, formatId);

      console.log('[download] DIAGNOSTIC: Redirecting to media URL');

      // Redirect the client to the media URL
      res.redirect(302, mediaUrl);
      return;
    }

    // Unexpected response
    console.log('[download] DIAGNOSTIC: Unexpected cobalt status:', cobaltData.status);
    return res.status(502).json({
      success: false,
      error: {
        code: 'UNEXPECTED_RESPONSE',
        message: `Unexpected cobalt response: ${cobaltData.status}`,
      },
    });

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
        error: { code: 'PROVIDER_TIMEOUT', message: 'Cobalt API did not respond in time.' },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' },
    });
  }
}

/**
 * Build cobalt API request based on format
 */
function buildCobaltRequest(url: string, formatId: string): any {
  const baseRequest = {
    url,
    filenameStyle: 'pretty',
    youtubeVideoCodec: 'h264',
  };

  switch (formatId) {
    case '1080p':
      return { ...baseRequest, videoQuality: '1080', downloadMode: 'auto' };
    case '720p':
      return { ...baseRequest, videoQuality: '720', downloadMode: 'auto' };
    case '480p':
      return { ...baseRequest, videoQuality: '480', downloadMode: 'auto' };
    case '360p':
      return { ...baseRequest, videoQuality: '360', downloadMode: 'auto' };
    case 'audio-mp3':
      return { ...baseRequest, downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' };
    default:
      return { ...baseRequest, videoQuality: '720', downloadMode: 'auto' };
  }
}

function isMediaContentType(contentType: string): boolean {
  if (!contentType) return false;
  const mediaTypes = ['video/', 'audio/', 'application/octet-stream'];
  return mediaTypes.some(type => contentType.toLowerCase().includes(type));
}

function generateFileName(videoId: string, formatId: string): string {
  const ext = formatId === 'audio-mp3' ? 'mp3' : 'mp4';
  return `youtube_${videoId}.${ext}`;
}
