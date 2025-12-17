// tests/unit/jest.setup.jsdom.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom')

let store = {}
const localStorageMock = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => {
    store[key] = value.toString()
  },
  clear: () => {
    store = {}
  },
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
