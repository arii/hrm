// File: lib/middleware/staticAssets.ts
import express, { Express } from 'express'
import path from 'path'
import { env } from '../env.js'

export const setupStaticAssets = (expressApp: Express) => {
  if (env.NODE_ENV === 'production') {
    const isDeployment = process.env.IS_DEPLOYMENT === 'true'
    const nextDir = isDeployment ? '.next_prod' : '.next'
    const staticPath = path.join(process.cwd(), nextDir, 'static')
    expressApp.use(
      '/_next/static',
      express.static(staticPath, {
        immutable: true,
        maxAge: '1y',
      })
    )
  }
}
