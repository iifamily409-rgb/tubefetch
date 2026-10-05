import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/download
 * 
 * Downloads media using a Cobalt API instance.
 * 
 * Cobalt API Documentation:
 * https://github.com/imputnet/cobalt/blob/main/docs/api.md
 * 
 * Environment Variables:
 * - VIDEO_PROVIDER_URL: (required) URL of your Cobalt instance
 * - VIDEO_PROVIDER_API_KEY: (optional) API key if the instance requires auth
 * 
 * Request Body:
 * {
 *   videoId: string,
 *   formatId: string,  // "1080p" | "720p" | "480p" | "360p" | "audio-mp3"
 *   url: string        // original YouTube URL
 * }
 * 
 * Cobalt Response Types:
 * - "tunnel": Cobalt proxies the file → we fetch from tunnel URL and stream to client
 * - "redirect": Direct URL to media → we redirect the client
 * - "error": Processing failed → we return structured error
 * - "picker": Multiple items → not applicable for single YouTube videos
 * - "local-processing": Requires local ffmpeg → not supported in serverless
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

  // Check provider configuration
  const providerUrl = process.env.VIDEO_PROVIDER_URL;
  const providerApiKey = process.env.VIDEO_PROVIDER_API_KEY;

  if (!providerUrl) {
    console.log('[download] DIAGNOSTIC: VIDEO_PROVIDER_URL is not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Download provider is not configured. Set VIDEO_PROVIDER_URL to your Cobalt instance URL. See README.md for setup instructions.',
      },
    });
  }

  console.log('[download] DIAGNOSTIC: Request received', { videoId, formatId });
  console.log('[download] DIAGNOSTIC: Provider URL:', providerUrl);

  try {
    // Build Cobalt API request according to official schema
    // https://github.com/imputnet/cobalt/blob/main/docs/api.md#api-schema
    const cobaltRequest = buildCobaltRequest(url, formatId);

    console.log('[download] DIAGNOSTIC: Calling Cobalt with params:', JSON.stringify(cobaltRequest));

    // Call Cobalt API
    // Required headers per official docs:
    // Accept: application/json
    // Content-Type: application/json
    const cobaltHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add API key authentication if configured
    // Per official docs: Authorization: Api-Key <key>
    if (providerApiKey) {
      cobaltHeaders['Authorization'] = `Api-Key ${providerApiKey}`;
    }

    const cobaltResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: cobaltHeaders,
      body: JSON.stringify(cobaltRequest),
      signal: AbortSignal.timeout(30000),
    });

    console.log('[download] DIAGNOSTIC: Cobalt responded with HTTP', cobaltResponse.status);

    // Handle HTTP errors from Cobalt
    if (!cobaltResponse.ok) {
      const errorText = await cobaltResponse.text().catch(() => 'Unknown error');
      console.log('[download] DIAGNOSTIC: Cobalt HTTP error:', errorText.substring(0, 300));

      // Map Cobalt HTTP errors to our error codes
      if (cobaltResponse.status === 401) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'PROVIDER_AUTH_REQUIRED',
            message: 'Cobalt instance requires authentication. Set VIDEO_PROVIDER_API_KEY or disable auth on your instance.',
          },
        });
      }

      if (cobaltResponse.status === 403) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'PROVIDER_AUTH_FAILED',
            message: 'Cobalt instance rejected the API key. Check your VIDEO_PROVIDER_API_KEY configuration.',
          },
        });
      }

      if (cobaltResponse.status === 429) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'PROVIDER_RATE_LIMITED',
            message: 'Cobalt instance rate limit exceeded. Please try again later.',
          },
        });
      }

      return res.status(502).json({
        success: false,
        error: {
          code: 'PROVIDER_HTTP_ERROR',
          message: `Cobalt API returned HTTP ${cobaltResponse.status}.`,
        },
      });
    }

    // Parse Cobalt JSON response
    // Per official docs, response always contains a "status" key
    const cobaltData = await cobaltResponse.json() as any;

    console.log('[download] DIAGNOSTIC: Cobalt response status:', cobaltData.status);

    // Handle Cobalt error response
    // Per official docs: { status: "error", error: { code: string, context?: object } }
    if (cobaltData.status === 'error') {
      const errorCode = cobaltData.error?.code || 'COBALT_ERROR';
      const errorContext = cobaltData.error?.context;

      console.log('[download] DIAGNOSTIC: Cobalt error:', errorCode, errorContext);

      // Map common Cobalt error codes to user-friendly messages
      let userMessage = `Cobalt processing error: ${errorCode}`;

      if (errorCode.includes('api.auth')) {
        userMessage = 'Cobalt instance requires authentication. Contact the instance owner or set VIDEO_PROVIDER_API_KEY.';
      } else if (errorCode === 'content.video.unavailable') {
        userMessage = 'The video is unavailable or has been removed.';
      } else if (errorCode === 'content.video.live') {
        userMessage = 'Live streams cannot be downloaded.';
      } else if (errorCode === 'content.video.duration') {
        userMessage = 'The video is too long to process.';
      } else if (errorCode === 'fetch.fail') {
        userMessage = 'Failed to fetch the video from YouTube. The video may be private or region-locked.';
      } else if (errorCode.includes('rate')) {
        userMessage = 'Rate limit exceeded. Please try again later.';
      }

      return res.status(502).json({
        success: false,
        error: {
          code: errorCode,
          message: userMessage,
        },
      });
    }

    // Handle tunnel response
    // Per official docs: { status: "tunnel", url: string, filename: string }
    // The URL points to GET /tunnel endpoint which streams the actual media
    if (cobaltData.status === 'tunnel') {
      const tunnelUrl = cobaltData.url;
      const fileName = cobaltData.filename || generateFileName(videoId, formatId);

      if (!tunnelUrl || typeof tunnelUrl !== 'string') {
        console.log('[download] DIAGNOSTIC: Cobalt tunnel response missing URL');
        return res.status(502).json({
          success: false,
          error: {
            code: 'INVALID_TUNNEL_RESPONSE',
            message: 'Cobalt returned a tunnel response without a valid URL.',
          },
        });
      }

      console.log('[download] DIAGNOSTIC: Fetching media from Cobalt tunnel');

      // Fetch the actual media from Cobalt's tunnel endpoint
      // Per official docs, GET /tunnel returns a file stream
      const tunnelHeaders: Record<string, string> = {};
      if (providerApiKey) {
        tunnelHeaders['Authorization'] = `Api-Key ${providerApiKey}`;
      }

      const mediaResponse = await fetch(tunnelUrl, {
        headers: tunnelHeaders,
        signal: AbortSignal.timeout(120000), // 2 minute timeout for large files
      });

      console.log('[download] DIAGNOSTIC: Tunnel fetch status:', mediaResponse.status);
      console.log('[download] DIAGNOSTIC: Tunnel Content-Type:', mediaResponse.headers.get('content-type'));
      console.log('[download] DIAGNOSTIC: Tunnel Content-Length:', mediaResponse.headers.get('content-length'));

      if (!mediaResponse.ok) {
        // Tunnel endpoint returns errors via HTTP status codes per official docs
        if (mediaResponse.status === 401) {
          return res.status(502).json({
            success: false,
            error: { code: 'TUNNEL_UNAUTHORIZED', message: 'Cobalt tunnel requires authentication.' },
          });
        }
        if (mediaResponse.status === 404) {
          return res.status(502).json({
            success: false,
            error: { code: 'TUNNEL_NOT_FOUND', message: 'The media tunnel has expired. Please try again.' },
          });
        }
        if (mediaResponse.status === 429) {
          return res.status(502).json({
            success: false,
            error: { code: 'TUNNEL_RATE_LIMITED', message: 'Cobalt tunnel rate limit exceeded.' },
          });
        }

        return res.status(502).json({
          success: false,
          error: {
            code: 'TUNNEL_FETCH_FAILED',
            message: `Failed to fetch media from Cobalt tunnel (HTTP ${mediaResponse.status}).`,
          },
        });
      }

      const mediaContentType = mediaResponse.headers.get('content-type') || 'video/mp4';
      const mediaContentLength = mediaResponse.headers.get('content-length');

      // Verify the response is actual media (not an error page)
      if (!isMediaContentType(mediaContentType)) {
        console.log('[download] DIAGNOSTIC: Tunnel returned non-media type:', mediaContentType);
        return res.status(502).json({
          success: false,
          error: {
            code: 'INVALID_MEDIA_TYPE',
            message: `Cobalt tunnel returned "${mediaContentType}" instead of media.`,
          },
        });
      }

      // Verify content length is reasonable
      if (mediaContentLength) {
        const size = parseInt(mediaContentLength, 10);
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
      res.setHeader('Content-Type', mediaContentType);
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(fileName)}"`);
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
        // Fallback: buffer the entire response
        const buffer = await mediaResponse.arrayBuffer();
        if (buffer.byteLength < 1024) {
          return res.status(502).json({
            success: false,
            error: { code: 'MEDIA_TOO_SMALL', message: 'Media is too small to be valid.' },
          });
        }
        res.setHeader('Content-Length', buffer.byteLength.toString());
        res.end(Buffer.from(buffer));
        console.log('[download] DIAGNOSTIC: Media buffer completed');
      }

      return;
    }

    // Handle redirect response
    // Per official docs: { status: "redirect", url: string, filename: string }
    // The URL is a direct link to the media on the original service
    if (cobaltData.status === 'redirect') {
      const mediaUrl = cobaltData.url;
      const fileName = cobaltData.filename || generateFileName(videoId, formatId);

      if (!mediaUrl || typeof mediaUrl !== 'string') {
        return res.status(502).json({
          success: false,
          error: {
            code: 'INVALID_REDIRECT_RESPONSE',
            message: 'Cobalt returned a redirect response without a valid URL.',
          },
        });
      }

      console.log('[download] DIAGNOSTIC: Redirecting client to media URL');

      // Option 1: Redirect the client directly (simpler, less bandwidth on our server)
      // Option 2: Proxy through our server (more control, but uses our bandwidth)
      // We'll redirect directly since the URL is from a trusted source (Cobalt)
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(fileName)}"`);
      res.redirect(302, mediaUrl);
      return;
    }

    // Handle picker response (multiple items)
    // Not applicable for single YouTube videos, but handle gracefully
    if (cobaltData.status === 'picker') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MULTIPLE_ITEMS',
          message: 'This URL contains multiple media items. Please select a specific video.',
        },
      });
    }

    // Handle local-processing response
    // This requires local ffmpeg which we cannot do in serverless
    if (cobaltData.status === 'local-processing') {
      return res.status(501).json({
        success: false,
        error: {
          code: 'LOCAL_PROCESSING_REQUIRED',
          message: 'This format requires local processing which is not supported in serverless. Try a different quality or format.',
        },
      });
    }

    // Unexpected response status
    console.log('[download] DIAGNOSTIC: Unexpected Cobalt status:', cobaltData.status);
    return res.status(502).json({
      success: false,
      error: {
        code: 'UNEXPECTED_RESPONSE',
        message: `Unexpected Cobalt response: ${cobaltData.status}`,
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
        error: { code: 'PROVIDER_TIMEOUT', message: 'Cobalt API did not respond in time. Please try again.' },
      });
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'PROVIDER_UNREACHABLE',
          message: 'Cannot reach the Cobalt instance. Check your VIDEO_PROVIDER_URL configuration.',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred while processing the download.' },
    });
  }
}

/**
 * Build Cobalt API request according to official schema
 * https://github.com/imputnet/cobalt/blob/main/docs/api.md#api-schema
 */
function buildCobaltRequest(url: string, formatId: string): Record<string, any> {
  // Base request with required fields
  const baseRequest = {
    url,
    // Use "pretty" filename style for user-friendly names
    filenameStyle: 'pretty',
    // Use h264 codec for maximum compatibility
    youtubeVideoCodec: 'h264',
  };

  switch (formatId) {
    case '1080p':
      return {
        ...baseRequest,
        videoQuality: '1080',
        downloadMode: 'auto',
      };
    case '720p':
      return {
        ...baseRequest,
        videoQuality: '720',
        downloadMode: 'auto',
      };
    case '480p':
      return {
        ...baseRequest,
        videoQuality: '480',
        downloadMode: 'auto',
      };
    case '360p':
      return {
        ...baseRequest,
        videoQuality: '360',
        downloadMode: 'auto',
      };
    case 'audio-mp3':
      return {
        ...baseRequest,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '128',
      };
    case 'audio-m4a':
      return {
        ...baseRequest,
        downloadMode: 'audio',
        audioFormat: 'best',
        audioBitrate: '192',
      };
    default:
      // Default to 720p video
      return {
        ...baseRequest,
        videoQuality: '720',
        downloadMode: 'auto',
      };
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
