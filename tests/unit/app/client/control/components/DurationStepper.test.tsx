/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import DurationStepper from '@/app/client/control/components/DurationStepper'
import '@testing-library/jest-dom'

describe('app/client/control/components/DurationStepper', () => {
  const renderStepper = (value = 20) =>
    render(
      <DurationStepper
        label="Work"
        value={value}
        onChange={() => {}}
        data-testid="work-stepper"
      />
    )

  it('announces the current value through a status role', () => {
    renderStepper()
    const display = screen.getByRole('status')
    expect(display).toHaveTextContent('20')
  })

  it('labels the step buttons with their direction and target', () => {
    renderStepper()
    expect(
      screen.getByRole('button', { name: 'Decrease Work' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Increase Work' })
    ).toBeInTheDocument()
  })

  it('steps the value within its bounds', () => {
    const onChange = jest.fn()
    render(
      <DurationStepper
        label="Work"
        value={20}
        onChange={onChange}
        min={0}
        step={5}
        data-testid="work-stepper"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Increase Work' }))
    expect(onChange).toHaveBeenCalledWith(25)
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Work' }))
    expect(onChange).toHaveBeenCalledWith(15)
  })
})
