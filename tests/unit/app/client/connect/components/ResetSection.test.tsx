/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ResetSection, {
  type ResetSectionProps,
} from '@/app/client/connect/components/ResetSection'

describe('ResetSection', () => {
  const renderSection = (props: Partial<ResetSectionProps> = {}) =>
    render(<ResetSection onReset={jest.fn()} isResetting={false} {...props} />)

  it('renders a stable testid for E2E (#9076)', () => {
    renderSection()
    expect(screen.getByTestId('reset-section')).toBeInTheDocument()
  })

  it('calls onReset when the button is clicked', () => {
    const onReset = jest.fn()
    renderSection({ onReset })
    fireEvent.click(screen.getByRole('button', { name: /reset permissions/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('disables the button and relabels while resetting', () => {
    renderSection({ isResetting: true })
    const button = screen.getByRole('button', { name: /resetting/i })
    expect(button).toBeDisabled()
  })

  it('renders the same controls in compact toolbar mode', () => {
    renderSection({ compact: true })
    expect(screen.getByTestId('reset-section')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /reset permissions/i })
    ).toBeEnabled()
  })
})
