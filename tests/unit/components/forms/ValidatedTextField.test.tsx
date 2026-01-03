/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ValidatedTextField from '../../../../components/forms/ValidatedTextField'
import { UserSettingsSchema } from '../../../../lib/validation/userSettingsValidation'

describe('ValidatedTextField', () => {
  it('should display a validation error when the input is invalid and the field is blurred', async () => {
    render(
      <ValidatedTextField
        label="User Name"
        fieldName="userName"
        schema={UserSettingsSchema}
      />
    )

    const textField = screen.getByLabelText(/user name/i)
    fireEvent.blur(textField)

    const errorMessage = await screen.findByText('Name is required.')
    expect(errorMessage).toBeInTheDocument()
  })

  it('should not display a validation error when the input is valid', () => {
    render(
      <ValidatedTextField
        label="User Name"
        fieldName="userName"
        schema={UserSettingsSchema}
        defaultValue="John Doe"
      />
    )

    const textField = screen.getByLabelText(/user name/i)
    fireEvent.blur(textField)

    const errorMessage = screen.queryByText('Name is required.')
    expect(errorMessage).not.toBeInTheDocument()
  })
})
