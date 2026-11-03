/**
 * @jest-environment node
 */
// tests/unit/lib/websocket.test.ts
import {
  WebSocketManager,
  createWsConnectionLimiter,
  isAppWsUpgrade,
} from '@/lib/websocket'
import { Socket } from 'net'

let savedBasePath: string | undefined
let savedAuthUrl: string | undefined

beforeEach(() => {
  savedBasePath = process.env.NEXT_PUBLIC_BASE_PATH
  savedAuthUrl = process.env.NEXTAUTH_URL
  delete process.env.NEXT_PUBLIC_BASE_PATH
  delete process.env.NEXTAUTH_URL
})

afterEach(() => {
  if (savedBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
  else process.env.NEXT_PUBLIC_BASE_PATH = savedBasePath
  if (savedAuthUrl === undefined) delete process.env.NEXTAUTH_URL
  else process.env.NEXTAUTH_URL = savedAuthUrl
  jest.restoreAllMocks()
})

function upgrade(url: string) {
  // Fresh manager per call: jest.spyOn reuses an existing mock, so sharing
  // one manager across assertions would accumulate call counts.
  const manager = new WebSocketManager()
  const spy = jest.spyOn(manager.wss, 'handleUpgrade').mockImplementation(((
    _req,
    _socket,
    _head,
    cb
  ) => {
    cb({} as never)
  }) as never)
  manager.handleUpgrade(
    { url, headers: {} } as never,
    {} as never,
    Buffer.alloc(0)
  )
  return spy
}

describe('WebSocketManager.handleUpgrade', () => {
  it('upgrades /ws at root', () => {
    expect(upgrade('/ws?clientId=a')).toHaveBeenCalledTimes(1)
  })

  it('ignores non-ws paths at root', () => {
    expect(upgrade('/hrm/ws?clientId=a')).not.toHaveBeenCalled()
    expect(upgrade('/nope')).not.toHaveBeenCalled()
  })

  it('upgrades the basePath-prefixed and bare paths when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(upgrade('/hrm/ws?clientId=a')).toHaveBeenCalledTimes(1)
    expect(upgrade('/ws?clientId=a')).toHaveBeenCalledTimes(1)
    expect(upgrade('/hrm/nope')).not.toHaveBeenCalled()
  })
})

describe('isAppWsUpgrade', () => {
  it('matches only the app socket, never HMR or pages', () => {
    expect(isAppWsUpgrade('/ws?clientId=a')).toBe(true)
    expect(isAppWsUpgrade('/_next/webpack-hmr')).toBe(false)
    expect(isAppWsUpgrade('/')).toBe(false)
    expect(isAppWsUpgrade(undefined)).toBe(false)
  })

  it('matches the prefixed path when basePath is configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    expect(isAppWsUpgrade('/hrm/ws?clientId=a')).toBe(true)
    expect(isAppWsUpgrade('/hrm/_next/webpack-hmr')).toBe(false)
  })
})

describe('createWsConnectionLimiter', () => {
  const fakeSocket = (destroyed = false) =>
    ({
      destroyed,
      on: jest.fn(),
    }) as unknown as Socket

  it('allows upgrades under the cap and rejects at the cap', () => {
    const limiter = createWsConnectionLimiter(2)
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(true)
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(true)
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(false)
    // A different IP has its own budget.
    expect(limiter.checkAndTrack('5.6.7.8', fakeSocket())).toBe(true)
  })

  it('frees the slot when the socket closes', () => {
    const limiter = createWsConnectionLimiter(1)
    const socket = fakeSocket()
    expect(limiter.checkAndTrack('1.2.3.4', socket)).toBe(true)
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(false)
    const onClose = (socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'close'
    )?.[1] as () => void
    expect(onClose).toBeDefined()
    onClose()
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(true)
  })

  it('sweeps destroyed sockets that never emitted close', () => {
    const limiter = createWsConnectionLimiter(1)
    const leaked = fakeSocket()
    expect(limiter.checkAndTrack('1.2.3.4', leaked)).toBe(true)
    ;(leaked as { destroyed: boolean }).destroyed = true
    expect(limiter.checkAndTrack('1.2.3.4', fakeSocket())).toBe(true)
  })
})
