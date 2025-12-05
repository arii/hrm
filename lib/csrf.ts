import { v4 as uuidv4 } from 'uuid';

// Helper function to get the secret and throw if it's not set.
// This centralizes the check and ensures it's only called when a crypto operation is needed.
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error('CSRF_SECRET environment variable is not set');
  }
  return secret;
}

async function sign(value: string): Promise<string> {
  const secret = getCsrfSecret();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return `${value}.${Buffer.from(signature).toString('base64url')}`;
}

async function verify(signedValue: string): Promise<string | false> {
  const secret = getCsrfSecret();
  const [value, signature] = signedValue.split('.');
  if (!value || !signature) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sig = Buffer.from(signature, 'base64url');
  const data = new TextEncoder().encode(value);
  const isValid = await crypto.subtle.verify('HMAC', key, sig, data);
  return isValid ? value : false;
}

export async function createCsrfToken(): Promise<{ token: string, signedToken: string }> {
  const token = uuidv4();
  const signedToken = await sign(token);
  return { token, signedToken };
}

export async function verifyCsrfToken(signedToken: string, headerToken: string): Promise<boolean> {
  const unsignedToken = await verify(signedToken);
  if (!unsignedToken) {
    return false;
  }
  return unsignedToken === headerToken;
}

export async function getUnsignedToken(signedToken: string): Promise<string | false> {
    return await verify(signedToken);
}
