import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log/warn during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
}

// Mock WebSocket for components that use it
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
})) as any

// Mock ResizeObserver for MUI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))
