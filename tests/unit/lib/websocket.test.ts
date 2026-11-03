/**
 * @jest-environment node
 */
// tests/unit/lib/websocket.test.ts
import { WebSocketManager } from '@/lib/websocket'

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
