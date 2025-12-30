import type { Meta, StoryObj } from '@storybook/react'
import Dashboard from '@/app/page' // Adjust based on your actual export
import { MockWebSocketProvider } from '../mocks/MockWebSocketProvider'
import { ServerMessage } from '@/types/websocket'
import { ClientIdSchema } from '@/types/branded'

const RACE_SCENARIO: ServerMessage[] = [
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: ClientIdSchema.parse(
          'user-123e4567-e89b-12d3-a456-426614174000'
        ),
        value: 120,
        maxHr: 190,
        name: 'Runner A',
        calories: 10,
      },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: ClientIdSchema.parse(
          'user-123e4567-e89b-12d3-a456-426614174000'
        ),
        value: 145,
        maxHr: 190,
        name: 'Runner A',
        calories: 20,
      },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: ClientIdSchema.parse(
          'user-123e4567-e89b-12d3-a456-426614174000'
        ),
        value: 165,
        maxHr: 190,
        name: 'Runner A',
        calories: 30,
      },
    ],
  },
]

const meta = {
  title: 'Pages/Dashboard',
  component: Dashboard,
} satisfies Meta<typeof Dashboard>

export default meta
type Story = StoryObj<typeof meta>

export const LiveSimulation: Story = {
  render: () => (
    <MockWebSocketProvider scenario={RACE_SCENARIO} interval={800}>
      <Dashboard />
    </MockWebSocketProvider>
  ),
}
