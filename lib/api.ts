// lib/api.ts
export const callSpotifyApi = async (endpoint: string, options: RequestInit) => {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || 'Failed to execute command');
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};
