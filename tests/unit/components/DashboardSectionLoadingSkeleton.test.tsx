/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import DashboardSectionLoadingSkeleton from '../../../components/DashboardSectionLoadingSkeleton';

describe('DashboardSectionLoadingSkeleton', () => {
  it('renders with default props and matches snapshot', () => {
    const { asFragment } = render(<DashboardSectionLoadingSkeleton />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders with custom props and matches snapshot', () => {
    const { asFragment } = render(
      <DashboardSectionLoadingSkeleton
        width={200}
        height="50px"
        shape="circle"
        count={3}
        className="custom-skeleton"
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a single skeleton when count is 1 and matches snapshot', () => {
    const { asFragment } = render(<DashboardSectionLoadingSkeleton count={1} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders multiple skeletons when count is greater than 1 and matches snapshot', () => {
    const { asFragment } = render(<DashboardSectionLoadingSkeleton count={5} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
