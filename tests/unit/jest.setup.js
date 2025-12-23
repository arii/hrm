import '@testing-library/jest-dom'

// This file provides a mock for the global `localStorage` object.
// In a Node.js environment (where Jest runs), `localStorage` is not defined.
// Many components and hooks use `localStorage` to persist user settings.
// This mock prevents tests from crashing when they access `localStorage`.

/**
 * @type {Storage}
 */
const localStorageMock = (function () {
  /** @type {Object<string, string>} */
  let store = {}
  return {
    getItem(key) {
      return store[key] || null
    },
    setItem(key, value) {
      store[key] = value.toString()
    },
    removeItem(key) {
      delete store[key]
    },
    clear() {
      store = {}
    },
    key(index) {
      return Object.keys(store)[index] || null
    },
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})
