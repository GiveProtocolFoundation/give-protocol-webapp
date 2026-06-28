/**
 * Mock for @simplewebauthn/browser used by usePasskeyAuth.
 * The dynamic import() in the hook resolves to this module in Jest.
 */
import { jest } from "@jest/globals";

export const startRegistration = jest.fn().mockResolvedValue({
  id: "mock-credential-id",
  rawId: "mock-raw-id",
  response: {
    clientDataJSON: "mock-client-data",
    attestationObject: "mock-attestation",
  },
  type: "public-key",
  authenticatorAttachment: "platform",
});

export const startAuthentication = jest.fn().mockResolvedValue({
  id: "mock-credential-id",
  rawId: "mock-raw-id",
  response: {
    clientDataJSON: "mock-client-data",
    authenticatorData: "mock-auth-data",
    signature: "mock-signature",
  },
  type: "public-key",
});
