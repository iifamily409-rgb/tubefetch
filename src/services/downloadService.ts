import type { DownloadResponse, APIError } from '../types/video';

/**
 * Download service - handles communication with the /api/download serverless function.
 * 
 * The download pipeline with RapidAPI:
 * 1. Frontend sends { videoId, formatId, url } to /api/download
 * 2. /api/backend creates download request with RapidAPI
 * 3. Backend polls status until conversion is complete
 * 4. Backend returns downloadUrl to frontend
 * 5. Frontend triggers browser download using the downloadUrl
 * 
 * If RapidAPI is not configured, the API returns a clear error.
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
  downloadUrl?: string;
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
 * Returns a download URL that the frontend can use to trigger the download.
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

    // Check HTTP status
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

    // Parse JSON response
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_RESPONSE',
          message: 'Server returned non-JSON response.',
        },
      };
    }

    const data = await response.json() as any;

    // Check for error response
    if (!data.success) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error occurred.' },
      };
    }

    // Success - we have a download URL
    if (!data.downloadUrl) {
      return {
        success: false,
        error: {
          code: 'NO_DOWNLOAD_URL',
          message: 'Server did not return a download URL.',
        },
      };
    }

    return {
      success: true,
      downloadUrl: data.downloadUrl,
      fileName: data.fileName || `video_${videoId}.${format || 'mp4'}`,
      fileSize: data.fileSizeBytes || 0,
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
 * Trigger a browser file download from a URL by fetching as Blob first.
 * This ensures the filename is respected even for cross-origin URLs.
 */
export async function triggerBrowserDownloadFromUrl(downloadUrl: string, fileName: string): Promise<void> {
  try {
    // Fetch the video as a Blob
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Create download link with blob URL
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('Blob download failed, falling back to direct link:', error);
    
    // Fallback: open in new tab (user can right-click > Save As)
    window.open(downloadUrl, '_blank');
  }
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
          reason: 'Download provider is not configured. Set VIDEO_PROVIDER_TYPE and VIDEO_PROVIDER_URL environment variables.',
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
