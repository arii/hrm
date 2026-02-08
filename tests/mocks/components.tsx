export const mockHrTileWrapper = jest.fn(({ user, isDataStale }) => (
  <div data-testid="mock-hr-tile" data-is-stale={isDataStale}>
    <p>{user.name}</p>
    <p>{user.value}</p>
  </div>
))

jest.mock('@/components/HrTileWrapper', () => ({
  __esModule: true,
  default: mockHrTileWrapper,
}))
