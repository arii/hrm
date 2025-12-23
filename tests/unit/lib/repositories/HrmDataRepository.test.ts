// tests/unit/lib/repositories/HrmDataRepository.test.ts
import { HrmDataRepository } from '../../../../lib/repositories/HrmDataRepository'
import { HrmStreamData } from '../../../../types/core'

describe('HrmDataRepository', () => {
  let repository: HrmDataRepository
  const client1: HrmStreamData = {
    clientId: 'client1',
    value: 80,
    maxHr: 190,
    age: 25,
    calories: 100,
  }
  const client2: HrmStreamData = {
    clientId: 'client2',
    value: 90,
    maxHr: 180,
    age: 35,
    calories: 150,
  }

  beforeEach(() => {
    repository = new HrmDataRepository()
  })

  it('should save and find a client by ID', () => {
    repository.save(client1)
    const found = repository.findById('client1')
    expect(found).toEqual(client1)
  })

  it('should return undefined for a non-existent client', () => {
    const found = repository.findById('non-existent')
    expect(found).toBeUndefined()
  })

  it('should find all clients', () => {
    repository.save(client1)
    repository.save(client2)
    const allClients = repository.findAll()
    expect(allClients).toHaveLength(2)
    expect(allClients).toContainEqual(client1)
    expect(allClients).toContainEqual(client2)
  })

  it('should return an empty array when no clients are saved', () => {
    const allClients = repository.findAll()
    expect(allClients).toHaveLength(0)
  })

  it('should delete a client by ID', () => {
    repository.save(client1)
    repository.deleteById('client1')
    const found = repository.findById('client1')
    expect(found).toBeUndefined()
  })

  it('should not throw an error when deleting a non-existent client', () => {
    expect(() => repository.deleteById('non-existent')).not.toThrow()
  })

  it('should clear all clients', () => {
    repository.save(client1)
    repository.save(client2)
    repository.clear()
    const allClients = repository.findAll()
    expect(allClients).toHaveLength(0)
  })

  it('should update an existing client', () => {
    repository.save(client1)
    const updatedClient = { ...client1, value: 100 }
    repository.save(updatedClient)
    const found = repository.findById('client1')
    expect(found).toEqual(updatedClient)
  })
})
