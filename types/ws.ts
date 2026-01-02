import { WebSocket } from 'ws'

export interface IWebSocket extends WebSocket {
  isAlive: boolean
}
