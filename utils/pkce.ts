// File: utils/pkce.ts
/**
 * Utility functions for Proof Key for Code Exchange (PKCE)
 * as required by OAuth 2.0 for public clients.
 */

import crypto from 'crypto';

/**
 * Generates a cryptographically random string for the code_verifier.
 * @returns {string} A URL-safe base64-encoded string.
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Derives the code_challenge from the code_verifier.
 * @param {string} codeVerifier - The code_verifier string.
 * @returns {string} A URL-safe base64-encoded SHA256 hash of the code_verifier.
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return base64URLEncode(sha256(codeVerifier));
}

function sha256(plain: string): Buffer {
  return crypto.createHash('sha256').update(plain).digest();
}

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
