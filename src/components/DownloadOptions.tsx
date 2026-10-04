import { Download, Music, Video, Check } from 'lucide-react';
import type { VideoFormat } from '../types/video';
import { cn } from '../lib/utils';

interface DownloadOptionsProps {
  formats: VideoFormat[];
  onSelect: (format: VideoFormat) => void;
  selectedFormatId?: string;
}

export function DownloadOptions({ formats, onSelect, selectedFormatId }: DownloadOptionsProps) {
  const videoFormats = formats.filter(f => f.type === 'video');
  const audioFormats = formats.filter(f => f.type === 'audio');

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      {/* Video Formats */}
      {videoFormats.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Video Quality</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videoFormats.map(format => (
              <button
                key={format.formatId}
                onClick={() => onSelect(format)}
                className={cn(
                  'relative flex items-center justify-between p-4 rounded-xl border transition-all group',
                  selectedFormatId === format.formatId
                    ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'bg-gray-800/60 border-white/10 hover:border-purple-500/30 hover:bg-gray-800/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm',
                    selectedFormatId === format.formatId
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-300 group-hover:bg-purple-500/20 group-hover:text-purple-300'
                  )}>
                    {format.quality.replace('p', '')}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">{format.quality}</div>
                    <div className="text-gray-500 text-xs">{format.resolution} • {format.format}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{format.fileSize}</span>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    selectedFormatId === format.formatId
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 group-hover:bg-purple-500 group-hover:text-white'
                  )}>
                    {selectedFormatId === format.formatId ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Formats */}
      {audioFormats.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Audio Only</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audioFormats.map(format => (
              <button
                key={format.formatId}
                onClick={() => onSelect(format)}
                className={cn(
                  'relative flex items-center justify-between p-4 rounded-xl border transition-all group',
                  selectedFormatId === format.formatId
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-gray-800/60 border-white/10 hover:border-blue-500/30 hover:bg-gray-800/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs',
                    selectedFormatId === format.formatId
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-300 group-hover:bg-blue-500/20 group-hover:text-blue-300'
                  )}>
                    {format.format}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">{format.format}</div>
                    <div className="text-gray-500 text-xs">{format.quality}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{format.fileSize}</span>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    selectedFormatId === format.formatId
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 group-hover:bg-blue-500 group-hover:text-white'
                  )}>
                    {selectedFormatId === format.formatId ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
