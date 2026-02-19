/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import SessionDetail from '@/app/client/experimental/components/SessionDetail'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { generateFitFile } from '@/utils/fit-export'

jest.mock('@/utils/fit-export', () => ({
  generateFitFile: jest.fn(),
}))

global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('SessionDetail', () => {
  const mockSession: WorkoutSessionData = {
    sessionId: 'test-session',
    startTime: 1700000000000,
    endTime: 1700000060000,
    status: 'finished',
    hrHistory: [],
    timeInZones: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    averageHr: 90,
    maxHr: 120,
    calorieHistory: [],
    totalCaloriesBurned: 100,
    userSettings: { age: 30, weight: 70, maxHr: 190 },
    lastSyncTime: 0,
    syncStatus: 'synced',
  }

  it('renders correctly and handles FIT export', () => {
    const onBack = jest.fn()
    render(<SessionDetail session={mockSession} onBack={onBack} />)

    const exportButton = screen.getByText(/Export FIT/i)
    expect(exportButton).toBeInTheDocument()

    const mockBlob = new Blob(['fit-data'], { type: 'application/fit' })
    ;(generateFitFile as jest.Mock).mockReturnValue(mockBlob)

    const createElementSpy = jest.spyOn(document, 'createElement')

    fireEvent.click(exportButton)

    expect(generateFitFile).toHaveBeenCalledWith(mockSession)
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(createElementSpy).toHaveBeenCalledWith('a')
  })
})
