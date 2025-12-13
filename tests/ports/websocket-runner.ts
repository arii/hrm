// This file is a dedicated runner for testing the WebSocket server in a child process.
import { WebSocketServer } from 'ws'
import { startWebSocketServer } from '../../websocketServer'

const wss = new WebSocketServer({ noServer: true })
startWebSocketServer(wss)
