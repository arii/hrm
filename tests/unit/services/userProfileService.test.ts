// File: tests/unit/services/userProfileService.test.ts
/**
 * @jest-environment node
 */
import { promises as fs } from 'fs'
import path from 'path'
import {
  getProfile,
  updateProfile,
  UserProfile,
} from '../../../services/userProfileService'
import logger from '../../../utils/logger'

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}))
jest.mock('../../../utils/logger')

const PROFILES_FILE_PATH = path.join(process.cwd(), 'logs', 'user_profiles.json')
const mockedFs = fs as jest.Mocked<typeof fs>

describe('services/userProfileService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should return a user profile if it exists', async () => {
      const profiles = {
        'test-user': { name: 'test-user', age: 30 },
      }
      mockedFs.readFile.mockResolvedValue(JSON.stringify(profiles))

      const profile = await getProfile('test-user')
      expect(profile).toEqual({ name: 'test-user', age: 30 })
      expect(mockedFs.readFile).toHaveBeenCalledWith(PROFILES_FILE_PATH, 'utf-8')
    })

    it('should create a default profile if the user profile does not exist', async () => {
      const profiles = {
        'another-user': { name: 'another-user', age: 40 },
      }
      mockedFs.readFile.mockResolvedValue(JSON.stringify(profiles))
      mockedFs.writeFile.mockResolvedValue()

      const profile = await getProfile('test-user')
      expect(profile).not.toBeNull()
      expect(profile).toEqual({
        name: 'test-user',
        age: 30,
        height: 175,
        weight: 75,
        assignedGenderAtBirth: 'other',
      })
      expect(mockedFs.writeFile).toHaveBeenCalled()
    })

    it('should create a default profile if the profiles file does not exist', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      mockedFs.readFile.mockRejectedValue(error)
      mockedFs.writeFile.mockResolvedValue()

      const profile = await getProfile('test-user')
      expect(profile).not.toBeNull()
      expect(profile).toEqual({
        name: 'test-user',
        age: 30,
        height: 175,
        weight: 75,
        assignedGenderAtBirth: 'other',
      })
      expect(mockedFs.writeFile).toHaveBeenCalled()
    })
  })

  describe('updateProfile', () => {
    it('should create a new profile if one does not exist', async () => {
      const profiles = {}
      mockedFs.readFile.mockResolvedValue(JSON.stringify(profiles))

      const newProfileData: Partial<UserProfile> = { age: 30, height: 180 }
      const updatedProfile = await updateProfile('new-user', newProfileData)

      expect(updatedProfile).toEqual({ name: 'new-user', ...newProfileData })
      const expectedProfiles = {
        'new-user': { name: 'new-user', ...newProfileData },
      }
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        PROFILES_FILE_PATH,
        JSON.stringify(expectedProfiles, null, 2)
      )
    })

    it('should update an existing profile', async () => {
      const profiles = {
        'existing-user': { name: 'existing-user', age: 30 },
      }
      mockedFs.readFile.mockResolvedValue(JSON.stringify(profiles))

      const updatedData: Partial<UserProfile> = { age: 31, weight: 75 }
      const updatedProfile = await updateProfile('existing-user', updatedData)

      expect(updatedProfile).toEqual({
        name: 'existing-user',
        age: 31,
        weight: 75,
      })
      const expectedProfiles = {
        'existing-user': { name: 'existing-user', age: 31, weight: 75 },
      }
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        PROFILES_FILE_PATH,
        JSON.stringify(expectedProfiles, null, 2)
      )
    })
  })
})
