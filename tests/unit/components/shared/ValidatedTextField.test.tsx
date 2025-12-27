/**
 * @jest-environment jsdom
 */
// tests/unit/components/shared/ValidatedTextField.test.tsx
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ValidatedTextField from '@/components/shared/ValidatedTextField'
import '@testing-library/jest-dom'

describe('ValidatedTextField', () => {
  it('should render a text field', () => {
    render(<ValidatedTextField />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should show an error for invalid input', async () => {
    render(
      <ValidatedTextField validationRules={[{ type: 'required' }]} value="" />
    )
    const textbox = screen.getByRole('textbox')
    fireEvent.blur(textbox)
    expect(
      await screen.findByText('This field is required.')
    ).toBeInTheDocument()
  })

  it('should have correct accessibility attributes when invalid', async () => {
    render(
      <ValidatedTextField
        id="test-field"
        validationRules={[{ type: 'required' }]}
        value=""
      />
    )
    const textbox = screen.getByRole('textbox')
    fireEvent.blur(textbox)
    expect(textbox).toHaveAttribute('aria-invalid', 'true')
    expect(textbox).toHaveAttribute('aria-describedby', 'test-field-error-text')
  })
})
