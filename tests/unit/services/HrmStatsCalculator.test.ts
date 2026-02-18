import { HrmStatsCalculator } from '@/services/HrmStatsCalculator'
import { HrmInternalStats } from '@/types/core'

describe('HrmStatsCalculator', () => {
  let calculator: HrmStatsCalculator

  beforeEach(() => {
    calculator = new HrmStatsCalculator()
  })

  it('should create initial stats', () => {
    const stats = calculator.createInitialStats()
    expect(stats).toEqual({
      count: 0,
      sumHr: 0,
      peakHr: 0,
      minHr: Infinity,
    })
  })

  it('should update stats correctly', () => {
    const stats = calculator.createInitialStats()
    calculator.updateStats(stats, 100)
    expect(stats.count).toBe(1)
    expect(stats.sumHr).toBe(100)
    expect(stats.peakHr).toBe(100)
    expect(stats.minHr).toBe(100)

    calculator.updateStats(stats, 150)
    expect(stats.count).toBe(2)
    expect(stats.sumHr).toBe(250)
    expect(stats.peakHr).toBe(150)
    expect(stats.minHr).toBe(100)

    calculator.updateStats(stats, 80)
    expect(stats.count).toBe(3)
    expect(stats.sumHr).toBe(330)
    expect(stats.peakHr).toBe(150)
    expect(stats.minHr).toBe(80)
  })

  it('should calculate derived stats correctly', () => {
    const stats: HrmInternalStats = {
      count: 3,
      sumHr: 300,
      peakHr: 150,
      minHr: 50,
    }
    const derived = calculator.getDerivedStats(stats)
    expect(derived).toEqual({
      avgHr: 100,
      peakHr: 150,
      minHr: 50,
    })
  })

  it('should return 0 for derived stats when no data', () => {
    const stats = calculator.createInitialStats()
    const derived = calculator.getDerivedStats(stats)
    expect(derived).toEqual({
      avgHr: 0,
      peakHr: 0,
      minHr: 0,
    })
  })

  it('should merge stats correctly', () => {
    const latestData = {
      clientId: 'test',
      value: 100,
      maxHr: 200,
      calories: 50,
    }
    const stats: HrmInternalStats = {
      count: 2,
      sumHr: 180,
      peakHr: 100,
      minHr: 80,
    }
    const merged = calculator.mergeStats(latestData, stats)
    expect(merged).toMatchObject({
      ...latestData,
      sessionStats: {
        avgHr: 90,
        peakHr: 100,
        minHr: 80,
      },
    })
  })
})
