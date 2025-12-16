import { jest } from '@jest/globals'

/**
 * Creates a type-safe, dynamic mock object.
 *
 * This function generates a proxy that automatically creates Jest mock functions
 * for any property that is accessed. This avoids the need to manually mock each
 * method of a class or interface, making tests cleaner and more maintainable.
 * The returned mock is fully type-safe.
 *
 * @template T The type of the object to mock.
 * @returns {jest.Mocked<T>} A proxy that acts as a type-safe mock.
 *
 * @example
 * const mockTimer = createDynamicMock<TabataTimer>();
 * mockTimer.handleCommand('START');
 * expect(mockTimer.handleCommand).toHaveBeenCalledWith('START');
 */
export const createDynamicMock = <T extends object>(): jest.Mocked<T> => {
  return new Proxy({} as jest.Mocked<T>, {
    get: (target, prop) => {
      const key = prop as keyof jest.Mocked<T>

      // If the property hasn't been mocked yet, create a mock function for it.
      if (!target[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(target as any)[key] = jest.fn()
      }

      return target[key]
    },
  })
}
