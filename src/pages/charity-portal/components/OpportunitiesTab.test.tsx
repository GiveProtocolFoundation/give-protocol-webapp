import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OpportunitiesTab } from "./OpportunitiesTab";

/* eslint-disable react/prop-types */
jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));
/* eslint-enable react/prop-types */

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

jest.mock("@/types/charity", () => ({
  MAX_OPPORTUNITIES_PER_CHARITY: 10,
}));

const makeOpportunity = (id: string, status = "active") => ({
  id,
  title: `Opportunity ${id}`,
  description: "A test opportunity",
  skills: ["Coding"],
  commitment: "5 hrs/week",
  location: "Remote",
  type: "virtual",
  work_language: "English",
  status,
  created_at: "2024-01-01",
});

describe("OpportunitiesTab", () => {
  it("renders empty state when no opportunities", () => {
    render(
      <MemoryRouter>
        <OpportunitiesTab
          opportunities={[]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("No opportunities yet")).toBeTruthy();
  });

  it("renders opportunity list", () => {
    render(
      <MemoryRouter>
        <OpportunitiesTab
          opportunities={[makeOpportunity("o1"), makeOpportunity("o2")]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Opportunity o1")).toBeTruthy();
    expect(screen.getByText("Opportunity o2")).toBeTruthy();
  });

  it("calls onEdit with opportunity id when Edit button clicked", () => {
    const onEdit = jest.fn();
    render(
      <MemoryRouter>
        <OpportunitiesTab
          opportunities={[makeOpportunity("opp-abc")]}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );
    const editBtn = screen.getByTitle("Edit");
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith("opp-abc");
  });

  it("calls onDelete with opportunity id when Delete button clicked", () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <OpportunitiesTab
          opportunities={[makeOpportunity("opp-xyz")]}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    const deleteBtn = screen.getByTitle("Delete");
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith("opp-xyz");
  });
});
