import { describe, it, expect } from 'vitest';
import {
  isValidYouTubeUrl,
  isYouTubeShort,
  extractVideoId,
  normalizeUrl,
  getVideoUrl,
  getThumbnailUrl,
} from '../src/lib/validation';

describe('isValidYouTubeUrl', () => {
  it('should validate standard YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('should validate YouTube Shorts URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/shorts/abc123def45')).toBe(true);
    expect(isValidYouTubeUrl('https://youtube.com/shorts/abc123def45')).toBe(true);
  });

  it('should validate youtu.be short URLs', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('should validate embed URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidYouTubeUrl('')).toBe(false);
    expect(isValidYouTubeUrl('not a url')).toBe(false);
    expect(isValidYouTubeUrl('https://vimeo.com/12345')).toBe(false);
    expect(isValidYouTubeUrl('https://google.com')).toBe(false);
    expect(isValidYouTubeUrl('https://youtube.com')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isValidYouTubeUrl('  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ')).toBe(true);
  });
});

describe('isYouTubeShort', () => {
  it('should detect Shorts URLs', () => {
    expect(isYouTubeShort('https://www.youtube.com/shorts/abc123def45')).toBe(true);
    expect(isYouTubeShort('https://youtube.com/shorts/abc123def45')).toBe(true);
  });

  it('should not detect regular videos as Shorts', () => {
    expect(isYouTubeShort('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('should handle invalid input', () => {
    expect(isYouTubeShort('')).toBe(false);
    expect(isYouTubeShort('not a url')).toBe(false);
  });
});

describe('extractVideoId', () => {
  it('should extract video ID from standard URLs', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from short URLs', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from Shorts URLs', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/abc123def45')).toBe('abc123def45');
  });

  it('should extract video ID from embed URLs', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid URLs', () => {
    expect(extractVideoId('')).toBe(null);
    expect(extractVideoId('not a url')).toBe(null);
  });
});

describe('normalizeUrl', () => {
  it('should add https if missing', () => {
    expect(normalizeUrl('youtube.com/watch?v=123')).toBe('https://youtube.com/watch?v=123');
  });

  it('should keep existing protocol', () => {
    expect(normalizeUrl('https://youtube.com/watch?v=123')).toBe('https://youtube.com/watch?v=123');
    expect(normalizeUrl('http://youtube.com/watch?v=123')).toBe('http://youtube.com/watch?v=123');
  });

  it('should trim whitespace', () => {
    expect(normalizeUrl('  youtube.com  ')).toBe('https://youtube.com');
  });

  it('should handle empty input', () => {
    expect(normalizeUrl('')).toBe('');
  });
});

describe('getVideoUrl', () => {
  it('should construct proper YouTube URL', () => {
    expect(getVideoUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('getThumbnailUrl', () => {
  it('should construct thumbnail URL with default quality', () => {
    expect(getThumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('should construct thumbnail URL with maxres quality', () => {
    expect(getThumbnailUrl('dQw4w9WgXcQ', 'maxres')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
});
