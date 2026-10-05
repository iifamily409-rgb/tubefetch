/**
 * Provider abstraction layer for video processing.
 * 
 * This interface allows swapping the underlying video provider without
 * changing the API routes or frontend code.
 */

export interface ProviderVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
  uploadDate: string;
  isShort: boolean;
  viewCount?: string;
  description?: string;
}

export interface ProviderFormat {
  formatId: string;
  quality: string;
  resolution?: string;
  format: string;
  fileSize?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  type: 'video' | 'audio';
  /** Provider-specific parameters for this format */
  providerParams?: Record<string, string>;
}

export interface AnalyzeResult {
  success: boolean;
  video?: ProviderVideoInfo;
  formats?: ProviderFormat[];
  error?: { code: string; message: string };
}

export interface DownloadResult {
  success: boolean;
  /** Direct URL to the media file (for redirect mode) */
  mediaUrl?: string;
  /** URL to proxy through the provider (for tunnel mode) */
  tunnelUrl?: string;
  /** Suggested filename from provider */
  fileName?: string;
  /** Whether the media needs to be fetched via the provider's tunnel */
  needsProxy?: boolean;
  error?: { code: string; message: string };
}

export interface ProviderConfig {
  /** Base URL of the provider API instance (e.g., https://pipedapi.kavin.rocks) */
  apiUrl: string;
  /** API key for authentication (if required by the instance) */
  apiKey?: string;
}

export interface VideoProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  analyze(url: string): Promise<AnalyzeResult>;
  prepareDownload(
    url: string,
    quality?: string,
    audioFormat?: string,
    downloadMode?: string
  ): Promise<DownloadResult>;
  fetchMedia(url: string): Promise<{
    body: ReadableStream<Uint8Array> | null;
    contentType: string;
    contentLength: string | null;
  }>;
}

export function isProviderConfigured(config: ProviderConfig | null): config is ProviderConfig {
  return config !== null && !!config.apiUrl && config.apiUrl.length > 0;
}
