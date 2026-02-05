/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import Cookies from 'js-cookie'
import useCookie from '../../../hooks/useCookie'

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
}))

const TEST_KEY = 'test-cookie'
const INITIAL_VALUE = { foo: 'bar' }
const UPDATED_VALUE = { foo: 'baz' }

describe('useCookie', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return the initial value when the cookie is empty', () => {
    ;(Cookies.get as jest.Mock).mockReturnValue(undefined)
    const { result } = renderHook(() => useCookie(TEST_KEY, INITIAL_VALUE))
    expect(result.current[0]).toEqual(INITIAL_VALUE)
  })

  it('should load a valid value from the cookie', () => {
    ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(UPDATED_VALUE))
    const { result } = renderHook(() => useCookie(TEST_KEY, INITIAL_VALUE))
    expect(result.current[0]).toEqual(UPDATED_VALUE)
  })

  it('should update the cookie when setValue is called', () => {
    const { result } = renderHook(() => useCookie(TEST_KEY, INITIAL_VALUE))

    act(() => {
      const [, setValue] = result.current
      setValue(UPDATED_VALUE)
    })

    expect(result.current[0]).toEqual(UPDATED_VALUE)
    expect(Cookies.set).toHaveBeenCalledWith(
      TEST_KEY,
      JSON.stringify(UPDATED_VALUE),
      expect.any(Object)
    )
  })

  it('should handle malformed JSON in the cookie and return the initial value', () => {
    // Spy on console.error to suppress the expected error message
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      ;(Cookies.get as jest.Mock).mockReturnValue('{ not json }')
      const { result } = renderHook(() => useCookie(TEST_KEY, INITIAL_VALUE))
      expect(result.current[0]).toEqual(INITIAL_VALUE)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('should handle functional updates', () => {
    const { result } = renderHook(() => useCookie(TEST_KEY, INITIAL_VALUE))

    act(() => {
      const [, setValue] = result.current
      setValue((prev) => ({ ...prev, foo: 'functional' }))
    })

    const expectedValue = { foo: 'functional' }
    expect(result.current[0]).toEqual(expectedValue)
    expect(Cookies.set).toHaveBeenCalledWith(
      TEST_KEY,
      JSON.stringify(expectedValue),
      expect.any(Object)
    )
  })
})
