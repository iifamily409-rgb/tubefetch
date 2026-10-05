import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/download
 * 
 * Proxies a video download from the configured video provider.
 * 
 * Request body:
 *   { videoId: string, formatId: string, quality?: string, format?: string }
 * 
 * Required environment variables:
 *   VIDEO_PROVIDER_URL - Base URL of the video provider API
 *   VIDEO_PROVIDER_API_KEY - API key for the video provider
 * 
 * Returns:
 *   - On success: streams the media file with proper Content-Type and Content-Disposition
 *   - On error: returns JSON { success: false, error: { code, message } }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are accepted.' },
    });
  }

  const { videoId, formatId, quality, format } = req.body || {};

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

  // Validate videoId format (YouTube IDs are 11 characters, alphanumeric + _ -)
  if (!/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_VIDEO_ID', message: 'The video ID format is invalid.' },
    });
  }

  // Check provider configuration
  const providerUrl = process.env.VIDEO_PROVIDER_URL;
  const providerApiKey = process.env.VIDEO_PROVIDER_API_KEY;

  if (!providerUrl) {
    console.log('[download] DIAGNOSTIC: VIDEO_PROVIDER_URL is not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'The video download provider is not configured. Set the VIDEO_PROVIDER_URL environment variable to enable downloads.',
      },
    });
  }

  if (!providerApiKey) {
    console.log('[download] DIAGNOSTIC: VIDEO_PROVIDER_API_KEY is not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'The video download provider API key is not configured. Set the VIDEO_PROVIDER_API_KEY environment variable.',
      },
    });
  }

  console.log('[download] DIAGNOSTIC: Request received', { videoId, formatId, quality, format });

  try {
    // Step 1: Request the download URL from the provider
    console.log('[download] DIAGNOSTIC: Calling provider at', providerUrl);

    const providerResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerApiKey}`,
        'X-API-Key': providerApiKey,
      },
      body: JSON.stringify({
        videoId,
        formatId,
        quality: quality || undefined,
        format: format || undefined,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    console.log('[download] DIAGNOSTIC: Provider responded with status', providerResponse.status);

    if (!providerResponse.ok) {
      const errorText = await providerResponse.text().catch(() => 'Unknown error');
      console.log('[download] DIAGNOSTIC: Provider error response:', errorText.substring(0, 200));

      // Map provider HTTP errors to our error codes
      if (providerResponse.status === 404) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIDEO_NOT_FOUND', message: 'The video was not found by the provider.' },
        });
      }
      if (providerResponse.status === 401 || providerResponse.status === 403) {
        return res.status(502).json({
          success: false,
          error: { code: 'PROVIDER_AUTH_FAILED', message: 'The video provider rejected the request. Check your API key configuration.' },
        });
      }
      if (providerResponse.status === 429) {
        return res.status(502).json({
          success: false,
          error: { code: 'PROVIDER_RATE_LIMITED', message: 'The video provider rate limit was exceeded. Please try again later.' },
        });
      }

      return res.status(502).json({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: `The video provider returned an error (HTTP ${providerResponse.status}).` },
      });
    }

    // Step 2: Parse the provider response
    const contentType = providerResponse.headers.get('content-type') || '';
    console.log('[download] DIAGNOSTIC: Provider Content-Type:', contentType);

    // Check if provider returned JSON (metadata with download URL) or direct media stream
    if (contentType.includes('application/json')) {
      const providerData = await providerResponse.json() as Record<string, unknown>;
      console.log('[download] DIAGNOSTIC: Provider returned JSON response');

      // Provider returned a download URL - we need to fetch the actual media
      const mediaUrl = (providerData.url || providerData.downloadUrl || providerData.mediaUrl || providerData.link) as string | undefined;

      if (!mediaUrl || typeof mediaUrl !== 'string') {
        console.log('[download] DIAGNOSTIC: Provider JSON response did not contain a valid media URL');
        return res.status(502).json({
          success: false,
          error: {
            code: 'NO_MEDIA_URL',
            message: 'The video provider did not return a valid downloadable media resource.',
          },
        });
      }

      // Validate the media URL
      try {
        new URL(mediaUrl);
      } catch {
        console.log('[download] DIAGNOSTIC: Provider returned invalid media URL');
        return res.status(502).json({
          success: false,
          error: { code: 'INVALID_MEDIA_URL', message: 'The video provider returned an invalid media URL.' },
        });
      }

      console.log('[download] DIAGNOSTIC: Fetching media from URL');

      // Step 3: Fetch the actual media from the URL
      const mediaResponse = await fetch(mediaUrl, {
        signal: AbortSignal.timeout(60000), // 60 second timeout for large files
      });

      console.log('[download] DIAGNOSTIC: Media fetch status:', mediaResponse.status);
      console.log('[download] DIAGNOSTIC: Media Content-Type:', mediaResponse.headers.get('content-type'));
      console.log('[download] DIAGNOSTIC: Media Content-Length:', mediaResponse.headers.get('content-length'));

      if (!mediaResponse.ok) {
        return res.status(502).json({
          success: false,
          error: { code: 'MEDIA_FETCH_FAILED', message: 'Failed to fetch the media resource from the provider.' },
        });
      }

      // Verify the media response is actually media (not an error page)
      const mediaContentType = mediaResponse.headers.get('content-type') || '';
      const mediaContentLength = mediaResponse.headers.get('content-length');

      if (!isMediaContentType(mediaContentType)) {
        console.log('[download] DIAGNOSTIC: Media URL returned non-media content type:', mediaContentType);
        return res.status(502).json({
          success: false,
          error: {
            code: 'INVALID_MEDIA_RESPONSE',
            message: 'The provider returned a non-media response. The download resource may have expired.',
          },
        });
      }

      // Verify content length is reasonable (not empty, not suspiciously small)
      if (mediaContentLength) {
        const size = parseInt(mediaContentLength, 10);
        if (size < 1024) {
          console.log('[download] DIAGNOSTIC: Media content length is suspiciously small:', size, 'bytes');
          return res.status(502).json({
            success: false,
            error: {
              code: 'MEDIA_TOO_SMALL',
              message: 'The media resource is too small to be a valid video file. The download link may have expired.',
            },
          });
        }
      }

      // Step 4: Stream the media to the client
      const fileName = generateFileName(videoId, format || 'mp4');

      res.setHeader('Content-Type', mediaContentType || 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      if (mediaContentLength) {
        res.setHeader('Content-Length', mediaContentLength);
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      if (mediaResponse.body) {
        // Stream the response body directly
        const reader = mediaResponse.body.getReader();
        const writeChunk = (chunk: Uint8Array): Promise<void> => {
          return new Promise((resolve, reject) => {
            const canContinue = res.write(chunk);
            if (canContinue) {
              resolve();
            } else {
              res.once('drain', () => resolve());
            }
          });
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writeChunk(value);
          }
          res.end();
        } catch (streamError) {
          console.log('[download] DIAGNOSTIC: Stream error:', (streamError as Error).message);
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: { code: 'STREAM_ERROR', message: 'An error occurred while streaming the media file.' },
            });
          }
          res.end();
        }
      } else {
        // Fallback: buffer the entire response
        const buffer = await mediaResponse.arrayBuffer();
        if (buffer.byteLength < 1024) {
          return res.status(502).json({
            success: false,
            error: {
              code: 'MEDIA_TOO_SMALL',
              message: 'The media resource is too small to be a valid video file.',
            },
          });
        }
        res.setHeader('Content-Length', buffer.byteLength.toString());
        res.end(Buffer.from(buffer));
      }

      console.log('[download] DIAGNOSTIC: Media stream completed successfully');
      return;
    }

    // Provider returned direct media stream (not JSON)
    if (isMediaContentType(contentType)) {
      const contentLength = providerResponse.headers.get('content-length');
      const fileName = generateFileName(videoId, format || 'mp4');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      if (providerResponse.body) {
        const reader = providerResponse.body.getReader();
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
          console.log('[download] DIAGNOSTIC: Direct stream error:', (streamError as Error).message);
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: { code: 'STREAM_ERROR', message: 'An error occurred while streaming the media file.' },
            });
          }
          res.end();
        }
      } else {
        const buffer = await providerResponse.arrayBuffer();
        res.end(Buffer.from(buffer));
      }

      console.log('[download] DIAGNOSTIC: Direct media stream completed');
      return;
    }

    // Provider returned something unexpected
    console.log('[download] DIAGNOSTIC: Unexpected provider content type:', contentType);
    return res.status(502).json({
      success: false,
      error: {
        code: 'UNEXPECTED_PROVIDER_RESPONSE',
        message: 'The video provider returned an unexpected response format.',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[download] DIAGNOSTIC: Unhandled error:', errorMessage);

    // Check if headers were already sent
    if (res.headersSent) {
      res.end();
      return;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return res.status(504).json({
        success: false,
        error: { code: 'PROVIDER_TIMEOUT', message: 'The video provider did not respond in time. Please try again.' },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred while processing the download.' },
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
    'application/x-mpegURL',
    'audio/mp4',
    'audio/mpeg',
    'audio/x-m4a',
  ];
  return mediaTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Generate a safe filename for the download
 */
function generateFileName(videoId: string, format: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `tubefetch_${safeId}.${safeFormat || 'mp4'}`;
}
