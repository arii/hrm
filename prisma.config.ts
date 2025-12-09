import 'dotenv/config'
import { defineConfig } from "prisma/config";

const schema = process.env.NODE_ENV === 'production' ? 'prisma/schema.prisma' : 'prisma/schema.dev.prisma';

export default defineConfig({
  schema: schema,
  datasource: {
    url: process.env.DATABASE_URL ?? ''
  }
});