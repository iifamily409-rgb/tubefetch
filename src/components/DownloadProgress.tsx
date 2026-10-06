import { Download, CheckCircle, X, FileDown } from 'lucide-react';
import type { DownloadState } from '../types/video';

interface DownloadProgressProps {
  state: 'preparing' | 'downloading' | 'complete' | 'error';
  progress: number;
  downloadState?: DownloadState;
  onCancel?: () => void;
  onDownload?: () => void;
  error?: string;
}

export function DownloadProgress({ state, progress, downloadState, onCancel, onDownload, error }: DownloadProgressProps) {
  if (state === 'preparing') {
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in duration-300">
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <p className="text-white font-medium">Fetching video info...</p>
              {downloadState && (
                <p className="text-gray-400 text-sm">{downloadState.quality} • {downloadState.format}</p>
              )}
            </div>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'downloading') {
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in duration-300">
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-blue-400 animate-bounce" />
              </div>
              <div>
                <p className="text-white font-medium">Converting video (in queue)...</p>
                {downloadState && (
                  <p className="text-gray-400 text-sm">{downloadState.quality} • {downloadState.format}</p>
                )}
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Cancel download"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mb-2">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{progress}%</span>
            {downloadState && <span className="text-gray-500">{downloadState.fileSize}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'complete') {
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6 shadow-lg shadow-green-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-lg">Ready!</p>
              {downloadState && (
                <p className="text-gray-400 text-sm">
                  {downloadState.quality} • {downloadState.format} • {downloadState.fileSize}
                </p>
              )}
            </div>
          </div>

          {downloadState && (
            <p className="text-gray-300 text-sm mb-4 truncate bg-white/5 rounded-lg px-3 py-2">
              📄 {downloadState.fileName}
            </p>
          )}

          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02]"
          >
            <Download className="w-5 h-5" />
            Download MP4
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in duration-300">
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Download Failed</p>
              <p className="text-gray-400 text-sm">{error || 'An error occurred during download.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
