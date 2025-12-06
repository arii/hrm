import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // For GCM, 12 bytes is recommended
const SALT_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits
const PBKDF2_ITERATIONS = 100000

/**
 * A service for encrypting and decrypting data using AES-256-GCM.
 * It uses a key derived from the provided ENCRYPTION_KEY environment variable and a random salt.
 * The salt is stored with the encrypted data to be used for decryption.
 *
 * @see https://nodejs.org/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv_options
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
 */
export class EncryptionService {
  private key: Buffer

  constructor(base64Key: string) {
    if (!base64Key) {
      throw new Error('Encryption key is not set.')
    }
    this.key = Buffer.from(base64Key, 'base64')
    if (this.key.length !== KEY_LENGTH) {
      throw new Error(
        `Invalid encryption key length. Expected ${KEY_LENGTH} bytes, got ${this.key.length}.`
      )
    }
  }

  /**
   * Encrypts a plaintext string.
   * @param text The plaintext to encrypt.
   * @returns A string containing the iv, salt, tag, and encrypted data, all hex-encoded and concatenated.
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)

    const key = crypto.pbkdf2Sync(
      this.key,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    )

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return Buffer.concat([salt, iv, tag, encrypted]).toString('hex')
  }

  /**
   * Decrypts a hex-encoded string that was encrypted with the `encrypt` method.
   * @param encryptedText The hex-encoded encrypted string.
   * @returns The decrypted plaintext.
   */
  decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'hex')

    const salt = data.subarray(0, SALT_LENGTH)
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key = crypto.pbkdf2Sync(
      this.key,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    )

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return decrypted.toString()
  }
}
