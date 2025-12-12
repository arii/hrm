import type { Meta, StoryObj } from '@storybook/react'
import ErrorDisplay from './ErrorDisplay'
import { ErrorContext, ErrorItem } from '@/context/ErrorContext'
import { useState } from 'react'

const meta: Meta<typeof ErrorDisplay> = {
  title: 'Components/ErrorDisplay',
  component: ErrorDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorDisplay>

const MockErrorProvider = ({ children, initialErrors = [] }: { children: React.ReactNode, initialErrors?: ErrorItem[] }) => {
    const [errors, setErrors] = useState<ErrorItem[]>(initialErrors)
    const addError = (msg: string) => setErrors(prev => [...prev, { id: Date.now().toString(), message: msg, timestamp: Date.now() }])
    const removeError = (id: string) => setErrors(prev => prev.filter(e => e.id !== id))
    const clearErrors = () => setErrors([])
    return (
        <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
            {children}
        </ErrorContext.Provider>
    )
}

export const Default: Story = {
    decorators: [
        (Story) => (
            <MockErrorProvider initialErrors={[{ id: '1', message: 'Something went wrong', timestamp: Date.now() }]}>
                <Story />
            </MockErrorProvider>
        ),
    ],
    args: {},
}

export const MultipleErrors: Story = {
    decorators: [
        (Story) => (
            <MockErrorProvider initialErrors={[
                { id: '1', message: 'Network error', timestamp: Date.now() },
                { id: '2', message: 'Validation failed', timestamp: Date.now() }
            ]}>
                <Story />
            </MockErrorProvider>
        ),
    ],
    args: {},
}
