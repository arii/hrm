import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import 'express-async-errors'
import request from 'supertest'

describe('Async Error Handling', () => {
  it('should catch errors in async route handlers', async () => {
    const app = express()

    app.get('/error', async (_req, _res) => {
      throw new Error('test error')
    })

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).send({ error: err.message })
    })

    const response = await request(app).get('/error')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'test error' })
  })
})
