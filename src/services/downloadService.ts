import type { DownloadResponse, APIError } from '../types/video';

/**
 * Download service - handles communication with the /api/download serverless function.
 * 
 * The download pipeline:
 * 1. Frontend sends { videoId, formatId, url } to /api/download
 * 2. /api/download calls cobalt API with the URL and quality settings
 * 3. Cobalt returns a tunnel URL or redirect URL to the actual media
 * 4. /api/download fetches the media and streams it to the browser
 * 5. Frontend receives the actual media bytes as a Blob
 * 
 * If cobalt is not configured, the API returns a clear error.
 */

export interface DownloadRequest {
  videoId: string;
  formatId: string;
  quality?: string;
  format?: string;
  /** Original YouTube URL - required by cobalt */
  url: string;
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

  const utf8Match = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')(.+?)(?:;|$)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // Fall through
    }
  }

  const match = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (match) {
    return match[1].trim();
  }

  return null;
}

/**
 * Request a video download from the serverless API.
 */
export async function requestDownload(request: DownloadRequest): Promise<DownloadResult> {
  const { videoId, formatId, quality, format, url } = request;

  if (!videoId || !formatId) {
    return {
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing videoId or formatId.' },
    };
  }

  if (!url) {
    return {
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing YouTube URL.' },
    };
  }

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, formatId, quality, format, url }),
    });

    // Step 1: Check HTTP status
    if (!response.ok) {
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

      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: `The server returned an error (HTTP ${response.status}).`,
        },
      };
    }

    // Step 2: Check if response is a redirect (cobalt redirect mode)
    if (response.redirected) {
      // The API redirected to the media URL directly
      // We need to fetch the media from the redirect target
      const mediaResponse = await fetch(response.url);
      
      if (!mediaResponse.ok) {
        return {
          success: false,
          error: {
            code: 'REDIRECT_FAILED',
            message: 'Failed to fetch media from redirect URL.',
          },
        };
      }

      const blob = await mediaResponse.blob();
      
      if (blob.size < MIN_VALID_MEDIA_SIZE) {
        return {
          success: false,
          error: {
            code: 'MEDIA_TOO_SMALL',
            message: `Downloaded file is only ${blob.size} bytes. The link may have expired.`,
          },
        };
      }

      const mediaContentType = mediaResponse.headers.get('content-type') || '';
      const contentDisposition = mediaResponse.headers.get('content-disposition');
      const fileName = parseContentDisposition(contentDisposition) || `video_${videoId}.${format || 'mp4'}`;

      return {
        success: true,
        blob,
        fileName,
        fileSize: blob.size,
        contentType: mediaContentType,
      };
    }

    // Step 3: Check Content-Type
    const contentType = response.headers.get('content-type') || '';

    // If the response is JSON, it's an error
    if (contentType.includes('application/json')) {
      const data = await response.json() as Record<string, unknown>;

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

      return {
        success: false,
        error: {
          code: 'UNEXPECTED_RESPONSE',
          message: 'The server returned an unexpected JSON response instead of media data.',
        },
      };
    }

    // Step 4: Verify it's actually media content
    if (!isMediaContentType(contentType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `Server returned "${contentType}" which is not a valid media format.`,
        },
      };
    }

    // Step 5: Get the response as a Blob
    const blob = await response.blob();

    // Step 6: Verify the blob has actual content
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
          message: `Downloaded file is only ${blob.size} bytes, too small to be valid media.`,
        },
      };
    }

    // Step 7: Extract filename
    const contentDisposition = response.headers.get('content-disposition');
    const fileName = parseContentDisposition(contentDisposition) || `video_${videoId}.${format || 'mp4'}`;

    // Step 8: Get content length
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
          message: 'The download request timed out.',
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
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Check if the download API is available.
 */
export async function checkDownloadAvailability(): Promise<{ available: boolean; reason?: string }> {
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: '__check__', formatId: '__check__', url: 'https://youtube.com/watch?v=__check__' }),
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json() as any;
      // If we get PROVIDER_NOT_CONFIGURED, the API is deployed but cobalt isn't set up
      if (data.error?.code === 'PROVIDER_NOT_CONFIGURED') {
        return {
          available: false,
          reason: 'Download provider (cobalt) is not configured. Set COBALT_API_URL environment variable.',
        };
      }
      return { available: true };
    }

    return {
      available: false,
      reason: 'The download API endpoint is not responding correctly.',
    };
  } catch {
    return {
      available: false,
      reason: 'The download API endpoint is not reachable.',
    };
  }
}
