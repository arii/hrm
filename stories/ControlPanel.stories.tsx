import type { Meta, StoryObj } from '@storybook/react'
import ControlPanel from '@/app/client/control/ControlPanel'
import { MockWebSocketProvider } from './decorators/MockWebSocketProvider'

const meta: Meta<typeof ControlPanel> = {
  title: 'Control/ControlPanel',
  component: ControlPanel,
  decorators: [
    (Story) => (
      <MockWebSocketProvider>
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  parameters: {
    // No 'centered' to see full layout behavior
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
