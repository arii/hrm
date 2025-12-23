// File: tests/unit/jest.setup.js
require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Mock TextEncoder and TextDecoder for jose
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

if (typeof window !== 'undefined') {
  // Mock the ResizeObserver
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserver
}
