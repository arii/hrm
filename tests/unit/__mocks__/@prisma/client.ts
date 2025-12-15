// tests/unit/__mocks__/@prisma/client.js
export const PrismaClient = jest.fn(() => ({
  account: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  // Add other models and methods as needed for your tests
}))
