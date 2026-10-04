import { Download, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Free YouTube Video Downloader</span>
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
        <span className="bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent">
          Download Your Videos
        </span>
      </h1>

      <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-2">
        Paste a YouTube video or Shorts link and choose your preferred quality.
      </p>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Download className="w-4 h-4" />
        <span>Fast • Free • No Registration</span>
      </div>
    </div>
  );
}
