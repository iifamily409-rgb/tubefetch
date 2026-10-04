import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Heart, Code, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">About TubeFetch</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A modern, open-source YouTube video downloader built with simplicity and performance in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Heart className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Our Mission</h3>
              <p className="text-gray-400 text-sm">
                We believe downloading your favorite content should be simple, fast, and accessible to everyone. TubeFetch was built to provide a clean, ad-free experience.
              </p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <Code className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Open Source</h3>
              <p className="text-gray-400 text-sm">
                TubeFetch is open source and built with modern technologies. We welcome contributions from developers worldwide.
              </p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Community Driven</h3>
              <p className="text-gray-400 text-sm">
                Built by the community, for the community. Our features and improvements come from real user feedback.
              </p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Privacy First</h3>
              <p className="text-gray-400 text-sm">
                No tracking, no data collection, no ads. Your downloads are your business, not ours.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Tech Stack</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Vitest', 'Framer Motion'].map(tech => (
                <div key={tech} className="px-4 py-3 bg-white/5 rounded-xl text-center text-gray-300 text-sm font-medium">
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
