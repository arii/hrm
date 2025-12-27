// lib/repositories/BaseRepository.ts

/**
 * A generic base repository for handling common CRUD operations.
 *
 * @template T The entity type.
 * @template K The type of the entity's identifier.
 */
export class BaseRepository<T, K> {
  protected readonly data = new Map<K, T>()
  private readonly getId: (entity: T) => K

  /**
   * Creates an instance of BaseRepository.
   * @param getId A function that extracts the unique identifier from an entity.
   */
  constructor(getId: (entity: T) => K) {
    this.getId = getId
  }

  /**
   * Finds an entity by its ID.
   * @param id The ID of the entity to find.
   * @returns The entity or undefined if not found.
   */
  findById(id: K): T | undefined {
    try {
      return this.data.get(id)
    } catch (error) {
      console.error(`Failed to find entity with id ${id}:`, error)
      throw new Error(`Failed to find entity with id ${id}`)
    }
  }

  /**
   * Retrieves all entities.
   * @returns An array of all entities.
   */
  findAll(): T[] {
    try {
      return Array.from(this.data.values())
    } catch (error) {
      console.error('Failed to retrieve all entities:', error)
      throw new Error('Failed to retrieve all entities')
    }
  }

  /**
   * Saves or updates an entity.
   * @param entity The entity to save.
   */
  save(entity: T): void {
    const id = this.getId(entity)
    try {
      this.data.set(id, entity)
    } catch (error) {
      console.error(`Failed to save entity with id ${id}:`, error)
      throw new Error(`Failed to save entity with id ${id}`)
    }
  }

  /**
   * Deletes an entity by its ID.
   * @param id The ID of the entity to delete.
   */
  deleteById(id: K): void {
    try {
      this.data.delete(id)
    } catch (error) {
      console.error(`Failed to delete entity with id ${id}:`, error)
      throw new Error(`Failed to delete entity with id ${id}`)
    }
  }

  /**
   * Clears all entities from the repository.
   */
  clear(): void {
    try {
      this.data.clear()
    } catch (error) {
      console.error('Failed to clear all entities:', error)
      throw new Error('Failed to clear all entities')
    }
  }
}
