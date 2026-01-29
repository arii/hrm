
export const mockGetHrZoneProps = jest.fn();

jest.mock('@/utils/visualization', () => ({
    getHrZoneProps: mockGetHrZoneProps,
}));
