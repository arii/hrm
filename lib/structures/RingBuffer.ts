// lib/structures/RingBuffer.ts

/**
 * A strictly typed, performance-optimized circular buffer.
 * Replaces unbounded arrays to prevent memory growth and OOM risks.
 */
export class RingBuffer<T> {
  private buffer: Array<T | null>
  private capacity: number
  private head: number = 0
  private size: number = 0

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be greater than 0')
    }
    this.capacity = capacity
    this.buffer = new Array(capacity).fill(null)
  }

  /**
   * Adds an item to the buffer, overwriting the oldest item if at capacity.
   */
  public push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.size < this.capacity) {
      this.size++
    }
  }

  /**
   * Clears the buffer.
   */
  public clear(): void {
    this.buffer.fill(null)
    this.head = 0
    this.size = 0
  }

  /**
   * Returns the current number of items in the buffer.
   */
  public getSize(): number {
    return this.size
  }

  /**
   * Returns the maximum capacity of the buffer.
   */
  public getCapacity(): number {
    return this.capacity
  }

  /**
   * Reconstructs a linear array from the circular buffer,
   * ordered from oldest to newest.
   */
  public toArray(): T[] {
    if (this.size === 0) {
      return []
    }

    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size) as T[]
    }

    // When full, the head points to the oldest item.
    // We concatenate from head to end, then from start to head.
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ] as T[]
  }
}
