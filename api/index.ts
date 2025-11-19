import { startServer } from '../src/server'

let appInstance: Awaited<ReturnType<typeof startServer>>

async function getServer() {
  if (!appInstance) {
    appInstance = await startServer(true)
  }
  return appInstance
}

export default async function handler(req: any, res: any) {
  const app = await getServer()
  
  app.ready((err) => {
    if (err) throw err;
    app.server.emit('request', req, res);
  })
}