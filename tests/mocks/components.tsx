jest.mock('@/components/HrTile', () => ({
  __esModule: true,
  default: jest.fn((props) => (
    <div data-testid="mock-hr-tile" data-is-stale={props.isDataStale}>
      <p>{props.name}</p>
      <p>{props.value}</p>
    </div>
  )),
}))
