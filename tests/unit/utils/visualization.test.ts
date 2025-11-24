
// tests/unit/utils/visualization.test.ts
import { getHrZoneProps, getTimerProps } from '../../../utils/visualization'
import { HR_ZONES } from '../../../utils/visualization'
import { TimerData } from '../../../types/websocket'

describe('utils/visualization', () => {
  describe('getHrZoneProps', () => {
    const maxHr = 200

    it('should return "No Data" when currentHr or maxHr is invalid', () => {
      expect(getHrZoneProps(0, maxHr)).toEqual({
        zone: 'No Data',
        percentage: 0,
        color: 'text-gray-400',
        progressColor: '#9ca3af',
        backgroundColor: '#9ca3af',
        bpm: 0,
      })
      expect(getHrZoneProps(100, 0)).toEqual({
        zone: 'No Data',
        percentage: 0,
        color: 'text-gray-400',
        progressColor: '#9ca3af',
        backgroundColor: '#9ca3af',
        bpm: 0,
      })
      // Jest considers NaN to not be equal to NaN without extra helpers, so this would fail.
      // A better way to test for NaN is to check a property that would be calculated from it.
      // In this case, getHrZoneProps handles the falsy value of NaN before this becomes an issue.
      expect(getHrZoneProps(NaN, maxHr)).toEqual({
        zone: 'No Data',
        percentage: 0,
        color: 'text-gray-400',
        progressColor: '#9ca3af',
        backgroundColor: '#9ca3af',
        bpm: 0,
      })
    })

    it('should correctly calculate the Warm-up zone', () => {
      const currentHr = maxHr * 0.55
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Warm-up')
      expect(props.percentage).toBe(55)
      expect(props.color).toBe(HR_ZONES[0].color)
    })

    it('should correctly calculate the Fat Burn zone', () => {
      const currentHr = maxHr * 0.65
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Fat Burn')
      expect(props.percentage).toBe(65)
      expect(props.color).toBe(HR_ZONES[1].color)
    })

    it('should correctly calculate the Cardio zone', () => {
      const currentHr = maxHr * 0.75
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Cardio')
      expect(props.percentage).toBe(75)
      expect(props.color).toBe(HR_ZONES[2].color)
    })

    it('should correctly calculate the Peak zone', () => {
      const currentHr = maxHr * 0.9
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Peak')
      expect(props.percentage).toBe(90)
      expect(props.color).toBe(HR_ZONES[3].color)
    })

    it('should correctly calculate the Max zone', () => {
      const currentHr = maxHr * 0.98
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Max')
      expect(props.percentage).toBe(98)
      expect(props.color).toBe(HR_ZONES[4].color)
    })

    it('should handle the lower boundary of Fat Burn zone', () => {
      const currentHr = maxHr * 0.6
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Fat Burn')
      expect(props.percentage).toBe(60)
    })

    it('should handle the lower boundary of Cardio zone', () => {
      const currentHr = maxHr * 0.7
      const props = getHrZoneProps(currentHr, maxHr)
      expect(props.zone).toBe('Cardio')
      expect(props.percentage).toBe(70)
    })

    it('should cap percentage at 100', () => {
        const currentHr = maxHr * 1.1;
        const props = getHrZoneProps(currentHr, maxHr);
        expect(props.percentage).toBe(100);
    });
  })

  describe('getTimerProps', () => {
    it('should return correct props for PREPARE phase', () => {
      const props = getTimerProps('PREPARE')
      expect(props.text).toBe('GET READY')
      expect(props.color).toBe('warning')
    })

    it('should return correct props for WORK phase', () => {
      const props = getTimerProps('WORK')
      expect(props.text).toBe('WORK')
      expect(props.color).toBe('error')
    })

    it('should return correct props for REST phase', () => {
      const props = getTimerProps('REST')
      expect(props.text).toBe('REST')
      expect(props.color).toBe('success')
    })

    it('should return correct props for RUNNING phase', () => {
        const props = getTimerProps('RUNNING')
        expect(props.text).toBe('RUNNING')
        expect(props.color).toBe('primary')
    })

    it('should return correct props for COOLDOWN phase', () => {
      const props = getTimerProps('COOLDOWN')
      expect(props.text).toBe('COOLDOWN')
      expect(props.color).toBe('info')
    })

    it('should return correct props for IDLE phase', () => {
      const props = getTimerProps('IDLE')
      expect(props.text).toBe('READY')
      expect(props.color).toBe('secondary')
    })

    it('should return IDLE props for undefined phase', () => {
      const props = getTimerProps(undefined as any)
      expect(props.text).toBe('READY')
      expect(props.color).toBe('secondary')
    })

    it('should return IDLE props for unknown phase', () => {
      const props = getTimerProps('UNKNOWN' as any)
      expect(props.text).toBe('READY')
      expect(props.color).toBe('secondary')
    })
  })
})
