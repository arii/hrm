// File: utils/urls.ts (URL Configuration Helper)
/**
 * Centralized URL configuration for development and production environments
 */

export const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  return process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://127.0.0.1:3000";
};

export const getWebSocketURL = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current host with appropriate protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  // Server-side fallback
  const baseUrl = getBaseURL();
  const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:';
  const host = baseUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}//${host}/ws`;
};

export const getAPIURL = (endpoint: string): string => {
  const baseUrl = getBaseURL();
  return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`;
};