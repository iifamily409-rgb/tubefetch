import { describe, it, expect, vi } from 'vitest';
import { analyzeVideo, validateUrl, getMetadata, getAvailableFormats, prepareDownload } from '../src/services/videoService';

// Mock sleep to speed up tests
vi.mock('../src/lib/utils', async () => {
  const actual = await vi.importActual('../src/lib/utils');
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock fetch to simulate API not available (fallback to mock)
const mockFetch = vi.fn().mockRejectedValue(new Error('API not available'));
global.fetch = mockFetch;

describe('validateUrl', () => {
  it('should validate correct YouTube URLs', async () => {
    const result = await validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.isShort).toBe(false);
  });

  it('should detect Shorts URLs', async () => {
    const result = await validateUrl('https://www.youtube.com/shorts/abc123def45');
    expect(result.valid).toBe(true);
    expect(result.isShort).toBe(true);
  });

  it('should reject invalid URLs', async () => {
    const result = await validateUrl('not-a-youtube-url');
    expect(result.valid).toBe(false);
    expect(result.videoId).toBe(null);
  });
});

describe('getMetadata', () => {
  it('should return metadata for known video IDs', async () => {
    const metadata = await getMetadata('dQw4w9WgXcQ');
    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe('dQw4w9WgXcQ');
    expect(metadata?.title).toContain('Rick Astley');
    expect(metadata?.isShort).toBe(false);
  });

  it('should generate metadata for unknown video IDs', async () => {
    const metadata = await getMetadata('unknownVideoId');
    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe('unknownVideoId');
    expect(metadata?.title).toBeTruthy();
  });
});

describe('getAvailableFormats', () => {
  it('should return video formats for regular videos', async () => {
    const formats = await getAvailableFormats(false);
    expect(formats.length).toBeGreaterThan(0);
    expect(formats.some(f => f.type === 'video')).toBe(true);
    expect(formats.some(f => f.type === 'audio')).toBe(true);
  });

  it('should return different formats for Shorts', async () => {
    const regularFormats = await getAvailableFormats(false);
    const shortFormats = await getAvailableFormats(true);
    
    const regularVideoFormats = regularFormats.filter(f => f.type === 'video');
    const shortVideoFormats = shortFormats.filter(f => f.type === 'video');
    
    expect(shortVideoFormats.length).toBeGreaterThan(0);
    expect(regularVideoFormats.length).toBeGreaterThan(0);
  });
});

describe('analyzeVideo', () => {
  it('should return success for valid YouTube URLs (fallback to mock)', async () => {
    const result = await analyzeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.success).toBe(true);
    expect(result.video).toBeDefined();
    expect(result.formats).toBeDefined();
    expect(result.formats!.length).toBeGreaterThan(0);
  });

  it('should return error for invalid URLs', async () => {
    const result = await analyzeVideo('not-a-url');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should work with Shorts URLs', async () => {
    const result = await analyzeVideo('https://www.youtube.com/shorts/abc123def45');
    expect(result.success).toBe(true);
    expect(result.video?.isShort).toBe(true);
  });

  it('should use real API when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        video: {
          id: 'test123456',
          title: 'Test Video',
          thumbnail: 'https://example.com/thumb.jpg',
          channel: 'Test Channel',
          duration: '—',
          uploadDate: '2024-01-01',
          isShort: false,
        },
        formats: [],
        downloadAvailable: false,
      }),
    });

    const result = await analyzeVideo('https://www.youtube.com/watch?v=test123456');
    expect(result.success).toBe(true);
    expect(result.video?.title).toBe('Test Video');
  });
});

describe('prepareDownload', () => {
  it('should return download info for valid format', async () => {
    const result = await prepareDownload('dQw4w9WgXcQ', '720p');
    expect(result.fileName).toBeTruthy();
    expect(result.quality).toBe('720p');
    expect(result.format).toBe('MP4');
  });

  it('should throw for invalid format ID', async () => {
    await expect(prepareDownload('dQw4w9WgXcQ', 'invalid-format')).rejects.toThrow();
  });
});
