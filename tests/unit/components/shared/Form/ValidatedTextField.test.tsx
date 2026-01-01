// tests/unit/components/shared/Form/ValidatedTextField.test.tsx
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { z } from 'zod'
import ValidatedTextField from '@/components/shared/Form/ValidatedTextField'

const mockOnStateChanged = jest.fn()

const nameSchema = z.string().min(1, 'Name is required')

describe('ValidatedTextField', () => {
  it('renders correctly', () => {
    const { getByLabelText } = render(
      <ValidatedTextField
        id="name"
        label="Name"
        value=""
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    expect(getByLabelText('Name')).toBeInTheDocument()
  })

  it('handles input changes', async () => {
    const { getByLabelText } = render(
      <ValidatedTextField
        id="name"
        label="Name"
        value=""
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    const input = getByLabelText('Name')
    fireEvent.change(input, { target: { value: 'John' } })
    await waitFor(() => expect(input).toHaveValue('John'))
  })

  it('validates on blur', async () => {
    const { getByLabelText } = render(
      <ValidatedTextField
        id="name"
        label="Name"
        value=""
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    const input = getByLabelText('Name')
    fireEvent.change(input, { target: { value: 'John' } })
    fireEvent.blur(input)
    await waitFor(() => {
      expect(mockOnStateChanged).toHaveBeenCalledWith('name', 'John', true, [])
    })
  })

  it('shows error on invalid input', async () => {
    const { getByLabelText, findByText } = render(
      <ValidatedTextField
        id="name"
        label="Name"
        value=""
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    const input = getByLabelText('Name')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    const error = await findByText('Name is required')
    expect(error).toBeInTheDocument()
  })

  it('updates when value prop changes', async () => {
    const { getByLabelText, rerender } = render(
      <ValidatedTextField
        id="name"
        label="Name"
        value="Initial"
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    const input = getByLabelText('Name')
    expect(input).toHaveValue('Initial')

    rerender(
      <ValidatedTextField
        id="name"
        label="Name"
        value="Updated"
        onStateChanged={mockOnStateChanged}
        validationSchema={nameSchema}
      />
    )
    await waitFor(() => expect(input).toHaveValue('Updated'))
  })
})
