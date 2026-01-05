// File: lib/middleware/staticAssets.ts
import express from 'express'
import path from 'path'
import { env } from '../env'

export const setupStaticAssets = (expressApp: any) => {
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
