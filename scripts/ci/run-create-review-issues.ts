#!/usr/bin/env ts-node
import { run, GitHubClient } from '../create-review-issues'

const client = new GitHubClient()
const prNumber = process.env.PR_NUMBER
const reviewFile = 'review_result.json'

run(client, prNumber || '', reviewFile).catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
