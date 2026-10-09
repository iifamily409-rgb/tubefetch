import { describe, it, expect } from 'vitest';
import { extractEnglishFileName } from '../src/lib/utils';

describe('extractEnglishFileName', () => {
  describe('basic functionality', () => {
    it('should prefix filename with TubeFetch_', async () => {
      const result = await extractEnglishFileName('Test Video', 'abc123', 'mp4');
      expect(result).toMatch(/^TubeFetch_/);
    });

    it('should use videoId as fallback when title is null', async () => {
      const result = await extractEnglishFileName(null, 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should use videoId as fallback when title is undefined', async () => {
      const result = await extractEnglishFileName(undefined, 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });

    it('should use videoId as fallback when title is empty', async () => {
      const result = await extractEnglishFileName('', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });
  });

  describe('English text extraction', () => {
    it('should extract English text from pure English title', async () => {
      const result = await extractEnglishFileName('Amazing Nature Documentary', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Amazing Nature Documentary.mp4');
    });

    it('should extract English text from mixed Hindi-English title', async () => {
      const result = await extractEnglishFileName('गट्टू ने पकड़ा चोर Gattu caught the thief Kids', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Gattu caught the thief Kids.mp4');
    });

    it('should extract English text from mixed Chinese-English title', async () => {
      const result = await extractEnglishFileName('中文标题 English Title Here', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_English Title Here.mp4');
    });

    it('should handle title with only English words', async () => {
      const result = await extractEnglishFileName('Simple English Title', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Simple English Title.mp4');
    });
  });

  describe('transliteration behavior', () => {
    it('should transliterate Hindi title to Roman English', async () => {
      const result = await extractEnglishFileName('गट्टू ने पकड़ा चोर', 'abc123', 'mp4');
      expect(result).toMatch(/^TubeFetch_/);
      expect(result).not.toBe('TubeFetch_abc123.mp4'); // Should not fallback to videoId
      expect(result).toMatch(/\.mp4$/);
      // Should contain transliterated text (actual transliteration may vary)
      expect(result.length).toBeGreaterThan('TubeFetch_.mp4'.length);
    });

    it('should transliterate Chinese title to Roman English', async () => {
      const result = await extractEnglishFileName('中文标题只有中文', 'abc123', 'mp4');
      expect(result).toMatch(/^TubeFetch_/);
      expect(result).not.toBe('TubeFetch_abc123.mp4'); // Should not fallback to videoId
      expect(result).toMatch(/\.mp4$/);
    });

    it('should transliterate Arabic title to Roman English', async () => {
      const result = await extractEnglishFileName('عنوان الفيديو بالعربية', 'abc123', 'mp4');
      expect(result).toMatch(/^TubeFetch_/);
      expect(result).not.toBe('TubeFetch_abc123.mp4'); // Should not fallback to videoId
      expect(result).toMatch(/\.mp4$/);
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to videoId when English text is too short (less than 3 letters)', async () => {
      const result = await extractEnglishFileName('गट्टू AB ने', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_abc123.mp4');
    });
  });

  describe('filename sanitization', () => {
    it('should remove filesystem-unsafe characters', async () => {
      const result = await extractEnglishFileName('Video: Title? With* Unsafe<Chars>', 'abc123', 'mp4');
      expect(result).not.toMatch(/[\\/:*?"<>|]/);
      expect(result).toBe('TubeFetch_Video Title With Unsafe Chars.mp4');
    });

    it('should normalize whitespace', async () => {
      const result = await extractEnglishFileName('Video   With    Multiple   Spaces', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video With Multiple Spaces.mp4');
    });

    it('should truncate long titles to 60 characters', async () => {
      const longTitle = 'A'.repeat(100);
      const result = await extractEnglishFileName(longTitle, 'abc123', 'mp4');
      const filenameWithoutPrefix = result.replace('TubeFetch_', '').replace('.mp4', '');
      expect(filenameWithoutPrefix.length).toBeLessThanOrEqual(60);
    });

    it('should remove trailing symbols', async () => {
      const result = await extractEnglishFileName('Video Title...', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video Title.mp4');
    });

    it('should remove trailing hyphens and underscores', async () => {
      const result = await extractEnglishFileName('Video Title---___', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video Title.mp4');
    });
  });

  describe('extension handling', () => {
    it('should use provided extension', async () => {
      const result = await extractEnglishFileName('Test Video', 'abc123', 'mp3');
      expect(result).toBe('TubeFetch_Test Video.mp3');
    });

    it('should handle extension with leading dot', async () => {
      const result = await extractEnglishFileName('Test Video', 'abc123', '.mp4');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should convert extension to lowercase', async () => {
      const result = await extractEnglishFileName('Test Video', 'abc123', 'MP4');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should default to mp4 when extension is empty', async () => {
      const result = await extractEnglishFileName('Test Video', 'abc123', '');
      expect(result).toBe('TubeFetch_Test Video.mp4');
    });

    it('should handle m4a extension for audio', async () => {
      const result = await extractEnglishFileName('Test Audio', 'abc123', 'm4a');
      expect(result).toBe('TubeFetch_Test Audio.m4a');
    });
  });

  describe('edge cases', () => {
    it('should handle title with numbers', async () => {
      const result = await extractEnglishFileName('Video 123 Title 456', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video 123 Title 456.mp4');
    });

    it('should handle title with hyphens', async () => {
      const result = await extractEnglishFileName('Video-Title-With-Hyphens', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video-Title-With-Hyphens.mp4');
    });

    it('should handle title with underscores', async () => {
      const result = await extractEnglishFileName('Video_Title_With_Underscores', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video_Title_With_Underscores.mp4');
    });

    it('should handle title with dots', async () => {
      const result = await extractEnglishFileName('Video.Title.With.Dots', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_Video.Title.With.Dots.mp4');
    });

    it('should handle mixed case English text', async () => {
      const result = await extractEnglishFileName('MiXeD CaSe TiTlE', 'abc123', 'mp4');
      expect(result).toBe('TubeFetch_MiXeD CaSe TiTlE.mp4');
    });
  });
});
