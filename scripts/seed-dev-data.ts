// scripts/seed-dev-data.ts
import WebSocket from 'ws'
import logger from '../utils/logger.js'

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'ws://127.0.0.1:3000/ws'

const ws = new WebSocket(WEBSOCKET_URL)
let messageCounter = 0

const send = (msg: object): Promise<void> => {
  return new Promise((resolve, reject) => {
    const msgString = JSON.stringify({ ...msg, messageId: ++messageCounter })
    logger.info('[SEED] SEND', { message: msgString })

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
  logger.info('[SEED] Timer seeded')

  // Mock HR data
  await send({
    type: 'HRM_INPUT',
    data: { name: 'Dev-Dummy-1', value: 120, age: 30, maxHr: 190 },
  })
  await send({
    type: 'HRM_INPUT',
    data: { name: 'Dev-Dummy-2', value: 95, age: 25, maxHr: 195 },
  })
  logger.info('[SEED] HR data seeded')

  // Mock Spotify playback by sending a command
  await send({
    type: 'SPOTIFY_COMMAND',
    command: 'PLAY',
    // Note: This requires a valid deviceId and active Spotify session to work.
    // This is a best-effort seed for development purposes.
    deviceId: 'development-mock-device',
    playlistUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  })
  logger.info('[SEED] Spotify command sent')

  logger.info('✅ Development data seeded')
  ws.close()
}

ws.on('open', () => {
  logger.info('[SEED] WebSocket connection opened')
  run().catch((err) => {
    logger.error('[SEED] Error running seed script', { err })
    ws.close()
  })
})

ws.on('message', (data) => {
  logger.info('[SEED] RECV', { data: data.toString() })
})

ws.on('close', () => {
  logger.info('[SEED] WebSocket connection closed')
})

ws.on('error', (error) => {
  logger.error('[SEED] WebSocket error', { message: error.message })
})
