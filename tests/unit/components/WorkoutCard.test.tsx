/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutCard from '../../../components/WorkoutCard'
import { FitnessCenter } from '@mui/icons-material'

describe('WorkoutCard', () => {
  const mockProps = {
    exerciseName: 'Push Ups',
    details: '3 sets of 10 reps',
    isCompleted: false,
    onToggleComplete: jest.fn(),
    icon: <FitnessCenter data-testid="fitness-icon" />,
  }

  // Clear mock calls before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the exercise name and details', () => {
    render(<WorkoutCard {...mockProps} />)
    expect(screen.getByText('Push Ups')).toBeInTheDocument()
    expect(screen.getByText('3 sets of 10 reps')).toBeInTheDocument()
  })

  it('renders the provided icon', () => {
    render(<WorkoutCard {...mockProps} />)
    expect(screen.getByTestId('fitness-icon')).toBeInTheDocument()
  })

  it('shows an unchecked icon when not completed', () => {
    render(<WorkoutCard {...mockProps} />)
    const button = screen.getByRole('button', { name: /toggle complete/i })
    // MUI icons often get a data-testid from the component name
    expect(
      button.querySelector('[data-testid="RadioButtonUncheckedIcon"]')
    ).toBeInTheDocument()
  })

  it('shows a checked icon when completed', () => {
    render(<WorkoutCard {...mockProps} isCompleted={true} />)
    const button = screen.getByRole('button', { name: /toggle complete/i })
    expect(
      button.querySelector('[data-testid="CheckCircleIcon"]')
    ).toBeInTheDocument()
  })

  it('calls onToggleComplete when the button is clicked', () => {
    render(<WorkoutCard {...mockProps} />)
    const button = screen.getByRole('button', { name: /toggle complete/i })
    fireEvent.click(button)
    expect(mockProps.onToggleComplete).toHaveBeenCalledTimes(1)
  })

  it('has reduced opacity when completed', () => {
    const { container } = render(
      <WorkoutCard {...mockProps} isCompleted={true} />
    )
    expect(container.firstChild).toHaveStyle('opacity: 0.6')
  })

  it('has full opacity when not completed', () => {
    const { container } = render(
      <WorkoutCard {...mockProps} isCompleted={false} />
    )
    expect(container.firstChild).toHaveStyle('opacity: 1')
  })
})
