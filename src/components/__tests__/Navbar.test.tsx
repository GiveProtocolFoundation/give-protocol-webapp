import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "../Navbar";

// useTranslation, SettingsContext, CurrencyContext, docs config,
// Logo, and SettingsMenu are all mocked via moduleNameMapper

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "Give Protocol" brand name', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Give Protocol")).toBeInTheDocument();
  });

  it("renders the logo", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("logo")).toBeInTheDocument();
  });

  it("renders desktop navigation links", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();
  });

  it('renders the "Launch App" link', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Launch App")).toBeInTheDocument();
  });

  it("renders a mobile menu button", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeInTheDocument();
  });

  it("toggles mobile menu on button click", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    const menuButton = screen.getByRole("button");

    expect(screen.queryByText("Launch App")).toBeInTheDocument();

    fireEvent.click(menuButton);

    const mobileMenu = document.getElementById("mobile-menu");
    expect(mobileMenu).toBeInTheDocument();
  });

  it("renders the settings menu", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("settings-menu")).toBeInTheDocument();
  });
});
