/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useHrmTileData.test.ts
import { renderHook } from '@testing-library/react'
import useHrmTileData from '@/hooks/useHrmTileData'
import { HrmData, ActiveAlert } from '@/types/websocket'

describe('useHrmTileData', () => {
  it('should filter out users with placeholder names', () => {
    const hrmData: HrmData[] = [
      { clientId: '1', name: 'User One', heartRate: 120 },
      { clientId: '2', name: 'New User', heartRate: 130 },
    ]
    const { result } = renderHook(() => useHrmTileData(hrmData, []))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('User One')
  })

  it('should filter out users with null names', () => {
    const hrmData: HrmData[] = [
      { clientId: '1', name: 'User One', heartRate: 120 },
      { clientId: '2', name: null, heartRate: 130 },
    ]
    const { result } = renderHook(() => useHrmTileData(hrmData, []))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('User One')
  })

  it('should add alert information to the user data', () => {
    const hrmData: HrmData[] = [
      { clientId: '1', name: 'User One', heartRate: 120 },
    ]
    const activeAlerts: ActiveAlert[] = [
      {
        clientId: '1',
        code: 'BAD_PLACEMENT',
        message: 'Check placement',
        severity: 'warning',
        timestamp: Date.now(),
      },
    ]
    const { result } = renderHook(() => useHrmTileData(hrmData, activeAlerts))
    expect(result.current[0].isAlerting).toBe(true)
    expect(result.current[0].alertMessage).toBe('Check placement')
  })

  it('should not add alert information if there is no matching alert', () => {
    const hrmData: HrmData[] = [
      { clientId: '1', name: 'User One', heartRate: 120 },
    ]
    const activeAlerts: ActiveAlert[] = [
      {
        clientId: '2',
        code: 'BAD_PLACEMENT',
        message: 'Check placement',
        severity: 'warning',
        timestamp: Date.now(),
      },
    ]
    const { result } = renderHook(() => useHrmTileData(hrmData, activeAlerts))
    expect(result.current[0].isAlerting).toBe(false)
    expect(result.current[0].alertMessage).toBeUndefined()
  })
})
