import { useState, useRef, useEffect } from 'react';
import { Search, Clipboard, X, Loader2 } from 'lucide-react';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export function UrlInput({ onAnalyze, isLoading, initialValue = '' }: UrlInputProps) {
  const [url, setUrl] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) setUrl(initialValue);
  }, [initialValue]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {
      // Clipboard API not available
    }
  };

  const handleClear = () => {
    setUrl('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onAnalyze(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onAnalyze(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl opacity-20 group-hover:opacity-40 group-focus-within:opacity-50 blur transition-opacity" />
        <div className="relative flex items-center bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="pl-4 sm:pl-5">
            <Search className="w-5 h-5 text-gray-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube video or Shorts URL..."
            className="flex-1 bg-transparent px-3 sm:px-4 py-4 sm:py-5 text-white placeholder-gray-500 outline-none text-sm sm:text-base"
            disabled={isLoading}
          />

          {url && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 mr-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear URL"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 mr-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            aria-label="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="flex items-center gap-2 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Analyze Video</span>
                <span className="sm:hidden">Go</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile paste button */}
      <div className="sm:hidden mt-3 flex gap-2">
        <button
          type="button"
          onClick={handlePaste}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
        >
          <Clipboard className="w-4 h-4" />
          Paste from Clipboard
        </button>
      </div>
    </form>
  );
}
