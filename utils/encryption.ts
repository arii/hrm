import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV size
const SALT_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 }

export class EncryptionService {
  constructor(private secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('A secret of at least 32 characters is required.')
    }
  }

  private async getKey(salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        this.secret,
        salt,
        KEY_LENGTH,
        SCRYPT_PARAMS,
        (err, derivedKey) => {
          if (err) reject(err)
          resolve(derivedKey)
        }
      )
    })
  }

  async encrypt(plaintext: string): Promise<string> {
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = await this.getKey(salt)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const tag = cipher.getAuthTag()

    return Buffer.concat([salt, iv, tag, encrypted]).toString('hex')
  }

  async decrypt(ciphertext: string): Promise<string> {
    const buffer = Buffer.from(ciphertext, 'hex')
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key = await this.getKey(salt)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8')
  }
}
