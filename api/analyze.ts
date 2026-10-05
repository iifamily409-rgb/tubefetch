import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/analyze
 * 
 * Optionally uses a configured video provider to fetch real video metadata.
 * If no provider is configured, returns { configured: false } so the client
 * can fall back to its built-in metadata resolution.
 * 
 * Request body:
 *   { url: string }
 * 
 * Returns:
 *   { success: true, video: {...}, formats: [...] } on success
 *   { success: false, error: { code, message } } on error
 *   { configured: false } when no provider is available
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are accepted.' },
    });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing or invalid URL.' },
    });
  }

  const providerUrl = process.env.VIDEO_PROVIDER_URL;
  const providerApiKey = process.env.VIDEO_PROVIDER_API_KEY;

  // If no provider is configured, let the client handle it with its built-in logic
  if (!providerUrl || !providerApiKey) {
    console.log('[analyze] DIAGNOSTIC: No provider configured, returning configured: false');
    return res.status(200).json({ configured: false });
  }

  console.log('[analyze] DIAGNOSTIC: Provider configured, analyzing URL');

  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Could not extract a valid video ID from the URL.' },
      });
    }

    // Call provider for metadata
    const providerResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerApiKey}`,
        'X-API-Key': providerApiKey,
      },
      body: JSON.stringify({
        action: 'analyze',
        videoId,
        url,
      }),
      signal: AbortSignal.timeout(15000),
    });

    console.log('[analyze] DIAGNOSTIC: Provider responded with status', providerResponse.status);

    if (!providerResponse.ok) {
      if (providerResponse.status === 404) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIDEO_NOT_FOUND', message: 'The video was not found.' },
        });
      }
      return res.status(502).json({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: `Provider returned HTTP ${providerResponse.status}.` },
      });
    }

    const data = await providerResponse.json() as Record<string, unknown>;

    // Validate that the provider returned expected fields
    if (!data.video || typeof data.video !== 'object') {
      return res.status(502).json({
        success: false,
        error: { code: 'INVALID_PROVIDER_RESPONSE', message: 'Provider did not return valid video data.' },
      });
    }

    return res.status(200).json({
      success: true,
      configured: true,
      video: data.video,
      formats: data.formats || [],
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[analyze] DIAGNOSTIC: Error:', errorMessage);

    if (errorMessage.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: { code: 'PROVIDER_TIMEOUT', message: 'The video provider did not respond in time.' },
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' },
    });
  }
}

function extractVideoId(url: string): string | null {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.trim().match(regex);
  return match ? match[5] : null;
}
