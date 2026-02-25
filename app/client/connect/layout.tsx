import { Metadata } from 'next'
import { BluetoothTestProvider } from '@/context/BluetoothTestContext'

export const metadata: Metadata = {
  title: 'HRM Connect',
  description: 'Connect Bluetooth Heart Rate Monitor',
}

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BluetoothTestProvider>{children}</BluetoothTestProvider>
}
