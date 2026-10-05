import { useState, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { UrlInput } from '../components/UrlInput';
import { VideoPreview } from '../components/VideoPreview';
import { DownloadOptions } from '../components/DownloadOptions';
import { DownloadProgress } from '../components/DownloadProgress';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { HowItWorks } from '../components/HowItWorks';
import { FeatureCard } from '../components/FeatureCard';
import { FAQ } from '../components/FAQ';
import { analyzeVideo, prepareDownload } from '../services/videoService';
import { requestDownload, triggerBrowserDownload } from '../services/downloadService';
import { isValidYouTubeUrl } from '../lib/validation';
import { sleep } from '../lib/utils';
import type { VideoMetadata, VideoFormat, DownloadState, AppStatus } from '../types/video';
import { Zap, Shield, Globe, Clock, Download, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<{ title: string; message: string; type: 'invalid-url' | 'unavailable' | 'unsupported' | 'processing' | 'download' | 'network' } | null>(null);
  const [lastUrl, setLastUrl] = useState('');
  const cancelRef = useRef(false);

  const handleAnalyze = useCallback(async (url: string) => {
    setStatus('loading');
    setError(null);
    setVideo(null);
    setFormats([]);
    setSelectedFormat(null);
    setDownloadState(null);
    setLastUrl(url);

    if (!isValidYouTubeUrl(url)) {
      setStatus('error');
      setError({
        title: 'Invalid URL',
        message: 'Please enter a valid YouTube video or Shorts link.',
        type: 'invalid-url',
      });
      return;
    }

    try {
      const result = await analyzeVideo(url);
      if (result.success && result.video && result.formats) {
        setVideo(result.video);
        setFormats(result.formats);
        setStatus('result');
      } else {
        setStatus('error');
        setError({
          title: 'Video Unavailable',
          message: result.error || 'The video could not be found or is unavailable.',
          type: 'unavailable',
        });
      }
    } catch {
      setStatus('error');
      setError({
        title: 'Processing Failed',
        message: 'An error occurred while analyzing the video. Please try again.',
        type: 'processing',
      });
    }
  }, []);

  // Store the downloaded blob for the final download trigger
  const downloadedBlobRef = useRef<Blob | null>(null);
  const downloadedFileNameRef = useRef<string>('');

  const handleFormatSelect = useCallback(async (format: VideoFormat) => {
    setSelectedFormat(format);
    setStatus('downloading');
    setDownloadProgress(0);
    cancelRef.current = false;
    downloadedBlobRef.current = null;
    downloadedFileNameRef.current = '';

    setDownloadState({
      progress: 0,
      fileName: '',
      quality: format.quality,
      format: format.format,
      fileSize: format.fileSize || 'Unknown',
    });

    if (!video) {
      setStatus('error');
      setError({
        title: 'Download Failed',
        message: 'No video selected. Please analyze a video first.',
        type: 'download',
      });
      return;
    }

    try {
      // Prepare download info (for display purposes)
      const downloadInfo = await prepareDownload(video.id, format.formatId);

      setDownloadState({
        progress: 0,
        fileName: downloadInfo.fileName,
        quality: downloadInfo.quality,
        format: downloadInfo.format,
        fileSize: downloadInfo.fileSize,
      });

      // Start simulated progress while the API request is in flight
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      let currentProgress = 0;

      progressInterval = setInterval(() => {
        if (cancelRef.current) {
          if (progressInterval) clearInterval(progressInterval);
          return;
        }
        // Simulate progress up to 90% while waiting for the API
        if (currentProgress < 90) {
          currentProgress += Math.random() * 8 + 2;
          currentProgress = Math.min(currentProgress, 90);
          setDownloadProgress(Math.round(currentProgress));
        }
      }, 300);

      // Call the real download API
      const result = await requestDownload({
        videoId: video.id,
        formatId: format.formatId,
        quality: format.quality,
        format: format.format,
      });

      // Stop the progress simulation
      if (progressInterval) clearInterval(progressInterval);

      if (cancelRef.current) {
        setStatus('result');
        return;
      }

      if (result.success && result.blob && result.fileName) {
        // Complete the progress
        setDownloadProgress(100);

        // Store the blob and filename for the final download trigger
        downloadedBlobRef.current = result.blob;
        downloadedFileNameRef.current = result.fileName;

        // Update download state with actual file info
        setDownloadState({
          progress: 100,
          fileName: result.fileName,
          quality: format.quality,
          format: format.format,
          fileSize: result.fileSize ? `${Math.round(result.fileSize / 1024 / 1024 * 10) / 10} MB` : format.fileSize || 'Unknown',
        });

        await sleep(500);
        setStatus('complete');
      } else {
        // Download failed - show the real error
        setStatus('error');
        const errorCode = result.error?.code || 'DOWNLOAD_FAILED';
        const errorMessage = result.error?.message || 'The video provider did not return a valid downloadable media resource.';

        // Map error codes to UI error types
        let errorType: 'invalid-url' | 'unavailable' | 'unsupported' | 'processing' | 'download' | 'network' = 'download';
        if (errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT') {
          errorType = 'network';
        } else if (errorCode === 'PROVIDER_NOT_CONFIGURED') {
          errorType = 'unsupported';
        } else if (errorCode === 'VIDEO_NOT_FOUND') {
          errorType = 'unavailable';
        }

        setError({
          title: 'Download Failed',
          message: errorMessage,
          type: errorType,
        });
      }
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during download.';
      setError({
        title: 'Download Failed',
        message,
        type: 'download',
      });
    }
  }, [video]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setStatus('result');
  }, []);

  const handleDownloadFile = useCallback(() => {
    // Trigger the actual browser download with the real media blob
    if (downloadedBlobRef.current && downloadedFileNameRef.current) {
      triggerBrowserDownload(downloadedBlobRef.current, downloadedFileNameRef.current);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastUrl) {
      handleAnalyze(lastUrl);
    }
  }, [lastUrl, handleAnalyze]);

  const features = [
    { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: 'Lightning Fast', description: 'Download videos in seconds with our optimized processing engine.' },
    { icon: <Shield className="w-5 h-5 text-green-400" />, title: 'Safe & Secure', description: 'No malware, no ads, no tracking. Your privacy is our priority.' },
    { icon: <Globe className="w-5 h-5 text-blue-400" />, title: 'All Formats', description: 'MP4, M4A, MP3 and more. Choose the format that works for you.' },
    { icon: <Clock className="w-5 h-5 text-purple-400" />, title: 'No Limits', description: 'Download unlimited videos without any restrictions or watermarks.' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 sm:pt-32 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              <Hero />
              <UrlInput onAnalyze={handleAnalyze} isLoading={status === 'loading'} initialValue={lastUrl} />
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {status === 'loading' && <LoadingSkeleton />}
            {status === 'error' && error && (
              <ErrorState
                title={error.title}
                message={error.message}
                type={error.type}
                onRetry={handleRetry}
              />
            )}
            {(status === 'result' || status === 'downloading' || status === 'complete') && video && (
              <div className="space-y-0">
                <VideoPreview video={video} />
                {status === 'result' && formats.length > 0 && (
                  <DownloadOptions
                    formats={formats}
                    onSelect={handleFormatSelect}
                    selectedFormatId={selectedFormat?.formatId}
                  />
                )}
                {(status === 'downloading' || status === 'complete') && (
                  <DownloadProgress
                    state={status === 'complete' ? 'complete' : downloadProgress === 0 ? 'preparing' : 'downloading'}
                    progress={downloadProgress}
                    downloadState={downloadState || undefined}
                    onCancel={handleCancel}
                    onDownload={handleDownloadFile}
                  />
                )}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <HowItWorks />

        {/* Features */}
        <section className="py-16 sm:py-24 bg-gray-900/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Why TubeFetch</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Speed & Simplicity</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Everything you need to download YouTube videos, nothing you don't.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map(feature => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="py-16 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-4">
                <Download className="w-3.5 h-3.5" />
                <span>Common Questions</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            </div>
            <FAQ items={[
              { question: 'Is TubeFetch free to use?', answer: 'Yes, TubeFetch is completely free. No registration or payment required.' },
              { question: 'What video qualities are available?', answer: 'TubeFetch supports 1080p, 720p, 480p, and 360p depending on the source video.' },
              { question: 'Can I download YouTube Shorts?', answer: 'Yes! TubeFetch fully supports YouTube Shorts with automatic detection.' },
            ]} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
