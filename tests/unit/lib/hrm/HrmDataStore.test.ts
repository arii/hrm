// tests/unit/lib/hrm/HrmDataStore.test.ts
import { HrmDataStore } from '../../../../lib/hrm/HrmDataStore'
import { HrmStreamData } from '../../../../types/core'

describe('HrmDataStore', () => {
  let repository: HrmDataStore
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
    repository = new HrmDataStore()
  })

  it('should save and find a client by ID', () => {
    repository.save(client1)
    const found = repository.findById('client1')
    expect(found).toMatchObject(client1)
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
    expect(allClients).toContainEqual(expect.objectContaining(client1))
    expect(allClients).toContainEqual(expect.objectContaining(client2))
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
    expect(found).toMatchObject({
      ...updatedClient,
      sessionAvgHr: 90, // (80 + 100) / 2
      sessionMaxHr: 100,
      sessionMinHr: 80,
    })
  })

  it('should track incremental stats correctly', () => {
    repository.save(client1) // HR 80
    repository.save({ ...client1, value: 120 })
    repository.save({ ...client1, value: 100 })

    const found = repository.findById('client1')
    expect(found?.sessionAvgHr).toBe(100) // (80+120+100)/3
    expect(found?.sessionMaxHr).toBe(120)
    expect(found?.sessionMinHr).toBe(80)
  })

  it('should provide history snapshot', () => {
    repository.save({ ...client1, value: 80, updatedAt: 1000 })
    repository.save({ ...client1, value: 90, updatedAt: 2000 })

    const snapshot = repository.getSnapshot('client1')
    expect(snapshot?.recentHistory).toHaveLength(2)
    expect(snapshot?.recentHistory[0]).toEqual({
      heartRate: 80,
      timestamp: 1000,
    })
    expect(snapshot?.recentHistory[1]).toEqual({
      heartRate: 90,
      timestamp: 2000,
    })
    expect(snapshot?.summary.avgHr).toBe(85)
  })

  it('should handle pruneSessionHistory by clearing history but keeping stats', () => {
    repository.save({ ...client1, value: 80 })
    repository.save({ ...client1, value: 90 })

    repository.pruneSessionHistory('client1')

    const snapshot = repository.getSnapshot('client1')
    expect(snapshot?.recentHistory).toHaveLength(0)
    expect(snapshot?.summary.avgHr).toBe(85)
  })
})
