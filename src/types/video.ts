export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string | null;
  uploadDate: string | null;
  isShort: boolean;
  viewCount?: string;
  description?: string | null;
}

export interface VideoFormat {
  formatId: string;
  quality: string;
  resolution?: string;
  format: string;
  fileSize?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  type: 'video' | 'audio';
}

export interface AnalyzeResponse {
  success: boolean;
  video?: VideoMetadata;
  formats?: VideoFormat[];
  error?: string;
}

export interface DownloadRequest {
  videoId: string;
  formatId: string;
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
  error?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: string;
}

export type AppStatus = 'idle' | 'loading' | 'result' | 'downloading' | 'complete' | 'error';

export interface DownloadState {
  progress: number;
  fileName: string;
  quality: string;
  format: string;
  fileSize: string;
}
