import 'dotenv/config'
import { defineConfig, env } from "prisma/config";

const schema = process.env.NODE_ENV === 'production' ? 'prisma/schema.prisma' : 'prisma/schema.dev.prisma';

export default defineConfig({
  schema: schema,
  datasource: {
    url: env("DATABASE_URL")
  }
});