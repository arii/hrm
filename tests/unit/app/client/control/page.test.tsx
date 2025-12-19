/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import ControlPage from '@/app/client/control/page'

// Mock the child client-side component that is rendered by the page.
// This isolates the server-side Page component for a clean unit test.
jest.mock('@/app/client/control/ControlPanel', () => {
  return function MockControlPanel() {
    return (
      <div>
        {/* The child component is responsible for its own titles */}
        <h1>Timer Controls</h1>
        <div data-testid="timer-controls" />
        <h1>Spotify Controls</h1>
        <div data-testid="spotify-controls" />
      </div>
    )
  }
})

describe('ControlPage', () => {
  it('should render the ControlPanel client component', () => {
    render(<ControlPage />)

    // The Page component's main job is to render the ControlPanel.
    // We verify that the key elements from our mocked ControlPanel are present.
    expect(screen.getByText('Timer Controls')).toBeInTheDocument()
    expect(screen.getByText('Spotify Controls')).toBeInTheDocument()
    expect(screen.getByTestId('timer-controls')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-controls')).toBeInTheDocument()
  })
})
