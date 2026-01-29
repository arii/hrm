export const mockHrTileWrapper = jest.fn(({ user }) => (
  <div data-testid="mock-hr-tile">
    <p>{user.name}</p>
    <p>{user.value}</p>
  </div>
))

jest.mock('@/components/HrTileWrapper', () => ({
  __esModule: true,
  default: mockHrTileWrapper,
}))
