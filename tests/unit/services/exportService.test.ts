/**
 * @jest-environment jsdom
 */
import {
  convertToCSV,
  convertToGPX,
  convertToFIT,
  exportToCSV,
  exportToGPX,
  exportToFIT,
} from '@/services/exportService'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url')
global.URL.revokeObjectURL = jest.fn()

// Mock document.createElement and body.appendChild/removeChild for downloadFile
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
}
document.createElement = jest.fn().mockReturnValue(mockLink)
document.body.appendChild = jest.fn()
document.body.removeChild = jest.fn()

describe('exportService', () => {
  const mockSession: WorkoutSessionData = {
    sessionId: 'test-session-id',
    startTime: 1600000000000,
    endTime: 1600003600000,
    status: 'finished',
    hrHistory: [
      { time: 1600000000000, hr: 70 },
      { time: 1600000010000, hr: 75 },
    ],
    timeInZones: {
      ZONE_0: 0,
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
      ZONE_6: 0,
    },
    averageHr: 72.5,
    maxHr: 75,
    calorieHistory: [],
    totalCaloriesBurned: 100,
    userSettings: { age: 30, weight: 70, maxHr: 190 },
    lastSyncTime: 0,
    syncStatus: 'pending',
  }

  describe('convertToCSV', () => {
    it('converts session history to CSV string', () => {
      const csv = convertToCSV(mockSession)
      expect(csv).toContain('Timestamp,Heart Rate (BPM)')
      expect(csv).toContain('2020-09-13T12:26:40.000Z,70')
      expect(csv).toContain('2020-09-13T12:26:50.000Z,75')
    })
  })

  describe('convertToGPX', () => {
    it('converts session history to valid GPX string with Garmin extensions', () => {
      const gpx = convertToGPX(mockSession)
      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(gpx).toContain('<gpx')
      expect(gpx).toContain(
        'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"'
      )
      expect(gpx).toContain('<trkpt lat="0.0" lon="0.0">')
      expect(gpx).toContain('<gpxtpx:hr>70</gpxtpx:hr>')
      expect(gpx).toContain('<gpxtpx:hr>75</gpxtpx:hr>')
    })
  })

  describe('convertToFIT', () => {
    it('creates a Blob with FIT data', () => {
      const blob = convertToFIT(mockSession)
      expect(blob).toBeInstanceOf(Blob)
      // We can't easily inspect the Blob content without reading it back,
      // but checking it returns a Blob is a basic smoke test.
      // Also the encoder logic is internal to @garmin/fitsdk.
    })
  })

  describe('export functions', () => {
    it('exportToCSV triggers download', () => {
      exportToCSV(mockSession)
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockLink.download).toBe('workout-test-session-id.csv')
      expect(mockLink.href).toBe('blob:test-url')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('exportToGPX triggers download', () => {
      exportToGPX(mockSession)
      expect(mockLink.download).toBe('workout-test-session-id.gpx')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('exportToFIT triggers download', () => {
      exportToFIT(mockSession)
      expect(mockLink.download).toBe('workout-test-session-id.fit')
      expect(mockLink.click).toHaveBeenCalled()
    })
  })
})
