import { Metadata } from 'next'
import ErrorBoundary from '../../../components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'HRM Connect',
  description: 'Connect Bluetooth Heart Rate Monitor',
}

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
