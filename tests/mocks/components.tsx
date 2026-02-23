const mockHrTile = jest.fn((props) => (
  <div data-testid="mock-hr-tile" data-is-stale={props.isDataStale}>
    <p>{props.name}</p>
    <p>{props.value}</p>
  </div>
))

jest.mock('@/components/HrTile', () => ({
  __esModule: true,
  default: mockHrTile,
}))
