/**
 * @jest-environment node
 */
import { POST } from '@/app/api/internal/clear-token/route'
import { NextRequest } from 'next/server'
import * as csrf from '@/lib/csrf'
import fs from 'fs'

// Mock the CSRF module
jest.mock('@/lib/csrf')
const mockedCsrf = jest.mocked(csrf)

// Mock the 'fs' module
jest.mock('fs')
const mockedFs = jest.mocked(fs)

describe('API Route: /api/internal/clear-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedCsrf.validateCsrfToken.mockReturnValue(true) // Default to valid CSRF
    mockedFs.existsSync.mockReturnValue(true) // Default to file existing
  })

  it('should return 403 if CSRF token is invalid', async () => {
    // Arrange
    mockedCsrf.validateCsrfToken.mockReturnValue(false)
    const request = new NextRequest('http://localhost/api/internal/clear-token', {
      method: 'POST',
      headers: { 'x-csrf-token': 'invalid-token' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Invalid CSRF token')
  })

  it('should delete the token file and return 200 if it exists', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/internal/clear-token', {
      method: 'POST',
      headers: { 'x-csrf-token': 'valid-token' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.message).toBe('Token file cleared')
    expect(mockedFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('spotify_tokens.json'))
  })

  it('should return 200 without deleting if the token file does not exist', async () => {
    // Arrange
    mockedFs.existsSync.mockReturnValue(false)
    const request = new NextRequest('http://localhost/api/internal/clear-token', {
      method: 'POST',
      headers: { 'x-csrf-token': 'valid-token' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.message).toBe('Token file already cleared')
    expect(mockedFs.unlinkSync).not.toHaveBeenCalled()
  })

  it('should return 500 if there is an error deleting the file', async () => {
    // Arrange
    mockedFs.unlinkSync.mockImplementation(() => {
      throw new Error('Test FS error')
    })
    const request = new NextRequest('http://localhost/api/internal/clear-token', {
      method: 'POST',
      headers: { 'x-csrf-token': 'valid-token' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to clear token file')
  })
})
