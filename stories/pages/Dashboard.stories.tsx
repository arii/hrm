import type { Meta, StoryObj } from '@storybook/react'
import Dashboard from '@/components/DashboardClient'
import { MockWebSocketProvider } from '../mocks/MockWebSocketProvider'
import { ServerMessage } from '@/types/websocket'

const RACE_SCENARIO: ServerMessage[] = [
  {
    type: 'HRM_UPDATE',
    payload: [
      { clientId: '1', value: 120, maxHr: 190, name: 'Runner A', calories: 10 },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      { clientId: '1', value: 145, maxHr: 190, name: 'Runner A', calories: 20 },
    ],
  },
  {
    type: 'HRM_UPDATE',
    payload: [
      { clientId: '1', value: 165, maxHr: 190, name: 'Runner A', calories: 30 },
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
  args: {
    useNativeTable: false,
  },
  render: (args) => (
    <MockWebSocketProvider scenario={RACE_SCENARIO} interval={800}>
      <Dashboard {...args} />
    </MockWebSocketProvider>
  ),
}
