import { Clock, User, Eye, ExternalLink, Zap } from 'lucide-react';
import type { VideoMetadata } from '../types/video';

interface VideoPreviewProps {
  video: VideoMetadata;
}

export function VideoPreview({ video }: VideoPreviewProps) {
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Thumbnail */}
        <div className={`relative ${video.isShort ? 'aspect-[9/16] max-h-[400px] mx-auto' : 'aspect-video'}`}>
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Duration badge - only show if duration exists */}
          {video.duration && (
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-sm rounded-md text-white text-xs font-mono">
              {video.duration}
            </div>
          )}

          {/* Shorts badge */}
          {video.isShort && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-red-500/90 backdrop-blur-sm rounded-md text-white text-xs font-semibold">
              <Zap className="w-3 h-3" />
              SHORTS
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 line-clamp-2">
            {video.title}
          </h3>

          {/* Description - only show if available */}
          {video.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-3">
              {video.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Channel - always show */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="w-4 h-4 text-purple-400" />
              <span>{video.channel}</span>
            </div>

            {/* Duration - only show if available */}
            {video.duration && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{video.duration}</span>
              </div>
            )}

            {/* View count - only show if available */}
            {video.viewCount && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Eye className="w-4 h-4 text-yellow-400" />
                <span>{video.viewCount}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-mono">ID: {video.id}</span>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open on YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
