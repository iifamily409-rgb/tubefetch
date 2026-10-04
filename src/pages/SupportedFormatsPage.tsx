import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Video, Music, FileCheck } from 'lucide-react';

const videoFormats = [
  { quality: '1080p', resolution: '1920×1080', format: 'MP4', description: 'Full HD' },
  { quality: '720p', resolution: '1280×720', format: 'MP4', description: 'HD' },
  { quality: '480p', resolution: '854×480', format: 'MP4', description: 'Standard Definition' },
  { quality: '360p', resolution: '640×360', format: 'MP4', description: 'Low bandwidth' },
];

const audioFormats = [
  { quality: '192kbps', format: 'M4A', description: 'AAC audio, smaller file size' },
  { quality: '320kbps', format: 'MP3', description: 'Highest quality audio' },
];

const supportedContent = [
  { type: 'YouTube Videos', description: 'Standard YouTube video URLs', example: 'youtube.com/watch?v=...' },
  { type: 'YouTube Shorts', description: 'Short-form vertical videos', example: 'youtube.com/shorts/...' },
  { type: 'youtu.be Links', description: 'Shortened YouTube URLs', example: 'youtu.be/...' },
  { type: 'YouTube Embeds', description: 'Embedded video URLs', example: 'youtube.com/embed/...' },
];

export default function SupportedFormatsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Supported Formats</h1>
            <p className="text-xl text-gray-400">
              All the formats and content types TubeFetch supports.
            </p>
          </div>

          {/* Video Formats */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Video Formats</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videoFormats.map(f => (
                <div key={f.quality} className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-white/5 p-5 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{f.quality} <span className="text-gray-500 font-normal">({f.description})</span></div>
                    <div className="text-gray-400 text-sm">{f.resolution}</div>
                  </div>
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium">
                    {f.format}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Audio Formats */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Audio Formats</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {audioFormats.map(f => (
                <div key={f.format} className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-white/5 p-5 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{f.format} <span className="text-gray-500 font-normal">({f.quality})</span></div>
                    <div className="text-gray-400 text-sm">{f.description}</div>
                  </div>
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium">
                    {f.format}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Supported Content */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Supported Content</h2>
            </div>
            <div className="space-y-3">
              {supportedContent.map(item => (
                <div key={item.type} className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-white/5 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-white font-semibold">{item.type}</div>
                      <div className="text-gray-400 text-sm">{item.description}</div>
                    </div>
                    <code className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-lg font-mono">
                      {item.example}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
