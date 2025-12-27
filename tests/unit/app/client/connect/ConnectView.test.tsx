/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ConnectView from '../../../../../app/client/connect/ConnectView'

describe('ConnectView', () => {
  it('renders the component', () => {
    render(
      <ConnectView
        duration="00:00"
        caloriesBurned={0}
        userName=""
        setUserName={() => {}}
        userAge=""
        setUserAge={() => {}}
        userHeight={0}
        setUserHeight={() => {}}
        userWeight=""
        setUserWeight={() => {}}
        gender="MALE"
        setGender={() => {}}
        unitSystem="IMPERIAL"
        onUnitChange={() => {}}
        isConnected={false}
        deviceStatus=""
        batteryLevel={null}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onForgetDevice={async () => {}}
        isSupported={true}
        currentHR={0}
        hrZoneProps={{ percentage: 0, progressColor: '' }}
        connectionStatus=""
        bluetoothConnected={false}
        hasStarted={false}
        onReset={() => {}}
        workoutStatus="idle"
        onStartWorkout={() => {}}
        onEndWorkout={() => {}}
      />
    )
    expect(screen.getByText('Connect Heart Rate Monitor')).toBeInTheDocument()
  })
})
