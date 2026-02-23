/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useHeightInput } from '../../../hooks/useHeightInput'

describe('useHeightInput', () => {
  const onCommit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with derived state from initialCm', () => {
    const { result } = renderHook(() =>
      useHeightInput('180', 'METRIC', onCommit)
    )
    expect(result.current.displayHeight.cm).toBe('180')
  })

  it('should update transient state when updateHeight is called', () => {
    const { result } = renderHook(() =>
      useHeightInput('180', 'METRIC', onCommit)
    )

    act(() => {
      result.current.updateHeight({ cm: '185' })
    })

    expect(result.current.displayHeight.cm).toBe('185')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('should call onCommit and clear transient state on commitHeight if valid', () => {
    const { result } = renderHook(() =>
      useHeightInput('180', 'METRIC', onCommit)
    )

    act(() => {
      result.current.updateHeight({ cm: '185' })
    })

    act(() => {
      result.current.commitHeight()
    })

    expect(onCommit).toHaveBeenCalledWith(185)
    // After commit, transient state is null, so it should show initialCm (which is still 180 in this test because we didn't re-render with new initialCm)
    expect(result.current.displayHeight.cm).toBe('180')
  })

  it('should handle imperial units correctly', () => {
    const { result } = renderHook(() =>
      useHeightInput('175.26', 'IMPERIAL', onCommit)
    ) // 175.26 cm is 5ft 9in

    expect(result.current.displayHeight.feet).toBe('5')
    expect(result.current.displayHeight.inches).toBe('9')
  })

  it('should set error and NOT call onCommit if invalid', () => {
    const { result } = renderHook(() =>
      useHeightInput('180', 'METRIC', onCommit)
    )

    act(() => {
      result.current.updateHeight({ cm: '50' }) // Too short
    })

    act(() => {
      result.current.commitHeight()
    })

    expect(result.current.error).not.toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
    // Transient state is kept on error
    expect(result.current.displayHeight.cm).toBe('50')
  })
})
