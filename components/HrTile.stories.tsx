// @ts-nocheck
import { HrTile } from './HrTile'

export default {
  title: 'Components/HrTile',
  component: HrTile,
}

export const Default = {
  args: {
    name: 'John Doe',
    bpm: 120,
    percentMax: 60,
  },
}

export const Alerting = {
  args: {
    name: 'Jane Doe',
    bpm: 180,
    percentMax: 90,
    isAlerting: true,
    alertMessage: 'High Heart Rate',
  },
}

export const SignalDrop = {
  args: {
    name: 'Baby Doe',
    bpm: 0,
    percentMax: 0,
    isAlerting: true,
    alertMessage: 'Signal Drop',
  },
}
