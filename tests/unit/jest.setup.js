// tests/unit/jest.setup.js
/* eslint-disable @typescript-eslint/no-var-requires */
require('@testing-library/jest-dom')
const dotenv = require('dotenv')
dotenv.config({ path: './.env.test' })
