// @ts-nocheck
'use client'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

const ConnectPage = () => {
  const {
    device,
    heartRate,
    error,
    status,
    connect,
    disconnect,
  } = useBluetoothHRM()

  return (
    <div>
      <h1>Bluetooth HRM</h1>
      <p>Status: {status}</p>
      {error && <p>Error: {error.message}</p>}
      {device && <p>Device: {device.name}</p>}
      {heartRate > 0 && <p>Heart Rate: {heartRate}</p>}
      <button onClick={connect} disabled={status === 'connecting'}>
        Connect
      </button>
      <button onClick={disconnect} disabled={status !== 'connected'}>
        Disconnect
      </button>
    </div>
  )
}

export default ConnectPage
