// File: tests/unit/app/api/profile/[userName]/route.test.ts
/**
 * @jest-environment node
 */
import { GET, PUT } from '../../../../../../app/api/profile/[userName]/route'
import * as userProfileService from '../../../../../../services/userProfileService'
import { NextRequest } from 'next/server'

jest.mock('../../../../../../services/userProfileService')

const mockedUserProfileService = userProfileService as jest.Mocked<
  typeof userProfileService
>

describe('app/api/profile/[userName]/route', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return the user profile if found', async () => {
      const profile = { name: 'test-user', age: 30 }
      mockedUserProfileService.getProfile.mockResolvedValue(profile)

      const req = new NextRequest('http://localhost/api/profile/test-user')
      const res = await GET(req, { params: { userName: 'test-user' } })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(profile)
    })

    it('should return 404 if the profile is not found', async () => {
      mockedUserProfileService.getProfile.mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/profile/test-user')
      const res = await GET(req, { params: { userName: 'test-user' } })

      expect(res.status).toBe(404)
    })
  })

  describe('PUT', () => {
    it('should update the profile and return the updated profile', async () => {
      const updatedProfile = { name: 'test-user', age: 31 }
      mockedUserProfileService.updateProfile.mockResolvedValue(updatedProfile)

      const req = new NextRequest('http://localhost/api/profile/test-user', {
        method: 'PUT',
        body: JSON.stringify({ age: 31 }),
      })
      const res = await PUT(req, { params: { userName: 'test-user' } })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(updatedProfile)
    })

    it('should return 400 for invalid data', async () => {
      const req = new NextRequest('http://localhost/api/profile/test-user', {
        method: 'PUT',
        body: JSON.stringify({ age: 'thirty-one' }), // Invalid data
      })
      const res = await PUT(req, { params: { userName: 'test-user' } })

      expect(res.status).toBe(400)
    })
  })
})
