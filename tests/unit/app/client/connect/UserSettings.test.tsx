/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from '../../../../../app/client/connect/UserSettings'

describe('UserSettings', () => {
  it('renders all the form fields', () => {
    render(<UserSettings />)
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Age')).toBeInTheDocument()
    expect(screen.getByLabelText('Unit system')).toBeInTheDocument()
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (lbs)')).toBeInTheDocument()
  })

  it('switches to metric units when the toggle is clicked', () => {
    render(<UserSettings />)
    fireEvent.click(screen.getByText('Metric (kg, cm)'))
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (kg)')).toBeInTheDocument()
  })
})
