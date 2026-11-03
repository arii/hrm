/**
 * @jest-environment jsdom
 */
// tests/unit/components/Providers.test.tsx
import { render, waitFor } from '@testing-library/react'
import Providers from '@/components/Providers'

jest.mock('@/context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

describe('Providers session base path', () => {
  const realFetch = global.fetch
  let fetchMock: jest.Mock
  let savedBasePath: string | undefined
  let savedAuthUrl: string | undefined

  beforeEach(() => {
    savedBasePath = process.env.NEXT_PUBLIC_BASE_PATH
    savedAuthUrl = process.env.NEXTAUTH_URL
    delete process.env.NEXT_PUBLIC_BASE_PATH
    delete process.env.NEXTAUTH_URL
    fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
  })

  afterEach(() => {
    if (savedBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = savedBasePath
    if (savedAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = savedAuthUrl
    global.fetch = realFetch
  })

  function fetchedUrls(): string[] {
    return fetchMock.mock.calls.map((call) => String(call[0]))
  }

  it('fetches the session from site root without a base path', async () => {
    render(
      <Providers>
        <div />
      </Providers>
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchedUrls()).toContain('/api/auth/session')
  })

  it('keeps the session fetch inside the base path', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    render(
      <Providers>
        <div />
      </Providers>
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchedUrls()).toContain('/hrm/api/auth/session')
  })
})
