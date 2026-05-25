import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateOpportunity from "./CreateOpportunity";

describe("CreateOpportunity", () => {
  it("should render back button and opportunity form", () => {
    render(
      <MemoryRouter>
        <CreateOpportunity />
      </MemoryRouter>,
    );
    expect(screen.getByText("Back")).toBeTruthy();
  });
});
