// File: utils/urls.ts (URL Configuration Helper)
/**
 * Centralized URL configuration for development and production environments
 */

export const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }

  // Server-side: use environment variable or default
  return (
    process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://127.0.0.1:3000'
  )
}

export const getWebSocketURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current host with appropriate protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  // Server-side fallback
  const baseUrl = getBaseURL()
  const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
  const host = baseUrl.replace(/^https?:\/\//, '')
  return `${wsProtocol}//${host}/ws`
}

export const getAPIURL = (endpoint: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin (allows localhost access in production)
    return `${window.location.origin}/api/${endpoint.replace(/^\//, '')}`
  }

  // Server-side: use environment variable for internal API calls
  const baseUrl = getBaseURL()
  return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`
}

export const getSpotifyCallbackURL = (): string => {
  return (
    process.env.SPOTIFY_CALLBACK_URL ||
    `${getBaseURL()}/api/auth/callback/spotify`
  )
}

/**
 * Converts a Google Doc/Sheet URL to an embeddable URL.
 * Replaces /edit with /embed and ensures ?embedded=true is present.
 */
export const convertGoogleDocUrl = (url: string): string => {
  if (!url.includes('docs.google.com')) {
    return url
  }

  let newUrl = url
  // Use a regex to replace /edit with /embed, preserving anything before it.
  // We'll strip anything after /edit and re-append necessary query params.
  if (newUrl.includes('/edit')) {
    newUrl = newUrl.split('/edit')[0] + '/embed'
  }

  // Ensure ?embedded=true is present
  if (!newUrl.includes('?embedded=true')) {
      // If there are other query params, append &embedded=true, otherwise ?embedded=true
      // However, for Google Docs embed, usually it is just /embed?embedded=true or just /embed (which might work but ?embedded=true is safer).
      // Simpler approach: if we stripped params when removing /edit, we just add ?embedded=true.
      // But what if it was passed as /embed without query params?

      // Let's handle the existing query params if any.
      // If the url has '?', append '&embedded=true'
      if (newUrl.includes('?')) {
           newUrl += '&embedded=true'
      } else {
           newUrl += '?embedded=true'
      }
  }

  // Special case: If I stripped everything after /edit, I lost query params.
  // My previous logic: `newUrl = newUrl.split('/edit')[0] + '/embed'` drops query params.
  // This is often desired because /edit params (like usp=sharing) might not apply to /embed.
  // But if the input was `/embed` it keeps params.

  // Let's refine the logic to match the test case exactly.
  // "converts a standard /edit URL with query params to an /embed URL"
  // Expected: 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'
  // Input: 'https://docs.google.com/document/d/DOC_ID/edit?usp=sharing'

  // So stripping params after /edit IS the desired behavior for the test case.

  // What about: "preserves an existing /embed URL and ensures query param is present"
  // Input: 'https://docs.google.com/document/d/DOC_ID/embed'
  // Expected: 'https://docs.google.com/document/d/DOC_ID/embed?embedded=true'

  return newUrl
}
