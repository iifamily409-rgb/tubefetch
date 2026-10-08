import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSafeUrl } from './lib/security';

/**
 * GET /api/proxy-download
 * 
 * Proxies media downloads to bypass CORS restrictions and ensure proper filenames.
 * This endpoint fetches the media from the external CDN and streams it to the client
 * with the correct Content-Disposition header.
 * 
 * Query Parameters:
 * - url: The external media URL (required, must be URL-encoded)
 * - filename: The desired filename (required, must be URL-encoded)
 * 
 * Example:
 * GET /api/proxy-download?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4&filename=My%20Video.mp4
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are accepted.' },
    });
  }

  const { url, filename } = req.query;

  // Validate required parameters
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_URL', message: 'Missing or invalid "url" parameter.' },
    });
  }

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FILENAME', message: 'Missing or invalid "filename" parameter.' },
    });
  }

  // Decode URL and filename
  let decodedUrl: string;
  let decodedFilename: string;

  try {
    decodedUrl = decodeURIComponent(url);
    decodedFilename = decodeURIComponent(filename);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ENCODING', message: 'Invalid URL or filename encoding.' },
    });
  }

  // Validate URL format
  try {
    new URL(decodedUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Invalid URL format.' },
    });
  }

  // SSRF Protection: Validate URL is safe (not internal/private network)
  if (!isSafeUrl(decodedUrl)) {
    console.log('[proxy-download] DIAGNOSTIC: SSRF blocked - unsafe URL:', decodedUrl);
    return res.status(400).json({
      success: false,
      error: { code: 'UNSAFE_URL', message: 'The provided URL is not allowed for security reasons.' },
    });
  }

  // Sanitize filename to prevent header injection
  const cleanFilename = decodedFilename
    .replace(/[^\w\s\-\.]/g, '_') // Remove special characters except spaces, hyphens, dots
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 255); // Limit length
  
  // Create ASCII-safe fallback filename for Content-Disposition header
  // This prevents ERR_INVALID_CHAR errors with non-ASCII characters (Hindi, Chinese, etc.)
  const asciiFilename = cleanFilename
    .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 255);
  
  // RFC 5987 encoding for UTF-8 filename (supports Hindi, Chinese, etc.)
  const utf8Filename = encodeURIComponent(cleanFilename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  
  console.log('[proxy-download] DIAGNOSTIC: Proxying download', {
    url: decodedUrl,
    filename: cleanFilename,
    asciiFilename,
  });
  try {
    // Fetch the media from the external URL
    const mediaResponse = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!mediaResponse.ok) {
      console.log('[proxy-download] DIAGNOSTIC: Media fetch failed:', mediaResponse.status);
      return res.status(mediaResponse.status).json({
        success: false,
        error: {
          code: 'MEDIA_FETCH_FAILED',
          message: `Failed to fetch media from external URL (HTTP ${mediaResponse.status}).`,
        },
      });
    }

    // Get content type from the response
    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = mediaResponse.headers.get('content-length');

    console.log('[proxy-download] DIAGNOSTIC: Media fetched successfully', {
      contentType,
      contentLength,
    });

    // Verify it's actual media content
    if (!isMediaContentType(contentType)) {
      console.log('[proxy-download] DIAGNOSTIC: Non-media content type:', contentType);
      return res.status(502).json({
        success: false,
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: `External URL returned "${contentType}" instead of media.`,
        },
      });
    }

    // Verify content length is reasonable
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size < 1024) {
        console.log('[proxy-download] DIAGNOSTIC: Media too small:', size, 'bytes');
        return res.status(502).json({
          success: false,
          error: {
            code: 'MEDIA_TOO_SMALL',
            message: `Media is only ${size} bytes. The download link may have expired.`,
          },
        });
      }
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    // Use RFC 5987 encoding for UTF-8 filename support (Hindi, Chinese, etc.)
    // Fallback to ASCII-safe filename for older browsers
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Stream the media to the client
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
        console.log('[proxy-download] DIAGNOSTIC: Media stream completed successfully');
      } catch (streamError) {
        console.log('[proxy-download] DIAGNOSTIC: Stream error:', (streamError as Error).message);
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
      console.log('[proxy-download] DIAGNOSTIC: Media buffer completed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[proxy-download] DIAGNOSTIC: Unhandled error:', errorMessage);

    if (res.headersSent) {
      res.end();
      return;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return res.status(504).json({
        success: false,
        error: { code: 'PROXY_TIMEOUT', message: 'Media fetch timed out. Please try again.' },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'An internal error occurred while proxying the download.' },
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
