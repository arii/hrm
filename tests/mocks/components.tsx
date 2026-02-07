export const mockHrTileWrapper = jest.fn(
  ({ name, value, isDataStale, calories }) => (
    <div data-testid="mock-hr-tile" data-is-stale={isDataStale}>
      <p>{name}</p>
      <p>{value}</p>
      <p>kCal: {calories}</p>
    </div>
  )
)

jest.mock('@/components/HrTileWrapper', () => ({
  __esModule: true,
  default: mockHrTileWrapper,
}))
