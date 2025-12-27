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
    return this.data.get(id)
  }

  /**
   * Retrieves all entities.
   * @returns An array of all entities.
   */
  findAll(): T[] {
    return Array.from(this.data.values())
  }

  /**
   * Saves or updates an entity.
   * @param entity The entity to save.
   */
  save(entity: T): void {
    const id = this.getId(entity)
    this.data.set(id, entity)
  }

  /**
   * Deletes an entity by its ID.
   * @param id The ID of the entity to delete.
   */
  deleteById(id: K): void {
    this.data.delete(id)
  }

  /**
   * Clears all entities from the repository.
   */
  clear(): void {
    this.data.clear()
  }
}
