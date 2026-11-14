import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Tracks whether any donation UI component (DonationModal, DonateWidget,
 * FiatDonationForm) is currently mounted. Used by analytics hooks to suppress
 * third-party script loading while payment flows are active (gap G3 in the
 * payment-page script inventory).
 */

interface DonationActiveContextValue {
  /** True when at least one donation component is mounted */
  readonly isActive: boolean;
  /** Called on mount by a donation component */
  readonly register: () => () => void;
}

const DonationActiveContext = createContext<DonationActiveContextValue>({
  isActive: false,
  register: () => () => {
    // default no-op
  },
});

/**
 * Provides donation-active tracking to the component tree.
 * Wrap this around the section of the app that may render donation components.
 * @param props - Standard children prop
 * @returns Provider element
 */
export function DonationActiveProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const register = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
    return () => {
      countRef.current -= 1;
      setCount(countRef.current);
    };
  }, []);

  const value = useMemo<DonationActiveContextValue>(
    () => ({ isActive: count > 0, register }),
    [count, register],
  );

  return (
    <DonationActiveContext.Provider value={value}>
      {children}
    </DonationActiveContext.Provider>
  );
}

/**
 * Returns whether a donation UI component is currently mounted.
 * @returns Object with `isActive` boolean
 */
export function useDonationActive(): { isActive: boolean } {
  const { isActive } = useContext(DonationActiveContext);
  return { isActive };
}

/**
 * Call in a donation component's body to register it as active.
 * Automatically unregisters on unmount.
 */
export function useRegisterDonationActive(): void {
  const { register } = useContext(DonationActiveContext);

  React.useEffect(() => {
    const unregister = register();
    return unregister;
  }, [register]);
}
