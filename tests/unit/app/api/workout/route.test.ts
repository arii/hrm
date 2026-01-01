/**
 * @jest-environment node
 */
import { GET } from '@/app/api/workout/route'
import { parseGoogleDocTable } from '@/services/googleDocParser'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/services/googleDocParser')

// Mock global fetch
global.fetch = jest.fn()

const mockedParseGoogleDocTable = parseGoogleDocTable as jest.Mock
const mockedFetch = global.fetch as jest.Mock

describe('API Route: /api/workout', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 400 if docId is missing', async () => {
      const request = new NextRequest('http://localhost/api/workout')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    describe('when errors are expected', () => {
      let consoleErrorSpy: jest.SpyInstance

      beforeAll(() => {
        consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => {})
      })

      afterAll(() => {
        consoleErrorSpy.mockRestore()
      })

      it('should return 500 if fetching from Google fails', async () => {
        mockedFetch.mockResolvedValue({
          ok: false,
          status: 404,
        } as Response)
        const request = new NextRequest(
          'http://localhost/api/workout?docId=test-doc-id'
        )
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data).toHaveProperty('error')
      })

      it('should return 500 if an exception occurs during fetch', async () => {
        mockedFetch.mockRejectedValue(new Error('Network error'))
        const request = new NextRequest(
          'http://localhost/api/workout?docId=test-doc-id'
        )
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data).toHaveProperty('error')
      })
    })

    it('should return parsed data on successful fetch', async () => {
      const mockHtml = '<table><tr><td>Mock Data</td></tr></table>'
      const mockParsedData = [{ col1: 'Mock Data' }]

      mockedFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response)
      mockedParseGoogleDocTable.mockReturnValue(mockParsedData)

      const request = new NextRequest(
        'http://localhost/api/workout?docId=test-doc-id'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockParsedData)
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://docs.google.com/document/d/test-doc-id/export?format=html',
        { next: { revalidate: 60 } }
      )
      expect(mockedParseGoogleDocTable).toHaveBeenCalledWith(mockHtml)
    })
  })
})
