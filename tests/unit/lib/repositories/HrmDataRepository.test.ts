// tests/unit/lib/repositories/HrmDataRepository.test.ts
import { HrmDataRepository } from '../../../../lib/repositories/HrmDataRepository'
import { HrmStreamData } from '../../../../types/core'

describe('HrmDataRepository', () => {
  let repository: HrmDataRepository
  const user1: HrmStreamData = {
    clientId: 'client1',
    name: 'UserOne',
    value: 80,
    maxHr: 190,
    age: 25,
    calories: 100,
  }
  const user2: HrmStreamData = {
    clientId: 'client2',
    name: 'UserTwo',
    value: 90,
    maxHr: 180,
    age: 35,
    calories: 150,
  }

  beforeEach(() => {
    repository = new HrmDataRepository()
  })

  it('should save and find a user by name', () => {
    repository.save(user1)
    const found = repository.findByName('UserOne')
    expect(found).toEqual(user1)
  })

  it('should return undefined for a non-existent user', () => {
    const found = repository.findByName('non-existent')
    expect(found).toBeUndefined()
  })

  it('should find all users', () => {
    repository.save(user1)
    repository.save(user2)
    const allUsers = repository.findAll()
    expect(allUsers).toHaveLength(2)
    expect(allUsers).toContainEqual(user1)
    expect(allUsers).toContainEqual(user2)
  })

  it('should return an empty array when no users are saved', () => {
    const allUsers = repository.findAll()
    expect(allUsers).toHaveLength(0)
  })

  it('should delete a user by name', () => {
    repository.save(user1)
    repository.deleteByName('UserOne')
    const found = repository.findByName('UserOne')
    expect(found).toBeUndefined()
  })

  it('should not throw an error when deleting a non-existent user', () => {
    expect(() => repository.deleteByName('non-existent')).not.toThrow()
  })

  it('should clear all users', () => {
    repository.save(user1)
    repository.save(user2)
    repository.clear()
    const allUsers = repository.findAll()
    expect(allUsers).toHaveLength(0)
  })

  it('should update an existing user', () => {
    repository.save(user1)
    const updatedUser = { ...user1, value: 100 }
    repository.save(updatedUser)
    const found = repository.findByName('UserOne')
    expect(found).toEqual(updatedUser)
  })

  it('should throw an error when saving data without a name', () => {
    const userWithoutName = {
      clientId: 'client3',
      value: 70,
      maxHr: 185,
      age: 40,
      calories: 200,
    } as Omit<HrmStreamData, 'name'>

    expect(() => repository.save(userWithoutName as HrmStreamData)).toThrow(
      'HrmStreamData must have a name to be saved.'
    )
  })
})
