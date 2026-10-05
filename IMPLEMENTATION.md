# TubeFetch Provider Integration - Implementation Summary

## Overview

Successfully implemented a provider abstraction layer for TubeFetch that supports **Piped** and **Invidious** as video download providers. This replaces the previous Cobalt-specific implementation with a more flexible, provider-agnostic architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                         │
│  React + TypeScript + Tailwind CSS                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Vercel Serverless Functions
              ┌──────────────────────────┐
              │  /api/analyze            │
              │  /api/download           │
              └──────────────────────────┘
                            ↓
              Provider Abstraction Layer
              ┌──────────────────────────┐
              │  getProvider()           │
              │  ├─ PipedProvider        │
              │  └─ InvidiousProvider    │
              └──────────────────────────┘
                            ↓
         ┌──────────────────────────────────────────┐
         │   External Provider Instance              │
         │   (Piped or Invidious)                    │
         │                                           │
         │   - Open-source YouTube frontends         │
         │   - REST API for metadata & streams       │
         │   - Direct media URLs                     │
         └──────────────────────────────────────────┘
```

## Files Created/Modified

### New Files

1. **`api/lib/providers/types.ts`**
   - Provider interface definitions
   - Type contracts for VideoProvider
   - Result types for analyze and download operations

2. **`api/lib/providers/piped.ts`**
   - Piped API provider implementation
   - Fetches metadata from `/streams/{videoId}`
   - Extracts video/audio stream URLs
   - Handles format selection

3. **`api/lib/providers/invidious.ts`**
   - Invidious API provider implementation
   - Fetches metadata from `/api/v1/videos/{videoId}`
   - Extracts formatStreams and adaptiveFormats
   - Handles format selection

4. **`api/lib/providers/index.ts`**
   - Provider factory
   - Selects provider based on `VIDEO_PROVIDER_TYPE`
   - Exports `getProvider()` and `isProviderConfigured()`

5. **`api/lib/security.ts`**
   - SSRF protection utilities
   - `isSafeUrl()` - Validates URLs against internal networks
   - `isUrlFromProvider()` - Verifies media URLs come from provider
   - `sanitizeUrl()` - Removes dangerous query parameters

6. **`tests/security.test.ts`**
   - Comprehensive tests for security utilities
   - Tests for localhost, private IPs, cloud metadata blocking
   - Tests for URL sanitization

### Modified Files

1. **`api/analyze.ts`**
   - Integrated provider abstraction
   - Falls back to YouTube oEmbed if no provider configured
   - Added SSRF protection
   - Returns structured errors

2. **`api/download.ts`**
   - Integrated provider abstraction
   - Validates media URLs with SSRF protection
   - Streams media from provider to client
   - Returns structured errors with proper codes

3. **`src/services/downloadService.ts`**
   - Updated error messages to reference `VIDEO_PROVIDER_URL`
   - Maintains frontend validation logic

4. **`tests/downloadService.test.ts`**
   - Updated test expectations for new error messages

5. **`.env.example`**
   - Documented new environment variables
   - Added examples for Piped and Invidious
   - Listed public instance URLs

## Environment Variables

### Required for Downloads

```bash
# Provider type: 'piped' or 'invidious'
VIDEO_PROVIDER_TYPE=piped

# Provider instance URL (no trailing slash)
VIDEO_PROVIDER_URL=https://pipedapi.kavin.rocks

# Optional: API key if instance requires authentication
VIDEO_PROVIDER_API_KEY=
```

### Provider Options

#### Piped
- Documentation: https://piped-docs.kavin.rocks/
- Public instances:
  - `https://pipedapi.kavin.rocks`
  - `https://pipedapi.adminforge.de`
  - `https://pipedapi.in.projectsegfau.lt`
- More: https://github.com/TeamPiped/Piped/wiki/Instances

#### Invidious
- Documentation: https://docs.invidious.io/api/
- Public instances:
  - `https://vid.puffyan.us`
  - `https://invidious.snopyta.org`
  - `https://yewtu.be`
- More: https://api.invidious.io/

## Error Codes

The implementation returns structured errors with these codes:

### Analysis Errors
- `INVALID_URL` - URL format is invalid or unsafe
- `VIDEO_UNAVAILABLE` - Video not found or removed
- `PROVIDER_UNAVAILABLE` - Cannot reach provider instance
- `PROVIDER_ERROR` - Provider returned an error
- `ANALYZE_FAILED` - General analysis failure

### Download Errors
- `INVALID_REQUEST` - Missing required parameters
- `INVALID_VIDEO_ID` - Video ID format is invalid
- `PROVIDER_NOT_CONFIGURED` - No provider configured
- `FORMAT_UNAVAILABLE` - Requested quality/format not available
- `UNSAFE_MEDIA_URL` - Media URL failed SSRF check
- `INVALID_MEDIA_TYPE` - Response is not actual media
- `MEDIA_TOO_SMALL` - Media is suspiciously small (<1KB)
- `EMPTY_MEDIA_RESPONSE` - Provider returned empty response
- `PROVIDER_TIMEOUT` - Provider did not respond in time
- `PROVIDER_UNREACHABLE` - Cannot connect to provider
- `DOWNLOAD_FAILED` - General download failure
- `STREAM_ERROR` - Error while streaming to client

## Security Features

### SSRF Protection

1. **URL Validation** (`isSafeUrl`)
   - Blocks localhost and loopback addresses
   - Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x)
   - Blocks link-local addresses (169.254.x)
   - Blocks cloud metadata endpoints (169.254.169.254)
   - Blocks .local and .internal domains
   - Only allows http/https protocols

2. **Provider URL Verification** (`isUrlFromProvider`)
   - Ensures media URLs come from the configured provider
   - Prevents redirection to malicious sites

3. **URL Sanitization** (`sanitizeUrl`)
   - Removes dangerous query parameters (redirect, callback, etc.)
   - Prevents parameter injection attacks

### Content Validation

1. **Content-Type Verification**
   - Only accepts video/*, audio/*, and application/octet-stream
   - Rejects HTML, JSON, or other non-media responses

2. **Size Validation**
   - Rejects responses smaller than 1KB
   - Prevents downloading error pages or empty files

3. **Filename Sanitization**
   - Removes special characters from filenames
   - Prevents header injection attacks
   - Limits filename length to 255 characters

## Provider Comparison

| Feature | Piped | Invidious |
|---------|-------|-----------|
| API Endpoint | `/streams/{id}` | `/api/v1/videos/{id}` |
| Video Formats | videoStreams[] | formatStreams[] |
| Audio Formats | audioStreams[] | adaptiveFormats[] |
| Direct URLs | ✅ Yes | ✅ Yes |
| Rate Limits | Varies by instance | Varies by instance |
| Self-Hostable | ✅ Yes | ✅ Yes |
| Documentation | Good | Excellent |

## Testing

### Test Coverage

1. **Security Tests** (`tests/security.test.ts`)
   - URL validation (localhost, private IPs, protocols)
   - Provider URL verification
   - URL sanitization

2. **Download Service Tests** (`tests/downloadService.test.ts`)
   - Input validation
   - HTTP status handling
   - Content-Type validation
   - Size validation
   - Error handling
   - Network errors

3. **Validation Tests** (`tests/validation.test.ts`)
   - YouTube URL parsing
   - Video ID extraction
   - Shorts detection

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/security.test.ts
```

## Deployment

### Vercel Configuration

1. **Environment Variables**
   - Set `VIDEO_PROVIDER_TYPE` to 'piped' or 'invidious'
   - Set `VIDEO_PROVIDER_URL` to your provider instance
   - Optionally set `VIDEO_PROVIDER_API_KEY` if required

2. **Serverless Functions**
   - `api/analyze.ts` - Handles video analysis
   - `api/download.ts` - Handles media downloads
   - Both run on Vercel's serverless infrastructure

3. **No Persistent Storage**
   - All operations are stateless
   - No local file system access required
   - Media is streamed directly from provider to client

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your provider configuration

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Limitations

### Provider Limitations

1. **Rate Limits**
   - Public instances may have rate limits
   - Heavy usage may result in temporary blocks
   - Consider self-hosting for production use

2. **Availability**
   - Public instances may go offline
   - Instance quality varies
   - Monitor instance status for production use

3. **YouTube Changes**
   - YouTube may change their API
   - Providers may break temporarily
   - Providers actively maintain compatibility

### Technical Limitations

1. **No Local Processing**
   - Cannot use ffmpeg on Vercel
   - Limited to formats provided by the provider
   - No custom transcoding

2. **CORS Restrictions**
   - Media URLs must be CORS-enabled
   - Some providers may have CORS restrictions
   - Streaming through serverless function handles this

3. **File Size**
   - Very large videos may timeout
   - Serverless functions have execution limits
   - Consider chunked downloads for large files

## Migration from Cobalt

If you were previously using the Cobalt implementation:

1. **Update Environment Variables**
   ```bash
   # Old (Cobalt)
   COBALT_API_URL=https://your-cobalt-instance.com
   COBALT_API_KEY=your-key

   # New (Piped/Invidious)
   VIDEO_PROVIDER_TYPE=piped
   VIDEO_PROVIDER_URL=https://pipedapi.kavin.rocks
   VIDEO_PROVIDER_API_KEY=  # Optional
   ```

2. **No Code Changes Required**
   - Frontend code remains unchanged
   - API routes maintain same interface
   - Only backend provider implementation changed

3. **Benefits**
   - More provider options
   - Better documentation
   - Active community maintenance
   - Direct media URLs (no tunneling)

## Future Enhancements

Potential improvements for future versions:

1. **Additional Providers**
   - Add support for more YouTube frontends
   - Support for other video platforms (Vimeo, Dailymotion)

2. **Provider Health Checks**
   - Automatic failover between instances
   - Health monitoring dashboard
   - Instance quality scoring

3. **Caching**
   - Cache video metadata
   - Reduce provider API calls
   - Improve response times

4. **Progress Tracking**
   - Real-time download progress
   - Estimated time remaining
   - Bandwidth usage tracking

## Conclusion

The provider abstraction layer successfully decouples TubeFetch from any specific video processing backend. The implementation:

✅ Supports multiple providers (Piped, Invidious)  
✅ Includes comprehensive SSRF protection  
✅ Returns structured, actionable error messages  
✅ Maintains backward compatibility with frontend  
✅ Includes thorough test coverage  
✅ Works within Vercel's serverless constraints  
✅ Provides clear migration path from Cobalt  

The system is production-ready and can be deployed immediately with a configured provider instance.
