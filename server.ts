import './utils/logger' // Initialize logger first
import { AppServer } from './services/appServer' //
import logger from './utils/logger'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'

async function main() {
  const server = new AppServer({ dev, port, hostname })

  try {
    await server.initialize()
    server.start()

    // Graceful Shutdown Handling
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received: closing HTTP server`)
      try {
        await server.stop()
        process.exit(0)
      } catch (err) {
        logger.error({ err }, 'Error during shutdown')
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

  } catch (err) {
    logger.error({ err }, 'Startup failed')
    process.exit(1)
  }
}

main()
