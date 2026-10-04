import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorStateProps {
  title?: string;
  message: string;
  type?: 'invalid-url' | 'unavailable' | 'unsupported' | 'processing' | 'download' | 'network';
  onRetry?: () => void;
}

const errorConfig = {
  'invalid-url': {
    icon: '🔗',
    color: 'yellow',
  },
  'unavailable': {
    icon: '🚫',
    color: 'red',
  },
  'unsupported': {
    icon: '❌',
    color: 'orange',
  },
  'processing': {
    icon: '⚙️',
    color: 'blue',
  },
  'download': {
    icon: '📥',
    color: 'red',
  },
  'network': {
    icon: '🌐',
    color: 'purple',
  },
};

export function ErrorState({ title = 'Something went wrong', message, type = 'processing', onRetry }: ErrorStateProps) {
  const config = errorConfig[type];

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
        <div className="text-4xl mb-4">{config.icon}</div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl border border-purple-500/30 transition-all text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
