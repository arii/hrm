/* global jest */
// tests/unit/__mocks__/better-sqlite3.js
'use strict'

// This file mocks the 'better-sqlite3' module, which is a native addon that
// cannot be run in the Jest test environment. This mock provides the necessary
// methods and structure to allow tests that interact with the database service
// to run without errors.

const mockStatement = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
}

const mockDb = {
  prepare: jest.fn(() => mockStatement),
  exec: jest.fn(),
  pragma: jest.fn(),
  close: jest.fn(),
  transaction: jest.fn((fn) => fn),
}

// The default export of 'better-sqlite3' is a constructor function.
// We mock it to return our mock database instance.
const Database = jest.fn(() => mockDb)

module.exports = Database
