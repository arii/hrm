require('@testing-library/jest-dom')

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}))
