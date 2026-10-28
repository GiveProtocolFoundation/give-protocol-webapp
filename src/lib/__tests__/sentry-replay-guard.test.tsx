import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, act } from "@testing-library/react";
import { DonationActiveProvider, useRegisterDonationActive } from "../../lib/consent/DonationActiveContext";
import { useSentryReplayGuard } from "../../lib/consent/useSentryReplayGuard";
import { pauseSentryReplay, resumeSentryReplay } from "@/lib/sentry";

/**
 * Component that calls useSentryReplayGuard — must be inside DonationActiveProvider.
 */
function ReplayGuard() {
  useSentryReplayGuard();
  return null;
}

/** Fake donation component that registers as active */
function FakeDonation() {
  useRegisterDonationActive();
  return <span data-testid="donation">mounted</span>;
}

describe("useSentryReplayGuard (G7)", () => {
  beforeEach(() => {
    (pauseSentryReplay as jest.Mock).mockClear();
    (resumeSentryReplay as jest.Mock).mockClear();
  });

  it("calls pauseSentryReplay when a donation component mounts", () => {
    const { unmount } = render(
      <DonationActiveProvider>
        <ReplayGuard />
        <FakeDonation />
      </DonationActiveProvider>,
    );

    expect(pauseSentryReplay).toHaveBeenCalled();

    unmount();
  });

  it("calls resumeSentryReplay when all donation components unmount", () => {
    /**
     * Wrapper that can conditionally render the donation component.
     */
    function Wrapper({ showDonation }: { showDonation: boolean }) {
      return (
        <DonationActiveProvider>
          <ReplayGuard />
          {showDonation && <FakeDonation />}
        </DonationActiveProvider>
      );
    }

    const { rerender } = render(<Wrapper showDonation={true} />);
    expect(pauseSentryReplay).toHaveBeenCalled();

    (resumeSentryReplay as jest.Mock).mockClear();
    act(() => {
      rerender(<Wrapper showDonation={false} />);
    });

    expect(resumeSentryReplay).toHaveBeenCalled();
  });

  it("does not call pauseSentryReplay when no donation is active", () => {
    render(
      <DonationActiveProvider>
        <ReplayGuard />
      </DonationActiveProvider>,
    );

    expect(pauseSentryReplay).not.toHaveBeenCalled();
  });
});
