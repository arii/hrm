// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import {- better-sqlite3 as Database } from 'better-sqlite3'

const adapter = new PrismaBetterSqlite3(new Database('dev.db'))
const prisma = new PrismaClient({ adapter })

export default prisma
