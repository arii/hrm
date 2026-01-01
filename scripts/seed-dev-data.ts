// scripts/seed-dev-data.ts
import WebSocket from 'ws'

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'ws://127.0.0.1:3000/ws'

const ws = new WebSocket(WEBSOCKET_URL)
let messageCounter = 0

const send = (msg: object): Promise<void> => {
  return new Promise((resolve, reject) => {
    const msgString = JSON.stringify({ ...msg, messageId: ++messageCounter })

    ws.send(msgString, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

const run = async () => {
  // Set timer to a known state
  await send({ type: 'SET_MODE', mode: 'TABATA' })
  await send({
    type: 'TIMER_CONFIG',
    workDuration: 15,
    restDuration: 5,
  })
  await send({ type: 'TIMER_COMMAND', command: 'START' })

  // Mock HR data
  await send({
    type: 'HRM_INPUT',
    data: { name: 'Dev-Dummy-1', value: 120, age: 30, maxHr: 190 },
  })
  await send({
    type: 'HRM_INPUT',
    data: { name: 'Dev-Dummy-2', value: 95, age: 25, maxHr: 195 },
  })

  // Mock Spotify playback by sending a command
  await send({
    type: 'SPOTIFY_COMMAND',
    command: 'PLAY',
    // Note: This requires a valid deviceId and active Spotify session to work.
    // This is a best-effort seed for development purposes.
    deviceId: 'development-mock-device',
    playlistUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  })

  ws.close()
}

ws.on('open', () => {
  run().catch((err) => {
    ws.close()
  })
})

ws.on('message', (data) => {})

ws.on('close', () => {})

ws.on('error', (error) => {})
