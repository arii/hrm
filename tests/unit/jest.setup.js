/* eslint-disable no-undef */

// Mock the 'sharp' module for consistent image processing in tests
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  })),
}))

// Mock the IntersectionObserver for testing components that use it
const mockIntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }

  observe(target) {
    this.callback([{ isIntersecting: true, target }])
  }

  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = mockIntersectionObserver

// Mock the SpotifyApi to avoid actual API calls during tests
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockSDK = {
    // Mock other methods as needed for different test suites
  }
  return {
    SpotifyApi: {
      withClientCredentials: jest.fn(() => mockSDK),
    },
  }
})

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    headers: new Headers(),
  })
)
