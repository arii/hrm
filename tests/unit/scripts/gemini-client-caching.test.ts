// scripts/gemini-client-caching.test.ts
import {
  GoogleAICacheManager,
  GoogleAIFileManager,
} from '@google/generative-ai/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { main } from '../../scripts/gemini-client' // Adjust this import to your actual file structure
import path from 'path'
import fs from 'fs/promises'

// Mock the server-side SDKs
jest.mock('@google/generative-ai/server', () => ({
  GoogleAIFileManager: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn((filePath) =>
      Promise.resolve({
        file: {
          uri: `mock-uri-for-${path.basename(filePath)}`,
          mimeType: 'text/plain',
        },
      })
    ),
  })),
  GoogleAICacheManager: jest.fn().mockImplementation(() => ({
    create: jest.fn((options) =>
      Promise.resolve({
        name: `mock-cache-name-${options.displayName}`,
      })
    ),
  })),
}))

// Mock GoogleGenerativeAI and its methods
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModelFromCachedContent: jest.fn(() => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Cached model response',
        },
      }),
    })),
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Standard model response',
        },
      }),
    })),
  })),
}))

describe('Gemini Client Caching Logic', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset mocks and environment before each test
    jest.clearAllMocks()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  it('should use the standard text-based flow when --use-cache is not provided', async () => {
    // Mock argv to simulate no --use-cache flag
    process.argv = [
      'node',
      'gemini-client.ts',
      '--task',
      'test task',
      '--context',
      'file1.txt',
    ]

    await main()

    // Verify that cache-related functions were NOT called
    expect(GoogleAIFileManager).not.toHaveBeenCalled()
    expect(GoogleAICacheManager).not.toHaveBeenCalled()
  })

  it('should attempt to create and use a cache when --use-cache is provided', async () => {
    // Mock argv to simulate the --use-cache flag
    process.argv = [
      'node',
      'gemini-client.ts',
      '--task',
      'test task',
      '--context',
      'file1.txt,file2.txt',
      '--use-cache',
    ]

    // Mock readFile to prevent actual file system access
    jest.spyOn(fs, 'readFile').mockResolvedValue('file content')

    await main()

    // Verify that the file manager was called for each context file
    const fileManagerInstance = (GoogleAIFileManager as jest.Mock).mock
      .instances[0]
    expect(fileManagerInstance.uploadFile).toHaveBeenCalledTimes(2)
    expect(fileManagerInstance.uploadFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'file1.txt'),
      expect.any(Object)
    )
    expect(fileManagerInstance.uploadFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'file2.txt'),
      expect.any(Object)
    )

    // Verify that the cache manager was called to create a cache
    const cacheManagerInstance = (GoogleAICacheManager as jest.Mock).mock
      .instances[0]
    expect(cacheManagerInstance.create).toHaveBeenCalledTimes(1)
  })

  it('should use the configurable TTL from environment variables if set', async () => {
    process.env.GEMINI_CACHE_TTL_SECONDS = '7200' // 2 hours
    process.argv = [
      'node',
      'gemini-client.ts',
      '--task',
      'test task',
      '--context',
      'file1.txt',
      '--use-cache',
    ]
    jest.spyOn(fs, 'readFile').mockResolvedValue('file content')

    await main()

    const cacheManagerInstance = (GoogleAICacheManager as jest.Mock).mock
      .instances[0]
    expect(cacheManagerInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ttlSeconds: 7200,
      })
    )
  })

  it('should fall back to the default TTL if the environment variable is invalid', async () => {
    process.env.GEMINI_CACHE_TTL_SECONDS = 'invalid-ttl'
    process.argv = [
      'node',
      'gemini-client.ts',
      '--task',
      'test task',
      '--context',
      'file1.txt',
      '--use-cache',
    ]
    jest.spyOn(fs, 'readFile').mockResolvedValue('file content')

    await main()

    const cacheManagerInstance = (GoogleAICacheManager as jest.Mock).mock
      .instances[0]
    expect(cacheManagerInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ttlSeconds: 3600, // The default value
      })
    )
  })

  it('should fall back to standard text context if cache creation fails', async () => {
    // Mock cache creation to reject
    const cacheManagerInstance =
      (GoogleAICacheManager as jest.Mock).mock.instances[0] ||
      new GoogleAICacheManager()
    ;(cacheManagerInstance.create as jest.Mock).mockRejectedValue(
      new Error('Cache creation failed')
    )

    process.argv = [
      'node',
      'gemini-client.ts',
      '--task',
      'test task',
      '--context',
      'file1.txt',
      '--use-cache',
    ]
    jest.spyOn(fs, 'readFile').mockResolvedValue('file content')

    // Spy on console.warn to check for the fallback message
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})

    await main()

    // Verify the warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to initialize cache. Falling back to standard text context.'
      )
    )

    // Verify that the standard model was called (and not the cached one)
    const genAIInstance = (GoogleGenerativeAI as jest.Mock).mock.instances[0]
    expect(genAIInstance.getGenerativeModel).toHaveBeenCalled()
    expect(
      genAIInstance.getGenerativeModelFromCachedContent
    ).not.toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })
})
