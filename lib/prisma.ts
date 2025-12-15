// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Declare a global variable to hold the Prisma client instance.
// This is done to ensure that the Prisma client is only instantiated once
// across the entire application, preventing connection pool exhaustion.
declare global {
  var prisma: PrismaClient | undefined
}

// Instantiate the Prisma client. If the global prisma object already exists,
// use it; otherwise, create a new instance. In a non-production environment,
// the global object is used to persist the client across hot reloads.
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

// In a non-production environment, assign the Prisma client to the global
// object. This ensures that the same client instance is used across hot
// reloads, preventing the creation of new clients on every reload.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
