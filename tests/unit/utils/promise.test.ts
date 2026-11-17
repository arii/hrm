/**
 * @jest-environment jsdom
 */
import { abortableSleep, cancellablePromise } from '@/utils/promise'

describe('cancellablePromise', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should resolve with the original promise', async () => {
    const promise = Promise.resolve('success')
    const result = await cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    })
    expect(result).toBe('success')
  })

  it('should reject with the original promise', async () => {
    const promise = Promise.reject('failure')
    await expect(
      cancellablePromise(promise, {
        timeoutMs: 1000,
        errorMessage: 'timeout',
      })
    ).rejects.toBe('failure')
  })

  it('should reject with a timeout error', async () => {
    const promise = new Promise(() => {})
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    })
    jest.advanceTimersByTime(1000)
    await expect(cancellable).rejects.toThrow('timeout')
  })

  it('should reject with an abort error', async () => {
    const promise = new Promise(() => {})
    const controller = new AbortController()
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
      signal: controller.signal,
    })
    controller.abort()
    await expect(cancellable).rejects.toThrow('Connection cancelled')
  })

  it('should not reject if the promise resolves before the timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('success'), 500)
    })
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    })
    jest.advanceTimersByTime(500)
    await expect(cancellable).resolves.toBe('success')
  })
})

describe('abortableSleep', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('resolves after the delay', async () => {
    const pending = abortableSleep(1000, new AbortController().signal)
    await jest.advanceTimersByTimeAsync(1000)
    await expect(pending).resolves.toBeUndefined()
  })

  it('rejects with an AbortError as soon as the signal aborts', async () => {
    const controller = new AbortController()
    const pending = abortableSleep(20000, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects at once on an already-aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(abortableSleep(1000, controller.signal)).rejects.toMatchObject(
      { name: 'AbortError' }
    )
  })
})
