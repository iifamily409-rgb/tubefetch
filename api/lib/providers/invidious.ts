/**
 * Invidious API Provider Implementation
 * 
 * Invidious is an open-source YouTube frontend with a REST API.
 * Documentation: https://docs.invidious.io/api/
 * 
 * Key endpoints:
 * - GET /api/v1/videos/{videoId} - Get video metadata
 * - GET /api/v1/captions/{videoId} - Get captions
 * - Streaming URLs are provided in the video response
 * 
 * Public instances: https://api.invidious.io/
 */

import type { VideoProvider, ProviderConfig, AnalyzeResult, DownloadResult, ProviderFormat } from './types';

export class InvidiousProvider implements VideoProvider {
  readonly name = 'invidious';
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Check if the Invidious instance is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze a YouTube URL using Invidious API
   */
  async analyze(url: string): Promise<AnalyzeResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid YouTube URL' },
        };
      }

      console.log('[invidious] Analyzing video:', videoId);

      // Fetch video metadata from Invidious
      const response = await fetch(`${this.config.apiUrl}/api/v1/videos/${videoId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: { code: 'VIDEO_UNAVAILABLE', message: 'Video not found or unavailable' },
          };
        }
        return {
          success: false,
          error: { code: 'PROVIDER_ERROR', message: `Invidious API returned HTTP ${response.status}` },
        };
      }

      const data = await response.json() as any;

      // Extract metadata
      const video = {
        id: videoId,
        title: data.title || 'Untitled',
        thumbnail: data.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channel: data.author || 'Unknown',
        duration: this.formatDuration(data.lengthSeconds || 0),
        uploadDate: data.publishedText || new Date().toISOString().split('T')[0],
        isShort: (data.lengthSeconds || 0) <= 60,
        viewCount: data.viewCount ? this.formatViewCount(data.viewCount) : undefined,
      };

      // Extract available formats
      const formats = this.extractFormats(data);

      console.log('[invidious] Analysis complete:', { videoId, formatCount: formats.length });

      return {
        success: true,
        video,
        formats,
      };
    } catch (error) {
      console.error('[invidious] Analyze error:', error);
      return {
        success: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Failed to connect to Invidious instance',
        },
      };
    }
  }

  /**
   * Prepare a download by returning the media URL from Invidious
   */
  async prepareDownload(
    url: string,
    quality?: string,
    audioFormat?: string,
    downloadMode?: string
  ): Promise<DownloadResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid YouTube URL' },
        };
      }

      console.log('[invidious] Preparing download:', { videoId, quality, downloadMode });

      // Fetch video data from Invidious
      const response = await fetch(`${this.config.apiUrl}/api/v1/videos/${videoId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: { code: 'PROVIDER_ERROR', message: `Invidious API returned HTTP ${response.status}` },
        };
      }

      const data = await response.json() as any;

      // Select the appropriate stream based on format
      let mediaUrl: string | undefined;
      let fileName: string;

      if (downloadMode === 'audio') {
        // Audio-only download
        const adaptiveFormats = data.adaptiveFormats || [];
        const audioFormats = adaptiveFormats.filter((f: any) => f.type?.startsWith('audio/'));
        
        const targetFormat = audioFormat || 'mp3';
        const audioStream = audioFormats.find((f: any) => 
          f.type?.includes(targetFormat) || f.container === targetFormat
        ) || audioFormats[0];

        if (!audioStream || !audioStream.url) {
          return {
            success: false,
            error: { code: 'FORMAT_UNAVAILABLE', message: 'Audio format not available' },
          };
        }

        mediaUrl = audioStream.url;
        fileName = `${data.title || 'audio'}.${targetFormat}`;
      } else {
        // Video download
        const formatStreams = data.formatStreams || [];
        const targetQuality = quality || '720p';
        const targetHeight = parseInt(targetQuality.replace('p', ''));

        // Find best matching video stream
        const videoStream = formatStreams.find((s: any) => 
          s.qualityLabel === targetQuality || s.height === targetHeight
        ) || formatStreams.find((s: any) => s.height <= targetHeight) || formatStreams[0];

        if (!videoStream || !videoStream.url) {
          return {
            success: false,
            error: { code: 'FORMAT_UNAVAILABLE', message: 'Video quality not available' },
          };
        }

        mediaUrl = videoStream.url;
        fileName = `${data.title || 'video'}.mp4`;
      }

      console.log('[invidious] Media URL obtained');

      return {
        success: true,
        mediaUrl,
        fileName,
        needsProxy: false, // Invidious provides direct URLs
      };
    } catch (error) {
      console.error('[invidious] Prepare download error:', error);
      return {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to prepare download',
        },
      };
    }
  }

  /**
   * Fetch media from a direct URL (Invidious provides direct stream URLs)
   */
  async fetchMedia(mediaUrl: string): Promise<{
    body: ReadableStream<Uint8Array> | null;
    contentType: string;
    contentLength: string | null;
  }> {
    const response = await fetch(mediaUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: HTTP ${response.status}`);
    }

    return {
      body: response.body,
      contentType: response.headers.get('content-type') || 'video/mp4',
      contentLength: response.headers.get('content-length'),
    };
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.trim().match(regex);
    return match ? match[5] : null;
  }

  /**
   * Extract available formats from Invidious response
   */
  private extractFormats(data: any): ProviderFormat[] {
    const formats: ProviderFormat[] = [];

    // Video formats (formatStreams)
    const formatStreams = data.formatStreams || [];
    const seenQualities = new Set<string>();

    for (const stream of formatStreams) {
      if (!stream.url) continue;

      const quality = stream.qualityLabel || `${stream.height}p`;
      if (seenQualities.has(quality)) continue;
      seenQualities.add(quality);

      formats.push({
        formatId: quality,
        quality,
        resolution: stream.height ? `${stream.width || Math.round(stream.height * 16 / 9)}x${stream.height}` : undefined,
        format: stream.container?.toUpperCase() || 'MP4',
        fileSize: '—',
        hasAudio: true,
        hasVideo: true,
        type: 'video',
      });
    }

    // Audio formats (adaptiveFormats)
    const adaptiveFormats = data.adaptiveFormats || [];
    const seenAudioFormats = new Set<string>();

    for (const stream of adaptiveFormats) {
      if (!stream.url || !stream.type?.startsWith('audio/')) continue;

      const format = stream.container || (stream.type?.includes('mp3') ? 'mp3' : 'm4a');
      if (seenAudioFormats.has(format)) continue;
      seenAudioFormats.add(format);

      formats.push({
        formatId: `audio-${format}`,
        quality: stream.bitrate ? `${Math.round(stream.bitrate / 1000)}kbps` : '128kbps',
        format: format.toUpperCase(),
        fileSize: '—',
        hasAudio: true,
        hasVideo: false,
        type: 'audio',
      });
    }

    return formats;
  }

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   */
  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Format view count
   */
  private formatViewCount(views: number): string {
    if (views >= 1_000_000_000) {
      return `${(views / 1_000_000_000).toFixed(1)}B views`;
    }
    if (views >= 1_000_000) {
      return `${(views / 1_000_000).toFixed(1)}M views`;
    }
    if (views >= 1_000) {
      return `${(views / 1_000).toFixed(1)}K views`;
    }
    return `${views} views`;
  }
}
