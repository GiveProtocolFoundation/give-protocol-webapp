import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ActionButtons } from "../ActionButtons";

describe("ActionButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders successfully", () => {
    const { container } = render(
      <MemoryRouter>
        <ActionButtons />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the "Start Donating" text', () => {
    render(
      <MemoryRouter>
        <ActionButtons />
      </MemoryRouter>,
    );
    expect(screen.getByText("Start Donating")).toBeInTheDocument();
  });

  it("renders a link pointing to /browse", () => {
    render(
      <MemoryRouter>
        <ActionButtons />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/browse");
  });
});
