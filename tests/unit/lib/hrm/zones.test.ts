/** @jest-environment jsdom */
import { calculateHrZone } from '@/lib/hrm/zones'

describe('calculateHrZone', () => {
  const maxHr = 200

  it('returns zone 1 for HR < 60%', () => {
    expect(calculateHrZone(119, maxHr)).toBe(1)
  })

  it('returns zone 2 for 60% <= HR < 70%', () => {
    expect(calculateHrZone(120, maxHr)).toBe(2)
    expect(calculateHrZone(139, maxHr)).toBe(2)
  })

  it('returns zone 3 for 70% <= HR < 80%', () => {
    expect(calculateHrZone(140, maxHr)).toBe(3)
    expect(calculateHrZone(159, maxHr)).toBe(3)
  })

  it('returns zone 4 for 80% <= HR < 90%', () => {
    expect(calculateHrZone(160, maxHr)).toBe(4)
    expect(calculateHrZone(179, maxHr)).toBe(4)
  })

  it('returns zone 5 for HR >= 90%', () => {
    expect(calculateHrZone(180, maxHr)).toBe(5)
  })

  it('returns zone 1 if maxHr is 0 or less to prevent division by zero', () => {
    expect(calculateHrZone(120, 0)).toBe(1)
    expect(calculateHrZone(120, -100)).toBe(1)
  })
})
