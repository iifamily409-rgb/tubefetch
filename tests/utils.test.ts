import { describe, it, expect } from 'vitest';
import { extractEnglishFileName } from '../src/lib/utils';

describe('extractEnglishFileName', () => {
  describe('basic functionality', () => {
    it('should prefix filename with TubeFetch_', () => {
      const result = extractEnglishFileName('Test Video', 'abc123', 'mp4');
      expect(result).toMatch(/^TubeFetch_/);
    });

    it('should use videoId as fallback when title is null', () => {
      const result = extractEnglishFileName(null, 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should use videoId as fallback when title is undefined', () => {
      const result = extractEnglishFileName(undefined, 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should use videoId as fallback when title is empty', () => {
      const result = extractEnglishFileName('', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });
  });

  describe('English text extraction', () => {
    it('should extract English text from pure English title', () => {
      const result = extractEnglishFileName('Amazing Nature Documentary', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Amazing Nature Documentary.mp4');
    });

    it('should extract English text from mixed Hindi-English title', () => {
      const result = extractEnglishFileName('गट्टू ने पकड़ा चोर Gattu caught the thief Kids', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Gattu caught the thief Kids.mp4');
    });

    it('should extract English text from mixed Chinese-English title', () => {
      const result = extractEnglishFileName('中文标题 English Title Here', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_English Title Here.mp4');
    });

    it('should handle title with only English words', () => {
      const result = extractEnglishFileName('Simple English Title', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Simple English Title.mp4');
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to videoId when title has no English text', () => {
      const result = extractEnglishFileName('गट्टू ने पकड़ा चोर', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should fallback to videoId when title has only non-English characters', () => {
      const result = extractEnglishFileName('中文标题只有中文', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should fallback to videoId when English text is too short (less than 3 letters)', () => {
      const result = extractEnglishFileName('गट्टू AB ने', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });
  });

  describe('filename sanitization', () => {
    it('should remove filesystem-unsafe characters', () => {
      const result = extractEnglishFileName('Video: Title? With* Unsafe<Chars>', 'abc123', 'mp4');
      expect(result).not.toMatch(/[\\/:*?"<>|]/);
      expect(result).toBe('TubeFetch_Video Title With Unsafe Chars.mp4');
    });

    it('should normalize whitespace', () => {
      const result = extractEnglishFileName('Video   With    Multiple   Spaces', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video With Multiple Spaces.mp4');
    });

    it('should truncate long titles to 60 characters', () => {
      const longTitle = 'A'.repeat(100);
      const result = extractEnglishFileName(longTitle, 'abc123', 'mp4');
      const filenameWithoutPrefix = result.replace('TubeFetch_', '').replace('.mp4', '');
      expect(filenameWithoutPrefix.length).toBeLessThanOrEqual(60);
    });

    it('should remove trailing symbols', () => {
      const result = extractEnglishFileName('Video Title...', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video Title.mp4');
    });

    it('should remove trailing hyphens and underscores', () => {
      const result = extractEnglishFileName('Video Title---___', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video Title.mp4');
    });
  });

  describe('extension handling', () => {
    it('should use provided extension', () => {
      const result = extractEnglishFileName('Test Video', 'abc123', 'mp3');
      expect(result).toBe('TubeFetch_Test Video.mp3');
    });

    it('should handle extension with leading dot', () => {
      const result = extractEnglishFileName('Test Video', 'abc123', '.mp4');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should convert extension to lowercase', () => {
      const result = extractEnglishFileName('Test Video', 'abc123', 'MP4');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should default to mp4 when extension is empty', () => {
      const result = extractEnglishFileName('Test Video', 'abc123', '');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should handle m4a extension for audio', () => {
      const result = extractEnglishFileName('Test Audio', 'abc123', 'm4a');
      expect(result).toBe('TubeFetch_Test Audio.m4a');
    });
  });

  describe('edge cases', () => {
    it('should handle title with numbers', () => {
      const result = extractEnglishFileName('Video 123 Title 456', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video 123 Title 456.mp4');
    });

    it('should handle title with hyphens', () => {
      const result = extractEnglishFileName('Video-Title-With-Hyphens', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video-Title-With-Hyphens.mp4');
    });

    it('should handle title with underscores', () => {
      const result = extractEnglishFileName('Video_Title_With_Underscores', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video_Title_With_Underscores.mp4');
    });

    it('should handle title with dots', () => {
      const result = extractEnglishFileName('Video.Title.With.Dots', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video.Title.With.Dots.mp4');
    });

    it('should handle mixed case English text', () => {
      const result = extractEnglishFileName('MiXeD CaSe TiTlE', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_MiXeD CaSe TiTlE.mp4');
    });
  });
});
