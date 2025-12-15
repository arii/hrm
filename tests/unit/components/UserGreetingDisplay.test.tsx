/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import UserGreetingDisplay from '@/components/UserGreetingDisplay'
import { useSession } from 'next-auth/react'

jest.mock('next-auth/react')

describe('UserGreetingDisplay', () => {
  it('renders correctly for a logged-out user', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    const { container } = render(<UserGreetingDisplay />)
    expect(container).toMatchSnapshot()
  })

  it('renders correctly for a logged-in user', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
        },
      },
      status: 'authenticated',
    })
    const { container } = render(<UserGreetingDisplay />)
    expect(container).toMatchSnapshot()
  })
})
