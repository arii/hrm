import type { Meta, StoryObj } from '@storybook/react'
import TimerSoundProvider from './TimerSoundProvider'

const meta: Meta<typeof TimerSoundProvider> = {
  title: 'Components/TimerSoundProvider',
  component: TimerSoundProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TimerSoundProvider>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
