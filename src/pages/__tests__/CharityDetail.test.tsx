import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharityDetail from "../CharityDetail";

const renderComponent = (charityId = "test-charity-123") =>
  render(
    <MemoryRouter initialEntries={[`/charity/${charityId}`]}>
      <Routes>
        <Route path="/charity/:id" element={<CharityDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("CharityDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the scroll reveal wrapper", () => {
      renderComponent();
      expect(screen.getByTestId("scroll-reveal")).toBeInTheDocument();
    });

    it("renders the charity page template", () => {
      renderComponent();
      expect(
        screen.getByTestId("charity-page-template"),
      ).toBeInTheDocument();
    });

    it("renders the charity name", () => {
      renderComponent();
      expect(
        screen.getByText("Ocean Conservation Alliance"),
      ).toBeInTheDocument();
    });

    it("renders the charity description", () => {
      renderComponent();
      expect(
        screen.getByText(
          /Protecting marine ecosystems and promoting sustainable ocean practices/,
        ),
      ).toBeInTheDocument();
    });

    it("renders the charity category", () => {
      renderComponent();
      expect(screen.getByText("Environmental")).toBeInTheDocument();
    });
  });

  describe("Route parameter", () => {
    it("renders with the provided charity id from route", () => {
      renderComponent("my-charity-id");
      // The component uses the id param for the data object but the template
      // always shows the hardcoded sample name
      expect(
        screen.getByTestId("charity-page-template"),
      ).toBeInTheDocument();
    });
  });
});
