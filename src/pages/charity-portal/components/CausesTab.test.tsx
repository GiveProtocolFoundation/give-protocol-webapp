import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CausesTab } from "./CausesTab";

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

jest.mock("@/components/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>${amount}</span>,
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

jest.mock("@/types/charity", () => ({
  MAX_CAUSES_PER_CHARITY: 10,
}));

const makeCause = (id: string, status = "active") => ({
  id,
  name: `Cause ${id}`,
  description: "A test cause",
  target_amount: 1000,
  raised_amount: 500,
  category: "Education",
  image_url: null,
  location: "NYC",
  timeline: null,
  status,
  created_at: "2024-01-01",
});

describe("CausesTab", () => {
  it("renders empty state when no causes", () => {
    render(
      <MemoryRouter>
        <CausesTab causes={[]} onEdit={jest.fn()} onDelete={jest.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("No causes yet")).toBeTruthy();
  });

  it("renders cause list", () => {
    render(
      <MemoryRouter>
        <CausesTab
          causes={[makeCause("c1"), makeCause("c2")]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Cause c1")).toBeTruthy();
    expect(screen.getByText("Cause c2")).toBeTruthy();
  });

  it("calls onEdit with cause id when Edit button clicked", () => {
    const onEdit = jest.fn();
    render(
      <MemoryRouter>
        <CausesTab
          causes={[makeCause("cause-abc")]}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      </MemoryRouter>,
    );
    const editBtn = screen.getByTitle("Edit");
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith("cause-abc");
  });

  it("calls onDelete with cause id when Delete button clicked", () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <CausesTab
          causes={[makeCause("cause-xyz")]}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    const deleteBtn = screen.getByTitle("Delete");
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith("cause-xyz");
  });
});
