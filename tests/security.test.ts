import { describe, it, expect } from 'vitest';
import { isSafeUrl, isUrlFromProvider, sanitizeUrl } from '../api/lib/security';

describe('Security Utilities', () => {
  describe('isSafeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('https://pipedapi.kavin.rocks')).toBe(true);
      expect(isSafeUrl('https://vid.puffyan.us/api/v1/videos/test')).toBe(true);
    });

    it('should allow valid HTTP URLs', () => {
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('should block localhost', () => {
      expect(isSafeUrl('http://localhost')).toBe(false);
      expect(isSafeUrl('http://localhost:8080')).toBe(false);
      expect(isSafeUrl('https://localhost')).toBe(false);
    });

    it('should block loopback addresses', () => {
      expect(isSafeUrl('http://127.0.0.1')).toBe(false);
      expect(isSafeUrl('http://127.0.0.1:3000')).toBe(false);
      expect(isSafeUrl('https://127.0.0.1')).toBe(false);
    });

    it('should block private IP ranges', () => {
      // 10.0.0.0/8
      expect(isSafeUrl('http://10.0.0.1')).toBe(false);
      expect(isSafeUrl('http://10.255.255.255')).toBe(false);

      // 172.16.0.0/12
      expect(isSafeUrl('http://172.16.0.1')).toBe(false);
      expect(isSafeUrl('http://172.31.255.255')).toBe(false);

      // 192.168.0.0/16
      expect(isSafeUrl('http://192.168.1.1')).toBe(false);
      expect(isSafeUrl('http://192.168.255.255')).toBe(false);
    });

    it('should block link-local addresses', () => {
      expect(isSafeUrl('http://169.254.169.254')).toBe(false); // AWS metadata
      expect(isSafeUrl('http://169.254.1.1')).toBe(false);
    });

    it('should block cloud metadata endpoints', () => {
      expect(isSafeUrl('http://metadata.google.internal')).toBe(false);
      expect(isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('should block .local domains', () => {
      expect(isSafeUrl('http://myserver.local')).toBe(false);
      expect(isSafeUrl('http://test.local:8080')).toBe(false);
    });

    it('should block non-HTTP protocols', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('ftp://example.com')).toBe(false);
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('http://')).toBe(false);
    });
  });

  describe('isUrlFromProvider', () => {
    it('should match exact domain', () => {
      expect(isUrlFromProvider('https://pipedapi.kavin.rocks/streams/test', 'https://pipedapi.kavin.rocks')).toBe(true);
    });

    it('should match subdomains', () => {
      expect(isUrlFromProvider('https://api.piped.video/streams/test', 'https://piped.video')).toBe(true);
    });

    it('should reject different domains', () => {
      expect(isUrlFromProvider('https://evil.com/malware', 'https://pipedapi.kavin.rocks')).toBe(false);
    });

    it('should handle URLs with paths', () => {
      expect(isUrlFromProvider('https://pipedapi.kavin.rocks/streams/test123', 'https://pipedapi.kavin.rocks')).toBe(true);
    });

    it('should handle invalid URLs', () => {
      expect(isUrlFromProvider('not-a-url', 'https://example.com')).toBe(false);
      expect(isUrlFromProvider('https://example.com', 'not-a-url')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should remove dangerous query parameters', () => {
      const url = 'https://example.com/page?redirect=http://evil.com&safe=value';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).not.toContain('redirect=');
      expect(sanitized).toContain('safe=value');
    });

    it('should remove callback parameters', () => {
      const url = 'https://example.com/api?callback=http://evil.com&data=test';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).not.toContain('callback=');
      expect(sanitized).toContain('data=test');
    });

    it('should preserve safe URLs', () => {
      const url = 'https://example.com/page?foo=bar&baz=qux';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should handle URLs without query parameters', () => {
      const url = 'https://example.com/page';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should handle invalid URLs', () => {
      const url = 'not-a-url';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });
  });
});
