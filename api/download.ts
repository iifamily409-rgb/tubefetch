import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/download
 * 
 * Downloads media using RapidAPI YouTube downloader service.
 * Implements the complete workflow:
 * 1. Create download request (POST /api/v2/request)
 * 2. Poll status until FINISH (GET /api/v2/request/status)
 * 3. Return download URL
 * 
 * Environment Variables:
 * - VIDEO_PROVIDER_TYPE: 'rapidapi' (required)
 * - RAPIDAPI_KEY: RapidAPI key (required)
 * - RAPIDAPI_HOST: RapidAPI host (optional)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are accepted.' },
    });
  }

  const { videoId, formatId, url } = req.body || {};

  // Validate request
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid videoId.' },
    });
  }

  if (!formatId || typeof formatId !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid formatId.' },
    });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid URL.' },
    });
  }

  // Validate videoId format (YouTube IDs are 11 chars)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_VIDEO_ID', message: 'The video ID format is invalid.' },
    });
  }

  // Check provider configuration
  const providerType = process.env.VIDEO_PROVIDER_TYPE;
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'youtube-mp4-mp3-downloader.p.rapidapi.com';

  if (providerType !== 'rapidapi' || !rapidApiKey) {
    console.log('[download] DIAGNOSTIC: RapidAPI not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Download provider is not configured. Set VIDEO_PROVIDER_TYPE=rapidapi and RAPIDAPI_KEY environment variables.',
      },
    });
  }

  console.log('[download] DIAGNOSTIC: Request received', { videoId, formatId });

  try {
    // Step 1: Create download request
    console.log('[download] DIAGNOSTIC: Creating download request');

    const requestResponse = await fetch(`https://${rapidApiHost}/api/v2/request`, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: videoId }),
    });

    if (!requestResponse.ok) {
      console.log('[download] DIAGNOSTIC: Request creation failed:', requestResponse.status);
      return res.status(502).json({
        success: false,
        error: { code: 'REQUEST_FAILED', message: `Failed to create download request (HTTP ${requestResponse.status})` },
      });
    }

    const requestData = await requestResponse.json() as any;
    const uid = requestData.uid;

    if (!uid) {
      console.log('[download] DIAGNOSTIC: No UID in response');
      return res.status(502).json({
        success: false,
        error: { code: 'INVALID_RESPONSE', message: 'Download request did not return a valid UID.' },
      });
    }

    console.log('[download] DIAGNOSTIC: Download request created, UID:', uid);

    // Step 2: Poll status until FINISH (with timeout)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    const pollInterval = 2000; // 2 seconds
    let attempts = 0;
    let downloadUrl: string | null = null;
    let fileSize: number | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log('[download] DIAGNOSTIC: Polling status, attempt', attempts);

      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`https://${rapidApiHost}/api/v2/request/status?uid=${uid}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': rapidApiHost,
        },
      });

      if (!statusResponse.ok) {
        console.log('[download] DIAGNOSTIC: Status check failed:', statusResponse.status);
        continue;
      }

      const statusData = await statusResponse.json() as any;
      const state = statusData.state;

      console.log('[download] DIAGNOSTIC: Status:', state);

      if (state === 'FINISH') {
        downloadUrl = statusData.downloadUrl;
        fileSize = statusData.fileSize;
        break;
      }

      if (state === 'ERROR' || state === 'FAILED') {
        console.log('[download] DIAGNOSTIC: Conversion failed');
        return res.status(502).json({
          success: false,
          error: { code: 'CONVERSION_FAILED', message: 'Video conversion failed. Please try again.' },
        });
      }

      // Continue polling for IN_QUEUE, PROCESSING, etc.
    }

    if (!downloadUrl) {
      console.log('[download] DIAGNOSTIC: Timeout waiting for download');
      return res.status(504).json({
        success: false,
        error: { code: 'TIMEOUT', message: 'Download preparation timed out. Please try again.' },
      });
    }

    console.log('[download] DIAGNOSTIC: Download ready', { downloadUrl, fileSize });

    // Step 3: Return download URL
    const fileName = generateFileName(videoId, formatId);
    const fileSizeMB = fileSize ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB` : '—';

    return res.status(200).json({
      success: true,
      downloadUrl,
      fileName,
      fileSize: fileSizeMB,
      fileSizeBytes: fileSize,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[download] DIAGNOSTIC: Unhandled error:', errorMessage);

    if (res.headersSent) {
      res.end();
      return;
    }

    return res.status(500).json({
      success: false,
      error: { code: 'DOWNLOAD_FAILED', message: 'An internal error occurred while processing the download.' },
    });
  }
}

function generateFileName(videoId: string, formatId: string): string {
  const ext = formatId.startsWith('audio') ? 'mp3' : 'mp4';
  return `youtube_${videoId}.${ext}`;
}
