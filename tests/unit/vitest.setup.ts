import dotenv from 'dotenv'
import path from 'path'
import matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

expect.extend(matchers)
