/**
 * @jest-environment node
 */
import { POST } from '@/app/api/internal/clear-token/route'
import { createMockRequestWithCsrf } from '@/tests/unit/test-helpers'
import fs from 'fs'

// Mock the 'fs' module
jest.mock('fs')
const mockedFs = jest.mocked(fs)

describe('API Route: /api/internal/clear-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedFs.existsSync.mockReturnValue(true) // Default to file existing
  })

  it('should return 403 if CSRF token is invalid', async () => {
    // Arrange
    // Create a plain object request without CSRF data
    const request = {
      headers: { get: () => null },
      cookies: { get: () => undefined },
    }

    // Act
    const response = await POST(request as any) // Cast to any to bypass type checking
    const data = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: CSRF token missing from headers')
  })

  it('should delete the token file and return 200 if it exists', async () => {
    // Arrange
    const request = createMockRequestWithCsrf()

    // Act
    const response = await POST(request as any)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.message).toBe('Token file cleared')
    expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('spotify_tokens.json')
    )
  })

  it('should return 200 without deleting if the token file does not exist', async () => {
    // Arrange
    mockedFs.existsSync.mockReturnValue(false)
    const request = createMockRequestWithCsrf()

    // Act
    const response = await POST(request as any)
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
    const request = createMockRequestWithCsrf()

    // Act
    const response = await POST(request as any)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to clear token file')
  })
})
