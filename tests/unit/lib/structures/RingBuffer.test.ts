// tests/unit/lib/structures/RingBuffer.test.ts
import { RingBuffer } from '../../../../lib/structures/RingBuffer'

describe('RingBuffer', () => {
  it('should initialize with given capacity', () => {
    const buffer = new RingBuffer<number>(5)
    expect(buffer.getCapacity()).toBe(5)
    expect(buffer.getSize()).toBe(0)
  })

  it('should throw error for invalid capacity', () => {
    expect(() => new RingBuffer<number>(0)).toThrow(
      'Capacity must be greater than 0'
    )
    expect(() => new RingBuffer<number>(-1)).toThrow(
      'Capacity must be greater than 0'
    )
  })

  it('should add items and report size correctly', () => {
    const buffer = new RingBuffer<number>(3)
    buffer.push(1)
    expect(buffer.getSize()).toBe(1)
    buffer.push(2)
    expect(buffer.getSize()).toBe(2)
    buffer.push(3)
    expect(buffer.getSize()).toBe(3)
    buffer.push(4)
    expect(buffer.getSize()).toBe(3)
  })

  it('should return items in correct order when not full', () => {
    const buffer = new RingBuffer<number>(5)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)
    expect(buffer.toArray()).toEqual([1, 2, 3])
  })

  it('should wrap around and overwrite oldest items when full', () => {
    const buffer = new RingBuffer<number>(3)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)
    expect(buffer.toArray()).toEqual([1, 2, 3])

    buffer.push(4) // Overwrites 1
    expect(buffer.toArray()).toEqual([2, 3, 4])

    buffer.push(5) // Overwrites 2
    expect(buffer.toArray()).toEqual([3, 4, 5])
  })

  it('should clear correctly', () => {
    const buffer = new RingBuffer<number>(3)
    buffer.push(1)
    buffer.push(2)
    buffer.clear()
    expect(buffer.getSize()).toBe(0)
    expect(buffer.toArray()).toEqual([])

    buffer.push(3)
    expect(buffer.toArray()).toEqual([3])
  })

  it('should handle complex wrap-around cases', () => {
    const buffer = new RingBuffer<number>(4)
    for (let i = 1; i <= 10; i++) {
      buffer.push(i)
    }
    // Items should be 7, 8, 9, 10
    expect(buffer.toArray()).toEqual([7, 8, 9, 10])
  })
})
