// tests/unit/lib/repositories/BaseRepository.test.ts
import { BaseRepository } from '../../../../lib/repositories/BaseRepository'

interface TestEntity {
  id: number
  name: string
}

describe('BaseRepository', () => {
  let repository: BaseRepository<TestEntity, number>
  const entity1: TestEntity = { id: 1, name: 'Entity One' }
  const entity2: TestEntity = { id: 2, name: 'Entity Two' }

  beforeEach(() => {
    repository = new BaseRepository((e) => e.id)
  })

  it('should save and find an entity by ID', () => {
    repository.save(entity1)
    const found = repository.findById(1)
    expect(found).toEqual(entity1)
  })

  it('should return undefined for a non-existent entity', () => {
    const found = repository.findById(99)
    expect(found).toBeUndefined()
  })

  it('should find all entities', () => {
    repository.save(entity1)
    repository.save(entity2)
    const all = repository.findAll()
    expect(all).toHaveLength(2)
    expect(all).toContainEqual(entity1)
    expect(all).toContainEqual(entity2)
  })

  it('should update an existing entity', () => {
    repository.save(entity1)
    const updatedEntity = { ...entity1, name: 'Updated Name' }
    repository.save(updatedEntity)
    const found = repository.findById(1)
    expect(found).toEqual(updatedEntity)
  })

  it('should delete an entity by ID', () => {
    repository.save(entity1)
    repository.deleteById(1)
    const found = repository.findById(1)
    expect(found).toBeUndefined()
  })

  it('should clear all entities', () => {
    repository.save(entity1)
    repository.save(entity2)
    repository.clear()
    const all = repository.findAll()
    expect(all).toHaveLength(0)
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Suppress console.error output during these tests
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should throw an error when findById fails', () => {
      jest.spyOn(repository['data'], 'get').mockImplementation(() => {
        throw new Error('Get failed')
      })
      expect(() => repository.findById(1)).toThrow(
        'Failed to find entity with id 1'
      )
    })

    it('should throw an error when findAll fails', () => {
      jest.spyOn(repository['data'], 'values').mockImplementation(() => {
        throw new Error('Values failed')
      })
      expect(() => repository.findAll()).toThrow(
        'Failed to retrieve all entities'
      )
    })

    it('should throw an error when save fails', () => {
      jest.spyOn(repository['data'], 'set').mockImplementation(() => {
        throw new Error('Set failed')
      })
      expect(() => repository.save(entity1)).toThrow(
        'Failed to save entity with id 1'
      )
    })

    it('should throw an error when deleteById fails', () => {
      jest.spyOn(repository['data'], 'delete').mockImplementation(() => {
        throw new Error('Delete failed')
      })
      expect(() => repository.deleteById(1)).toThrow(
        'Failed to delete entity with id 1'
      )
    })

    it('should throw an error when clear fails', () => {
      jest.spyOn(repository['data'], 'clear').mockImplementation(() => {
        throw new Error('Clear failed')
      })
      expect(() => repository.clear()).toThrow('Failed to clear all entities')
    })
  })
})
