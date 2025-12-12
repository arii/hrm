import type { Meta, StoryObj } from '@storybook/react'
import WorkoutTableViewer from './WorkoutTableViewer'
import { http, HttpResponse } from 'msw'

const meta: Meta<typeof WorkoutTableViewer> = {
  title: 'Components/WorkoutTableViewer',
  component: WorkoutTableViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WorkoutTableViewer>

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/workout', () => {
          return HttpResponse.json({
            headers: ['Exercise', 'Sets', 'Reps'],
            rows: [
              ['Bench Press', '3', '8-10'],
              ['Pull Ups', '3', 'Max'],
              ['Dips', '3', '10-12'],
            ],
          })
        }),
      ],
    },
  },
  args: {
    docId: 'test-doc-id',
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/workout', async () => {
          await new Promise((resolve) => setTimeout(resolve, 'infinite'))
          return HttpResponse.json({})
        }),
      ],
    },
  },
  args: {
    docId: 'loading-doc-id',
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/workout', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
  args: {
    docId: 'error-doc-id',
  },
}
