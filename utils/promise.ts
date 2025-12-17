/**
 * @file utils/promise.ts
 * @description This file contains promise-related utility functions.
 */

/**
 * @function cancellablePromise
 * @description Wraps a promise to make it cancellable via an AbortSignal and a timeout.
 * Rejects with a custom timeout error, or an AbortError if the signal is aborted.
 * @template T
 * @param {Promise<T>} promise - The promise to make cancellable.
 * @param {object} options - Configuration for cancellation.
 * @param {number} options.timeoutMs - The timeout duration in milliseconds.
 * @param {string} options.timeoutMsg - The error message to use if the timeout is reached.
 * @param {AbortSignal} [options.signal] - An optional AbortSignal to externally cancel the promise.
 * @returns {Promise<T>} A promise that resolves/rejects with the original promise, or rejects on timeout/abort.
 */
export const cancellablePromise = <T>(
  promise: Promise<T>,
  options: {
    timeoutMs: number
    timeoutMsg: string
    signal?: AbortSignal
  }
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const { timeoutMs, signal, timeoutMsg } = options

    const timeoutError = new Error(timeoutMsg)
    const abortError = new DOMException('Connection cancelled', 'AbortError')

    let timer: NodeJS.Timeout | undefined

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
      }
      signal?.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      cleanup()
      reject(abortError)
    }

    if (signal?.aborted) {
      return reject(abortError)
    }
    signal?.addEventListener('abort', onAbort)

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        cleanup()
        reject(timeoutError)
      }, timeoutMs)
    }

    promise.then(
      (res) => {
        cleanup()
        resolve(res)
      },
      (err) => {
        cleanup()
        reject(err)
      }
    )
  })
}
