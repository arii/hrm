// hooks/useSpotifyAuth.ts
import { useCallback } from 'react';
import sha256 from 'crypto-js/sha256';
import Base64 from 'crypto-js/enc-base64';
import Cookies from 'js-cookie';

const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-top-read',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
].join(' ');

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length: number): string => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Generates a code challenge from a code verifier.
 * @param  {string} codeVerifier The code verifier.
 * @return {string} The generated code challenge.
 */
const generateCodeChallenge = (codeVerifier: string): string => {
  return Base64.stringify(sha256(codeVerifier))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const useSpotifyAuth = () => {
  const login = useCallback(() => {
    const codeVerifier = generateRandomString(128);
    const state = generateRandomString(16);

    // Set cookies that will be accessible by the server-side callback
    Cookies.set('spotify_code_verifier', codeVerifier, { expires: 5 / 1440 }); // 5 minutes
    Cookies.set('spotify_auth_state', state, { expires: 5 / 1440 }); // 5 minutes

    const codeChallenge = generateCodeChallenge(codeVerifier);

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

    if (!clientId) {
      console.error('Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/spotify/callback`;

    const args = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SPOTIFY_SCOPES,
      redirect_uri: redirectUri,
      state: state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = 'https://accounts.spotify.com/authorize?' + args.toString();
  }, []);

  return { login };
};
