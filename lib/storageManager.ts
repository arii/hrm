/**
 * @file Manages browser storage (localStorage and cookies) with environment checks and consistent JSON handling.
 * @exports StorageManager
 */

import Cookies from 'js-cookie'

/**
 * A unified interface for handling localStorage and cookies.
 */
class StorageManager {
  private isLocalStorageAvailable: boolean

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage()
  }

  /**
   * Checks if localStorage is available and enabled.
   * @returns {boolean} - True if localStorage is available, false otherwise.
   */
  private checkLocalStorage(): boolean {
    try {
      const testKey = '__test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch (_e) {
      return false
    }
  }

  /**
   * Reads a value from localStorage.
   * @param {string} key - The key of the item to read.
   * @returns {T | null} - The parsed JSON value, or null if the key doesn't exist or localStorage is unavailable.
   */
  get<T>(key: string): T | null {
    if (!this.isLocalStorageAvailable) {
      return null
    }

    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`Error reading from localStorage for key "${key}":`, error)
      return null
    }
  }

  /**
   * Writes a value to localStorage.
   * @param {string} key - The key of the item to write.
   * @param {T} value - The value to write. It will be JSON-stringified.
   */
  set<T>(key: string, value: T): void {
    if (!this.isLocalStorageAvailable) {
      return
    }

    try {
      const item = JSON.stringify(value)
      localStorage.setItem(key, item)
    } catch (error) {
      console.error(`Error writing to localStorage for key "${key}":`, error)
    }
  }

  /**
   * Removes a value from localStorage.
   * @param {string} key - The key of the item to remove.
   */
  remove(key: string): void {
    if (!this.isLocalStorageAvailable) {
      return
    }
    localStorage.removeItem(key)
  }

  /**
   * Reads a value from a cookie.
   * @param {string} key - The key of the cookie to read.
   * @returns {T | null} - The parsed JSON value, or null if the cookie doesn't exist.
   */
  getCookie<T>(key: string): T | null {
    try {
      const item = Cookies.get(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`Error reading from cookie for key "${key}":`, error)
      return null
    }
  }

  /**
   * Writes a value to a cookie.
   * @param {string} key - The key of the cookie to write.
   * @param {T} value - The value to write. It will be JSON-stringified.
   * @param {Cookies.CookieAttributes} [options] - Optional cookie attributes.
   */
  setCookie<T>(
    key: string,
    value: T,
    options?: Cookies.CookieAttributes
  ): void {
    try {
      const item = JSON.stringify(value)
      Cookies.set(key, item, options)
    } catch (error) {
      console.error(`Error writing to cookie for key "${key}":`, error)
    }
  }

  /**
   * Removes a cookie.
   * @param {string} key - The key of the cookie to remove.
   * @param {Cookies.CookieAttributes} [options] - Optional cookie attributes.
   */
  removeCookie(key: string, options?: Cookies.CookieAttributes): void {
    Cookies.remove(key, options)
  }
}

const storageManager = new StorageManager()
export default storageManager
