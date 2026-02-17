/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react'
import Main from '@/app/main'
import { usePathname } from 'next/navigation'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock components that might be complex or require browser APIs
jest.mock('@/components/BottomNavBar', () => {
  const MockBottomNavBar = () => <nav data-testid="bottom-nav-bar" />
  MockBottomNavBar.displayName = 'BottomNavBar'
  return MockBottomNavBar
})

jest.mock('@/components/Footer', () => {
  const MockFooter = () => <footer data-testid="footer" />
  MockFooter.displayName = 'Footer'
  return MockFooter
})

// Mock Providers to avoid complex setup and side effects like fetch
jest.mock('@/components/Providers', () => {
  const MockProviders = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-providers">{children}</div>
  )
  MockProviders.displayName = 'Providers'
  return MockProviders
})

// Mock notification provider
jest.mock('@/components/NotificationProvider', () => {
  const MockNotificationProvider = ({
    children,
  }: {
    children: React.ReactNode
  }) => <div data-testid="mock-notification-provider">{children}</div>
  MockNotificationProvider.displayName = 'NotificationProvider'
  return MockNotificationProvider
})

// Mock TimerSoundProvider
jest.mock('@/components/TimerSoundProvider', () => {
  const MockTimerSoundProvider = ({
    children,
  }: {
    children: React.ReactNode
  }) => <div data-testid="mock-timer-sound-provider">{children}</div>
  MockTimerSoundProvider.displayName = 'TimerSoundProvider'
  return MockTimerSoundProvider
})

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

describe('Main Layout Component', () => {
  beforeEach(() => {
    ;(usePathname as jest.Mock).mockReturnValue('/')
  })

  it('renders children within the main content layout', () => {
    render(
      <Main>
        <div data-testid="test-child">Child Content</div>
      </Main>
    )

    expect(screen.getByTestId('main-content-layout')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders global navigation and footer', () => {
    render(
      <Main>
        <div>Content</div>
      </Main>
    )

    expect(screen.getByTestId('bottom-nav-bar')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('wraps content in a role="main" container', () => {
    render(
      <Main>
        <div>Content</div>
      </Main>
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
