/**
 * SSRF (Server-Side Request Forgery) Protection Utilities
 * 
 * These utilities help prevent SSRF attacks by validating URLs
 * before making server-side requests.
 */

/**
 * Check if a URL is safe to fetch from the server
 * Prevents access to internal networks, localhost, and private IPs
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Block private IP ranges
    if (isPrivateIP(hostname)) {
      return false;
    }

    // Block cloud metadata endpoints
    if (
      hostname === '169.254.169.254' || // AWS/GCP metadata
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(hostname: string): boolean {
  // Check if it's an IP address
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    
    // 10.0.0.0/8
    if (a === 10) return true;
    
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
    
    // 0.0.0.0/8
    if (a === 0) return true;
  }

  // Check for IPv6 private addresses
  if (hostname.includes(':')) {
    const lower = hostname.toLowerCase();
    if (
      lower.startsWith('fc') || // Unique local address
      lower.startsWith('fd') || // Unique local address
      lower.startsWith('fe80') // Link-local address
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validate that a URL belongs to an expected domain
 * Useful for ensuring media URLs come from the configured provider
 */
export function isUrlFromProvider(url: string, providerUrl: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const parsedProvider = new URL(providerUrl);
    
    // Check if the URL's hostname matches or is a subdomain of the provider
    const urlHost = parsedUrl.hostname.toLowerCase();
    const providerHost = parsedProvider.hostname.toLowerCase();
    
    return urlHost === providerHost || urlHost.endsWith(`.${providerHost}`);
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL by removing potentially dangerous parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove potentially dangerous query parameters
    const dangerousParams = ['redirect', 'callback', 'return', 'next', 'url', 'goto'];
    
    for (const param of dangerousParams) {
      parsed.searchParams.delete(param);
    }
    
    return parsed.toString();
  } catch {
    return url;
  }
}
