// lib/__mocks__/storageManager.ts
export default {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  removeCookie: jest.fn(),
}
