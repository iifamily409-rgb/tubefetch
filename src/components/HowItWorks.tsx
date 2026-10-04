import { Link as LinkIcon, Search, List, Download } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: <LinkIcon className="w-6 h-6" />,
    title: 'Paste URL',
    description: 'Copy a YouTube video or Shorts link and paste it into the input field.',
  },
  {
    number: '02',
    icon: <Search className="w-6 h-6" />,
    title: 'Analyze Video',
    description: 'Click "Analyze Video" to fetch video information and available download options.',
  },
  {
    number: '03',
    icon: <List className="w-6 h-6" />,
    title: 'Choose Quality',
    description: 'Select your preferred video quality (1080p, 720p, 480p, 360p) or audio format.',
  },
  {
    number: '04',
    icon: <Download className="w-6 h-6" />,
    title: 'Download',
    description: 'Click download and save the file to your device. It\'s that simple!',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Download YouTube videos in just a few simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 h-full hover:border-purple-500/20 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-bold text-white/10">{step.number}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
