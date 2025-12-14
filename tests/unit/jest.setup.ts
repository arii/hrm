// tests/unit/jest.setup.ts
import '@testing-library/jest-dom'

// Polyfill for TextEncoder and TextDecoder which are used by some libraries
// but are not available in the JSDOM environment.
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock for window.matchMedia, which is not implemented in JSDOM.
// This is often used by UI libraries for responsive design.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
