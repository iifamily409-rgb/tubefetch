import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestDownload, triggerBrowserDownload, checkDownloadAvailability } from '../src/services/downloadService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('requestDownload', () => {
  describe('input validation', () => {
    it('should reject missing videoId', async () => {
      const result = await requestDownload({ videoId: '', formatId: 'v-720' });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });

    it('should reject missing formatId', async () => {
      const result = await requestDownload({ videoId: 'abc123', formatId: '' });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });
  });

  describe('successful valid download response', () => {
    it('should return a blob for valid media response', async () => {
      const mediaData = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, ...Array(15000).fill(0x00)]);
      const blob = new Blob([mediaData], { type: 'video/mp4' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'video/mp4',
          'content-disposition': 'attachment; filename="test_video.mp4"',
          'content-length': mediaData.byteLength.toString(),
        }),
        blob: () => Promise.resolve(blob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720', format: 'mp4' });

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.blob?.size).toBeGreaterThan(10 * 1024);
      expect(result.fileName).toBe('test_video.mp4');
      expect(result.contentType).toBe('video/mp4');
    });

    it('should use Content-Disposition filename', async () => {
      const mediaData = new Uint8Array(Array(20000).fill(0x00));
      const blob = new Blob([mediaData], { type: 'video/mp4' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'video/mp4',
          'content-disposition': 'attachment; filename="My Video (720p).mp4"',
        }),
        blob: () => Promise.resolve(blob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('My Video (720p).mp4');
    });
  });

  describe('empty upstream response', () => {
    it('should reject empty blob response', async () => {
      const emptyBlob = new Blob([], { type: 'video/mp4' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'video/mp4',
          'content-length': '0',
        }),
        blob: () => Promise.resolve(emptyBlob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMPTY_RESPONSE');
    });
  });

  describe('provider JSON error response', () => {
    it('should handle structured JSON error from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'The video download provider is not configured.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_NOT_CONFIGURED');
      expect(result.error?.message).toContain('not configured');
    });

    it('should handle JSON error with HTTP error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'Set VIDEO_PROVIDER_URL.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_NOT_CONFIGURED');
    });
  });

  describe('HTTP 4xx/5xx provider response', () => {
    it('should handle HTTP 400 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Bad request.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST');
    });

    it('should handle HTTP 500 error without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_ERROR');
      expect(result.error?.message).toContain('500');
    });

    it('should handle HTTP 502 Bad Gateway', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'PROVIDER_ERROR', message: 'Upstream provider failed.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_ERROR');
    });
  });

  describe('invalid format', () => {
    it('should handle format not found error from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'The requested format is not available for this video.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'invalid-format' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_FORMAT');
    });
  });

  describe('missing provider configuration', () => {
    it('should handle PROVIDER_NOT_CONFIGURED error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          success: false,
          error: {
            code: 'PROVIDER_NOT_CONFIGURED',
            message: 'The video download provider is not configured. Set the VIDEO_PROVIDER_URL environment variable.',
          },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_NOT_CONFIGURED');
      expect(result.error?.message).toContain('VIDEO_PROVIDER_URL');
    });
  });

  describe('invalid download resource', () => {
    it('should reject non-media content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        blob: () => Promise.resolve(new Blob(['<html>Error</html>'], { type: 'text/html' })),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject suspiciously small media', async () => {
      const tinyBlob = new Blob([new Uint8Array(500)], { type: 'video/mp4' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'video/mp4',
          'content-length': '500',
        }),
        blob: () => Promise.resolve(tinyBlob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MEDIA_TOO_SMALL');
    });
  });

  describe('correct Content-Type handling', () => {
    it('should accept video/mp4 content type', async () => {
      const mediaData = new Uint8Array(Array(20000).fill(0x00));
      const blob = new Blob([mediaData], { type: 'video/mp4' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'video/mp4' }),
        blob: () => Promise.resolve(blob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should accept audio/mpeg content type', async () => {
      const mediaData = new Uint8Array(Array(20000).fill(0x00));
      const blob = new Blob([mediaData], { type: 'audio/mpeg' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        blob: () => Promise.resolve(blob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'a-mp3' });

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('audio/mpeg');
    });

    it('should accept application/octet-stream content type', async () => {
      const mediaData = new Uint8Array(Array(20000).fill(0x00));
      const blob = new Blob([mediaData], { type: 'application/octet-stream' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        blob: () => Promise.resolve(blob),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(true);
    });
  });

  describe('network errors', () => {
    it('should handle network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
    });
  });

  describe('frontend handling of JSON errors', () => {
    it('should detect JSON error even with HTTP 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
        json: () => Promise.resolve({
          success: false,
          error: { code: 'MEDIA_TOO_SMALL', message: 'The download link has expired.' },
        }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MEDIA_TOO_SMALL');
      expect(result.error?.message).toContain('expired');
    });

    it('should handle unexpected JSON response without error structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Something unexpected' }),
      });

      const result = await requestDownload({ videoId: 'abc123def45', formatId: 'v-720' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNEXPECTED_RESPONSE');
    });
  });
});

describe('triggerBrowserDownload', () => {
  it('should create and click an anchor element', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    triggerBrowserDownload(blob, 'test.mp4');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});

describe('checkDownloadAvailability', () => {
  it('should return available when API responds with JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: false, error: { code: 'INVALID_REQUEST' } }),
    });

    const result = await checkDownloadAvailability();
    expect(result.available).toBe(true);
  });

  it('should return unavailable when API returns HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const result = await checkDownloadAvailability();
    expect(result.available).toBe(false);
  });

  it('should return unavailable on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await checkDownloadAvailability();
    expect(result.available).toBe(false);
  });
});
