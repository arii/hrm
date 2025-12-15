// File: scripts/rate-limit-test-runner.js
/**
 * Description: Standalone script to test rate limiting.
 */

import fetch from 'node-fetch'

const endpoint = 'http://127.0.0.1:3000/api/health'
const maxRequests = 200
const totalRequests = maxRequests + 20

const runTest = async () => {
  try {
    const promises = []
    for (let i = 0; i < totalRequests; i++) {
      promises.push(fetch(endpoint))
    }
    const responses = await Promise.all(promises)
    const rateLimitedResponse = responses.find((res) => res.status === 429)

    if (rateLimitedResponse) {
      console.log('Rate limit test passed!')
      process.exit(0)
    } else {
      console.error('Rate limit test failed: No 429 response received.')
      process.exit(1)
    }
  } catch (error) {
    console.error('An error occurred during the test:', error)
    process.exit(1)
  }
}

runTest()
