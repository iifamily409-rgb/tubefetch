/**
 * Piped API Provider Implementation
 * 
 * Piped is an open-source YouTube frontend with a REST API.
 * Documentation: https://piped-docs.kavin.rocks/
 * 
 * Key endpoints:
 * - GET /streams/{videoId} - Get video metadata and stream URLs
 * - Stream URLs are provided directly by Piped
 * 
 * Note: Piped instances may have rate limits and availability issues.
 * Public instances: https://github.com/TeamPiped/Piped/wiki/Instances
 */

import type { VideoProvider, ProviderConfig, AnalyzeResult, DownloadResult, ProviderFormat } from './types';

export class PipedProvider implements VideoProvider {
  readonly name = 'piped';
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Check if the Piped instance is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze a YouTube URL using Piped API
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

      console.log('[piped] Analyzing video:', videoId);

      // Fetch video metadata from Piped
      const response = await fetch(`${this.config.apiUrl}/streams/${videoId}`, {
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
          error: { code: 'PROVIDER_ERROR', message: `Piped API returned HTTP ${response.status}` },
        };
      }

      const data = await response.json() as any;

      // Extract metadata
      const video = {
        id: videoId,
        title: data.title || 'Untitled',
        thumbnail: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channel: data.uploader || data.uploaderName || 'Unknown',
        duration: this.formatDuration(data.duration || 0),
        uploadDate: data.uploadDate || new Date().toISOString().split('T')[0],
        isShort: (data.duration || 0) <= 60,
        viewCount: data.views ? this.formatViewCount(data.views) : undefined,
      };

      // Extract available formats
      const formats = this.extractFormats(data);

      console.log('[piped] Analysis complete:', { videoId, formatCount: formats.length });

      return {
        success: true,
        video,
        formats,
      };
    } catch (error) {
      console.error('[piped] Analyze error:', error);
      return {
        success: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Failed to connect to Piped instance',
        },
      };
    }
  }

  /**
   * Prepare a download by returning the media URL from Piped
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

      console.log('[piped] Preparing download:', { videoId, quality, downloadMode });

      // Fetch video streams from Piped
      const response = await fetch(`${this.config.apiUrl}/streams/${videoId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: { code: 'PROVIDER_ERROR', message: `Piped API returned HTTP ${response.status}` },
        };
      }

      const data = await response.json() as any;

      // Select the appropriate stream based on format
      let mediaUrl: string | undefined;
      let fileName: string;

      if (downloadMode === 'audio') {
        // Audio-only download
        const audioStreams = data.audioStreams || [];
        const targetFormat = audioFormat || 'mp3';
        
        // Find best matching audio stream
        const audioStream = audioStreams.find((s: any) => 
          s.mimeType?.includes(targetFormat) || s.format === targetFormat
        ) || audioStreams[0];

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
        const videoStreams = data.videoStreams || [];
        const targetQuality = quality || '720p';
        const targetHeight = parseInt(targetQuality.replace('p', ''));

        // Find best matching video stream
        const videoStream = videoStreams.find((s: any) => 
          s.quality === targetQuality || s.height === targetHeight
        ) || videoStreams.find((s: any) => s.height <= targetHeight) || videoStreams[0];

        if (!videoStream || !videoStream.url) {
          return {
            success: false,
            error: { code: 'FORMAT_UNAVAILABLE', message: 'Video quality not available' },
          };
        }

        mediaUrl = videoStream.url;
        fileName = `${data.title || 'video'}.mp4`;
      }

      console.log('[piped] Media URL obtained');

      return {
        success: true,
        mediaUrl,
        fileName,
        needsProxy: false, // Piped provides direct URLs
      };
    } catch (error) {
      console.error('[piped] Prepare download error:', error);
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
   * Fetch media from a direct URL (Piped provides direct stream URLs)
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
   * Extract available formats from Piped response
   */
  private extractFormats(data: any): ProviderFormat[] {
    const formats: ProviderFormat[] = [];

    // Video formats
    const videoStreams = data.videoStreams || [];
    const seenQualities = new Set<string>();

    for (const stream of videoStreams) {
      if (!stream.url) continue;

      const quality = stream.quality || `${stream.height}p`;
      if (seenQualities.has(quality)) continue;
      seenQualities.add(quality);

      formats.push({
        formatId: quality,
        quality,
        resolution: stream.height ? `${stream.width}x${stream.height}` : undefined,
        format: 'MP4',
        fileSize: '—',
        hasAudio: true,
        hasVideo: true,
        type: 'video',
      });
    }

    // Audio formats
    const audioStreams = data.audioStreams || [];
    const seenAudioFormats = new Set<string>();

    for (const stream of audioStreams) {
      if (!stream.url) continue;

      const format = stream.format || (stream.mimeType?.includes('mp3') ? 'mp3' : 'm4a');
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
