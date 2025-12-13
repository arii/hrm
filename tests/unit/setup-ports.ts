import getPort from 'get-port'

module.exports = async () => {
  process.env.PORT = String(await getPort({ port: 3003 }))
  process.env.WS_PORT = String(await getPort({ port: 3004 }))
}
