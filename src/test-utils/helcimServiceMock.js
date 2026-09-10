// Mock for @/services/helcimService (GIV-984)
// Mapped via moduleNameMapper (alias-only) so useFiatDonation's script-load
// watchdog can be tested in ESM mode without hitting the real script loader.
// helcimService.test.ts imports "./helcimService" relatively and is unaffected.
import { jest } from "@jest/globals";

export const loadHelcimScript = jest.fn(() => Promise.resolve());
export const resetHelcimScriptState = jest.fn();
export const fetchHelcimCheckoutToken = jest.fn();
export const openHelcimCheckout = jest.fn();
export const validateHelcimPayment = jest.fn();
