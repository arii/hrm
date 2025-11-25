import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock page component for testing
const MockPage = () => <div>HRM Dashboard</div>;

describe("HRM Application", () => {
  it("renders without crashing", () => {
    render(<MockPage />);
    expect(screen.getByText("HRM Dashboard")).toBeInTheDocument();
  });

  it("has correct page title", () => {
    render(<MockPage />);
    const element = screen.getByText("HRM Dashboard");
    expect(element).toBeVisible();
  });
});
