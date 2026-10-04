export function LoadingSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-6 animate-in fade-in duration-300">
      <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {/* Thumbnail skeleton */}
        <div className="aspect-video bg-gray-700/50 animate-pulse" />

        {/* Info skeleton */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="h-6 bg-gray-700/50 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse w-1/2" />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse" />
            <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse" />
            <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse" />
            <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Quality options skeleton */}
      <div className="mt-6 space-y-3">
        <div className="h-4 bg-gray-700/50 rounded-lg animate-pulse w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-700/50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
