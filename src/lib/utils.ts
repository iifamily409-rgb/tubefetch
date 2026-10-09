export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Extracts a clean, recognizable English filename from a video title.
 * Always prefixes the filename with "TubeFetch_".
 * If mixed (e.g., Hindi + English), keeps the English words.
 * If no English text is found, transliterates the entire title to Roman English.
 * Only falls back to videoId if transliteration fails or produces empty result.
 */
export async function extractEnglishFileName(title: string | undefined | null, videoId: string, ext: string = 'mp4'): Promise<string> {
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'mp4';
  const prefix = 'TubeFetch_';

  if (!title) {
    return `${prefix}${videoId}.${cleanExt}`;
  }

  // Remove filesystem-unsafe characters
  const sanitized = title.replace(/[\\/:*?"<>|]/g, ' ');

  // Extract English words, numbers, and common punctuation
  const englishMatches = sanitized.match(/[a-zA-Z0-9\s\-_.]+/g);
  let englishTitle = '';

  if (englishMatches) {
    englishTitle = englishMatches
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Check if there are meaningful English letters (at least 3 letters)
  const hasValidEnglish = /[a-zA-Z]{3,}/.test(englishTitle);

  if (hasValidEnglish) {
    // Truncate to a safe length (max 60 chars) and clean trailing symbols
    const trimmedTitle = englishTitle
      .substring(0, 60)
      .trim()
      .replace(/[.\-_]+$/, '');
    return `${prefix}${trimmedTitle}.${cleanExt}`;
  }

  // No English text found - transliterate the entire title to Roman English
  try {
    // Dynamic import for transliteration library
    const { transliterate } = await import('transliteration');
    const transliterated = transliterate(sanitized, {
      trim: true,
    });

    // Clean up the transliterated result
    const cleanedTransliterated = transliterated
      .replace(/[^\w\s\-_.]/g, ' ') // Remove any remaining non-safe chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 60) // Truncate to safe length
      .replace(/[.\-_]+$/, ''); // Remove trailing symbols

    // If transliteration produced valid result, use it
    if (cleanedTransliterated.length >= 3) {
      return `${prefix}${cleanedTransliterated}.${cleanExt}`;
    }
  } catch (error) {
    console.warn('[extractEnglishFileName] Transliteration failed:', error);
  }

  // Final fallback to videoId if transliteration failed or produced empty result
  return `${prefix}${videoId}.${cleanExt}`;
}
