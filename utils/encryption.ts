// File: utils/encryption.ts
import { scrypt, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const ivLength = 16;
const keyLength = 32;
const salt = 'a-very-salty-salt'; // In a real app, this should be unique per user
const algorithm = 'aes-256-gcm';

const scryptAsync = promisify(scrypt);

async function getKey(secret: string): Promise<Buffer> {
  return (await scryptAsync(secret, salt, keyLength)) as Buffer;
}

export async function encrypt(text: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export async function decrypt(encryptedText: string, secret: string): Promise<string> {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted text format');
  }

  const key = await getKey(secret);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedHex, 'hex'), decipher.final()]);
  return decrypted.toString('utf8');
}
