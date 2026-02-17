interface RefreshTokenConfig {
  url: string
  clientId: string
  clientSecret: string
  refreshToken: string
  /**
   * 'basic' = Authorization: Basic base64(client_id:client_secret)
   * 'body' = client_id and client_secret in form body
   */
  authMethod: 'basic' | 'body'
}

/**
 * Shared helper to refresh OAuth tokens for different providers.
 * Supports Basic Auth (Spotify) and Body Params (Strava).
 */
export async function refreshOAuthToken({
  url,
  clientId,
  clientSecret,
  refreshToken,
  authMethod,
}: RefreshTokenConfig) {
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  if (authMethod === 'basic') {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
  } else {
    body.append('client_id', clientId)
    body.append('client_secret', clientSecret)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    // Simplified error handling as per review directives
    throw new Error(errorText)
  }

  return response.json()
}
