// This function can be used to wrap API calls to automatically add the CSRF token.
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  if (['POST', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (!token) {
      throw new Error('CSRF token not found');
    }
    options.headers = {
      ...options.headers,
      'x-csrf-token': token,
    };
  }

  return fetch(url, options);
}

// You can also create a helper to get the token, which can be used to set the meta tag.
export function getCsrfToken(req: Request): string | null {
    const cookie = req.headers.get('cookie');
    if (cookie) {
        const match = cookie.match(/csrf-token=([^;]+)/);
        if (match) {
            return match[1] ?? null;
        }
    }
    return null;
}
