import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HRM Connect',
  description: 'Connect Bluetooth Heart Rate Monitor',
}

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
