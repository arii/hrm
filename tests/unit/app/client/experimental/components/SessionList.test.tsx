/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import SessionList from '@/app/client/experimental/components/SessionList'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

describe('SessionList', () => {
  const activeSession: WorkoutSessionData = {
    sessionId: 'session-1',
    startTime: Date.now() - 60000,
    endTime: null,
    status: 'running',
    hrHistory: [],
    timeInZones: {
      ZONE_0: 0,
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
      ZONE_6: 0,
    },
    averageHr: 0,
    maxHr: 0,
    totalPaused: 0,
    pauseTime: null,
    calorieHistory: [],
    totalCaloriesBurned: 0,
    userSettings: { age: 36, weight: 70, maxHr: 184 },
    lastSyncTime: Date.now(),
    syncStatus: 'synced',
  }

  it('renders active session duration without nested paragraph elements', () => {
    const { container } = render(
      <SessionList
        sessions={[activeSession]}
        onSelectSession={jest.fn()}
        onDeleteSession={jest.fn()}
      />
    )
    expect(container.querySelector('p p')).toBeNull()
  })
})
