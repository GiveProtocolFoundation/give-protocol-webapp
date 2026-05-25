import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import EducationAccessProgram from "./EducationAccessProgram";

describe("EducationAccessProgram", () => {
  it("should render without crashing", () => {
    const { container } = render(<EducationAccessProgram />);
    expect(container).toBeDefined();
  });
});
