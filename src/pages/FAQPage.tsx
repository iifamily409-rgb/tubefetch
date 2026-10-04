import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { FAQ as FAQComponent } from '../components/FAQ';

const faqItems = [
  {
    question: 'Is TubeFetch free to use?',
    answer: 'Yes, TubeFetch is completely free. No registration, no hidden fees, no premium plans.',
  },
  {
    question: 'What video qualities are available?',
    answer: 'TubeFetch supports multiple qualities including 1080p (Full HD), 720p (HD), 480p (SD), and 360p. Available qualities depend on what the original video offers.',
  },
  {
    question: 'Can I download YouTube Shorts?',
    answer: 'Absolutely! TubeFetch automatically detects YouTube Shorts URLs and provides the appropriate download options in vertical format.',
  },
  {
    question: 'Is it legal to download YouTube videos?',
    answer: 'The legality depends on your jurisdiction and intended use. Downloading for personal offline viewing may be acceptable in some regions. Always respect copyright laws and content creators\' rights. We do not encourage piracy.',
  },
  {
    question: 'What audio formats are supported?',
    answer: 'TubeFetch can extract audio in M4A (AAC) and MP3 formats. Audio-only downloads are perfect for music and podcasts.',
  },
  {
    question: 'Do I need to install any software?',
    answer: 'No! TubeFetch works entirely in your web browser. No extensions, no software, no apps required.',
  },
  {
    question: 'Is there a download limit?',
    answer: 'No, there are no download limits. You can download as many videos as you need.',
  },
  {
    question: 'Why is my download slow?',
    answer: 'Download speed depends on the file size, your internet connection, and server load. Larger files (1080p) naturally take longer.',
  },
  {
    question: 'Can I download private or unlisted videos?',
    answer: 'TubeFetch can only access publicly available videos. Private and age-restricted content cannot be downloaded.',
  },
  {
    question: 'Does TubeFetch store my data?',
    answer: 'No. We do not store any user data, download history, or personal information. Everything happens in real-time.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">FAQ</h1>
            <p className="text-xl text-gray-400">
              Everything you need to know about TubeFetch.
            </p>
          </div>
          <FAQComponent items={faqItems} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
