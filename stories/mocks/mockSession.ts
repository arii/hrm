import { Session } from 'next-auth'

export const mockSession: Session = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://via.placeholder.com/150',
    id: '1',
  },
  expires: '2099-01-01T00:00:00.000Z',
}
