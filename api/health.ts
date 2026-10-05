import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider, isProviderConfigured, getProviderConfig } from './lib/providers';

/**
 * GET /api/health
 * 
 * Health check endpoint to verify provider configuration
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isConfigured = isProviderConfigured();
    const config = getProviderConfig();
    const provider = getProvider();

    let providerAvailable = false;
    if (provider) {
      providerAvailable = await provider.isAvailable();
    }

    return res.status(200).json({
      status: 'ok',
      provider: {
        configured: isConfigured,
        type: config?.type || null,
        url: config?.url || null,
        hasApiKey: config?.hasApiKey || false,
        available: providerAvailable,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
