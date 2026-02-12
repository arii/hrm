// lib/structures/RingBuffer.ts

/**
 * A circular buffer with a fixed capacity.
 * Overwrites oldest items when full to bound memory usage.
 */
export class RingBuffer<T> {
  private buffer: Array<T>
  private capacity: number
  private head: number = 0
  private size: number = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
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
   * Reconstructs a linear array from the circular buffer,
   * ordered from oldest to newest.
   */
  public toArray(): T[] {
    if (this.size === 0) {
      return []
    }

    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size)
    }

    // When full, the head points to the oldest item.
    // We concatenate from head to end, then from start to head.
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)]
  }
}
