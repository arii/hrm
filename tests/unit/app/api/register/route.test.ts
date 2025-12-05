/**
 * @jest-environment node
 */
import { POST } from '@/app/api/register/route'
import { promises as fs } from 'fs'
import bcrypt from 'bcrypt'

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}))

describe('POST /api/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should register a new user successfully', async () => {
    ;(fs.readFile as jest.Mock).mockResolvedValue('[]')
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword')

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.message).toBe('User registered successfully')
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(
        [{ username: 'testuser', password: 'hashedpassword' }],
        null,
        2
      )
    )
  })

  it('should return 409 if user already exists', async () => {
    const existingUsers = [{ username: 'testuser', password: 'hashedpassword' }]
    ;(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingUsers))

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('User already exists')
  })

  it('should return 400 for invalid input', async () => {
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'te',
        password: '123',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid input')
  })

  it('should return 500 for internal server error', async () => {
    ;(fs.readFile as jest.Mock).mockRejectedValue(new Error('Disk is full'))

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Internal Server Error')
  })
})
