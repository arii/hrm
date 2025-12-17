/**
 * @jest-environment jsdom
 */
import { cancellablePromise } from '@/utils/promise';

describe('cancellablePromise', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve with the original promise', async () => {
    const promise = Promise.resolve('success');
    const result = await cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    });
    expect(result).toBe('success');
  });

  it('should reject with the original promise', async () => {
    const promise = Promise.reject('failure');
    await expect(
      cancellablePromise(promise, {
        timeoutMs: 1000,
        errorMessage: 'timeout',
      })
    ).rejects.toBe('failure');
  });

  it('should reject with a timeout error', async () => {
    const promise = new Promise(() => {});
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    });
    jest.advanceTimersByTime(1000);
    await expect(cancellable).rejects.toThrow('timeout');
  });

  it('should reject with an abort error', async () => {
    const promise = new Promise(() => {});
    const controller = new AbortController();
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
      signal: controller.signal,
    });
    controller.abort();
    await expect(cancellable).rejects.toThrow('Connection cancelled');
  });

  it('should not reject if the promise resolves before the timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('success'), 500);
    });
    const cancellable = cancellablePromise(promise, {
      timeoutMs: 1000,
      errorMessage: 'timeout',
    });
    jest.advanceTimersByTime(500);
    await expect(cancellable).resolves.toBe('success');
  });
});
