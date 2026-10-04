import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Is TubeFetch free to use?',
    answer: 'Yes, TubeFetch is completely free. No registration or payment required.',
  },
  {
    question: 'What video qualities are available?',
    answer: 'TubeFetch supports multiple qualities including 1080p, 720p, 480p, and 360p. Available qualities depend on the original video.',
  },
  {
    question: 'Can I download YouTube Shorts?',
    answer: 'Yes! TubeFetch fully supports YouTube Shorts. Just paste the Shorts URL and it will be detected automatically.',
  },
  {
    question: 'Is it legal to download YouTube videos?',
    answer: 'Downloading videos for personal use may be subject to YouTube\'s Terms of Service. Always respect copyright and content creators\' rights.',
  },
  {
    question: 'What audio formats are supported?',
    answer: 'TubeFetch supports M4A and MP3 audio extraction from YouTube videos.',
  },
  {
    question: 'Do I need to install any software?',
    answer: 'No, TubeFetch works entirely in your browser. No software installation needed.',
  },
];

interface FAQProps {
  items?: FAQItem[];
}

export function FAQ({ items = faqItems }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-gray-800/40 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden transition-all"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <span className="text-white font-medium pr-4">{item.question}</span>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
                openIndex === index && 'rotate-180 text-purple-400'
              )}
            />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              openIndex === index ? 'max-h-40 pb-5' : 'max-h-0'
            )}
          >
            <p className="px-5 text-gray-400 text-sm leading-relaxed">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
