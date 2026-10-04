import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Link as LinkIcon, Search, List, Download, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    icon: <LinkIcon className="w-6 h-6" />,
    title: 'Copy the YouTube URL',
    description: 'Find the video or Short you want to download on YouTube. Copy the URL from the address bar or the share button.',
    details: ['Works with youtube.com/watch?v=...', 'Works with youtube.com/shorts/...', 'Works with youtu.be/ short links'],
  },
  {
    number: '02',
    icon: <Search className="w-6 h-6" />,
    title: 'Paste and Analyze',
    description: 'Paste the URL into the input field on TubeFetch and click "Analyze Video". We\'ll fetch all the video information.',
    details: ['Shows video thumbnail', 'Displays title and channel', 'Detects video duration'],
  },
  {
    number: '03',
    icon: <List className="w-6 h-6" />,
    title: 'Choose Your Quality',
    description: 'Browse available video qualities (1080p, 720p, 480p, 360p) or audio-only formats (MP3, M4A). Select what you need.',
    details: ['Multiple video resolutions', 'Audio-only extraction', 'File size preview'],
  },
  {
    number: '04',
    icon: <Download className="w-6 h-6" />,
    title: 'Download Your File',
    description: 'Click download and save the file directly to your device. Watch progress in real-time.',
    details: ['Real-time progress bar', 'Cancel anytime', 'Instant file access'],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">How It Works</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Download YouTube videos in four simple steps. No software installation required.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 sm:p-8 hover:border-purple-500/20 transition-all">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400">
                        {step.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">STEP {step.number}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">{step.title}</h2>
                      <p className="text-gray-400 mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map(detail => (
                          <li key={detail} className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-5 h-5 text-gray-600 rotate-90 sm:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Start Downloading
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
