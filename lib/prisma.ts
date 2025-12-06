// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
})

export default prisma
