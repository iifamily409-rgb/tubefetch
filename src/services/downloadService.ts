import type { DownloadResponse, APIError } from '../types/video';

/**
 * Download service - handles communication with the /api/download serverless function.
 * 
 * This service:
 * 1. Sends the download request to the serverless API
 * 2. Validates the HTTP response status
 * 3. Checks Content-Type to ensure it's actual media
 * 4. Detects JSON error responses
 * 5. Rejects suspiciously small responses
 * 6. Returns a proper Blob with the real media data
 */

export interface DownloadRequest {
  videoId: string;
  formatId: string;
  quality?: string;
  format?: string;
}

export interface DownloadResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  error?: APIError;
}

/**
 * Minimum acceptable file size in bytes (10 KB).
 * Anything smaller is almost certainly an error response, not a real video.
 */
const MIN_VALID_MEDIA_SIZE = 10 * 1024;

/**
 * Content types that indicate actual media data
 */
const MEDIA_CONTENT_TYPES = [
  'video/',
  'audio/',
  'application/octet-stream',
  'application/mp4',
  'audio/mp4',
  'audio/mpeg',
  'audio/x-m4a',
];

function isMediaContentType(contentType: string): boolean {
  if (!contentType) return false;
  return MEDIA_CONTENT_TYPES.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Parse Content-Disposition header to extract filename
 */
function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;

  // Try filename*=UTF-8''... first (RFC 5987)
  const utf8Match = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')(.+?)(?:;|$)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // Fall through
    }
  }

  // Try filename="..." or filename=...
  const match = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (match) {
    return match[1].trim();
  }

  return null;
}

/**
 * Request a video download from the serverless API.
 * 
 * Returns a DownloadResult with either:
 * - A valid Blob containing actual media data
 * - An error describing why the download failed
 */
export async function requestDownload(request: DownloadRequest): Promise<DownloadResult> {
  const { videoId, formatId, quality, format } = request;

  // Validate inputs
  if (!videoId || !formatId) {
    return {
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing videoId or formatId.' },
    };
  }

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, formatId, quality, format }),
    });

    // Step 1: Check HTTP status
    if (!response.ok) {
      // Try to parse JSON error response
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const errorData = await response.json() as { success: boolean; error?: APIError };
        if (errorData.error) {
          return {
            success: false,
            error: errorData.error,
          };
        }
      }

      // Non-JSON error or missing error structure
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: `The server returned an error (HTTP ${response.status}).`,
        },
      };
    }

    // Step 2: Check Content-Type
    const contentType = response.headers.get('content-type') || '';

    // If the response is JSON, it's an error (successful downloads return media)
    if (contentType.includes('application/json')) {
      const data = await response.json() as Record<string, unknown>;

      // Check if it's a structured error
      if (data.error && typeof data.error === 'object') {
        const apiError = data.error as APIError;
        return {
          success: false,
          error: {
            code: apiError.code || 'UNKNOWN_ERROR',
            message: apiError.message || 'The server returned an error response.',
          },
        };
      }

      // Unexpected JSON response
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_RESPONSE',
          message: 'The server returned an unexpected JSON response instead of media data.',
        },
      };
    }

    // Step 3: Verify it's actually media content
    if (!isMediaContentType(contentType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `The server returned content type "${contentType}" which is not a valid media format.`,
        },
      };
    }

    // Step 4: Get the response as a Blob
    const blob = await response.blob();

    // Step 5: Verify the blob has actual content
    if (blob.size === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_RESPONSE',
          message: 'The server returned an empty response. The download link may have expired.',
        },
      };
    }

    if (blob.size < MIN_VALID_MEDIA_SIZE) {
      return {
        success: false,
        error: {
          code: 'MEDIA_TOO_SMALL',
          message: `The downloaded file is only ${blob.size} bytes, which is too small to be a valid media file. The download link may have expired.`,
        },
      };
    }

    // Step 6: Extract filename from Content-Disposition
    const contentDisposition = response.headers.get('content-disposition');
    const fileName = parseContentDisposition(contentDisposition) || `video_${videoId}.${format || 'mp4'}`;

    // Step 7: Get content length
    const contentLength = response.headers.get('content-length');
    const fileSize = contentLength ? parseInt(contentLength, 10) : blob.size;

    return {
      success: true,
      blob,
      fileName,
      fileSize,
      contentType,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'A network error occurred. Please check your connection and try again.',
        },
      };
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'The download request timed out. The file may be too large or the server is busy.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: `Download failed: ${message}`,
      },
    };
  }
}

/**
 * Trigger a browser file download from a Blob.
 * Creates an object URL, triggers the download, and revokes the URL.
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Check if the download API is available (serverless function is deployed).
 * This is a lightweight check that doesn't consume resources.
 */
export async function checkDownloadAvailability(): Promise<{ available: boolean; reason?: string }> {
  try {
    // We can't easily check without making a real request, so we just
    // verify the endpoint exists by making a request with invalid data
    // and checking we get a structured error (not a 404 or HTML page)
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: '__check__', formatId: '__check__' }),
    });

    const contentType = response.headers.get('content-type') || '';

    // If we get a JSON response (even an error), the API is deployed
    if (contentType.includes('application/json')) {
      return { available: true };
    }

    // If we get HTML or something else, the API might not be deployed
    return {
      available: false,
      reason: 'The download API endpoint is not responding correctly. It may not be deployed.',
    };
  } catch {
    return {
      available: false,
      reason: 'The download API endpoint is not reachable.',
    };
  }
}
