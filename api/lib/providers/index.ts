/**
 * Provider Factory
 * 
 * Creates the appropriate video provider based on configuration.
 */

import type { VideoProvider, ProviderConfig } from './types';
import { PipedProvider } from './piped';
import { InvidiousProvider } from './invidious';

export type ProviderType = 'piped' | 'invidious';

/**
 * Get the configured provider based on environment variables
 */
export function getProvider(): VideoProvider | null {
  const providerType = process.env.VIDEO_PROVIDER_TYPE as ProviderType | undefined;
  const providerUrl = process.env.VIDEO_PROVIDER_URL;
  const providerApiKey = process.env.VIDEO_PROVIDER_API_KEY;

  if (!providerType || !providerUrl) {
    return null;
  }

  const config: ProviderConfig = {
    apiUrl: providerUrl,
    apiKey: providerApiKey,
  };

  switch (providerType) {
    case 'piped':
      return new PipedProvider(config);
    case 'invidious':
      return new InvidiousProvider(config);
    default:
      console.error(`Unknown provider type: ${providerType}`);
      return null;
  }
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(): boolean {
  return !!process.env.VIDEO_PROVIDER_TYPE && !!process.env.VIDEO_PROVIDER_URL;
}

/**
 * Get provider configuration for diagnostics
 */
export function getProviderConfig(): { type: string; url: string; hasApiKey: boolean } | null {
  const type = process.env.VIDEO_PROVIDER_TYPE;
  const url = process.env.VIDEO_PROVIDER_URL;
  const apiKey = process.env.VIDEO_PROVIDER_API_KEY;

  if (!type || !url) {
    return null;
  }

  return {
    type,
    url,
    hasApiKey: !!apiKey,
  };
}
