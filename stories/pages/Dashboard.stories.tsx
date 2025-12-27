import type { Meta, StoryObj } from '@storybook/react'
import Dashboard from '@/app/page' // Adjust based on your actual export
import { MockWebSocketProvider } from '../mocks/MockWebSocketProvider'
import { ServerMessage } from '@/types/websocket'

const RACE_SCENARIO: ServerMessage[] = [
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: '1',
        value: 120,
        maxHr: 190,
        name: 'Runner A',
        totalCalories: 10,
      },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: '1',
        value: 145,
        maxHr: 190,
        name: 'Runner A',
        totalCalories: 20,
      },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      {
        clientId: '1',
        value: 165,
        maxHr: 190,
        name: 'Runner A',
        totalCalories: 30,
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
