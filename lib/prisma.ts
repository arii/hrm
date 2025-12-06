// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: 'file:./dev.db',
})

export default prisma
