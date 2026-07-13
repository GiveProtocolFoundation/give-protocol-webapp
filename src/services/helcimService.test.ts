import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import {
  processPayment,
  createSubscription,
  fetchHelcimCheckoutToken,
  loadHelcimScript,
  resetHelcimScriptState,
  openHelcimCheckout,
  validateHelcimPayment,
} from "./helcimService";
import type { FiatPaymentData } from "@/components/web3/donation/types/donation";

// Mock the Logger
jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

const MOCK_CHECKOUT_TOKEN = "TESTONLY-chk-000";
const MOCK_SECRET_TOKEN = "TESTONLY-sec-000";

const mockPaymentData: FiatPaymentData = {
  checkoutToken: MOCK_CHECKOUT_TOKEN,
  amount: 50,
  coverFees: true,
  charityId: "charity-123",
  charityName: "Test Charity",
  name: "John Doe",
  email: "john@example.com",
  frequency: "once",
};

describe("helcimService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    delete window.appendHelcimPayIframe;
    delete window.removeHelcimPayIframe;
    resetHelcimScriptState();
  });

  afterEach(() => {
    document
      .querySelectorAll('script[src*="helcim-pay"]')
      .forEach((el) => el.remove());
    delete window.appendHelcimPayIframe;
    delete window.removeHelcimPayIframe;
  });

  describe("processPayment", () => {
    it("should process a successful payment", async () => {
      const mockResponse = {
        success: true,
        transactionId: "txn-456",
        approvalCode: "APR-789",
        cardType: "Visa",
        cardLastFour: "4242",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await processPayment(mockPaymentData);

      expect(result).toEqual({
        transactionId: "txn-456",
        approvalCode: "APR-789",
        amountCents: 5000,
        cardType: "Visa",
        cardLastFour: "4242",
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.amount).toBe(5000);
      expect(body.charityId).toBe("charity-123");
      expect(body.donorName).toBe("John Doe");
    });

    it("should throw on failed payment response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, error: "Card declined" }),
      } as unknown as Response);

      await expect(processPayment(mockPaymentData)).rejects.toThrow(
        "Card declined",
      );
    });

    it("should throw default message when no error provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      } as Response);

      await expect(processPayment(mockPaymentData)).rejects.toThrow(
        "Payment processing failed",
      );
    });

    it("should return empty strings for missing optional fields", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await processPayment(mockPaymentData);

      expect(result.transactionId).toBe("");
      expect(result.approvalCode).toBe("");
    });
  });

  describe("createSubscription", () => {
    it("should create a successful subscription", async () => {
      const mockResponse = {
        success: true,
        subscriptionId: "sub-123",
        customerId: "cust-456",
        nextBillingDate: "2026-03-12",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await createSubscription(mockPaymentData);

      expect(result).toEqual({
        subscriptionId: "sub-123",
        customerId: "cust-456",
        nextBillingDate: "2026-03-12",
      });
    });

    it("should throw on failed subscription response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: "Server error" }),
      } as unknown as Response);

      await expect(createSubscription(mockPaymentData)).rejects.toThrow(
        "Server error",
      );
    });

    it("should throw default message when no error provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      } as Response);

      await expect(createSubscription(mockPaymentData)).rejects.toThrow(
        "Subscription creation failed",
      );
    });

    it("should return empty strings for missing optional fields", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await createSubscription(mockPaymentData);

      expect(result.subscriptionId).toBe("");
      expect(result.customerId).toBe("");
      expect(result.nextBillingDate).toBe("");
    });
  });

  describe("fetchHelcimCheckoutToken", () => {
    it("should fetch checkout token for one-time donation", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            checkoutToken: MOCK_CHECKOUT_TOKEN,
            secretToken: MOCK_SECRET_TOKEN,
          }),
      } as Response);

      const result = await fetchHelcimCheckoutToken(25, "once");

      expect(result).toEqual({
        checkoutToken: MOCK_CHECKOUT_TOKEN,
        secretToken: MOCK_SECRET_TOKEN,
      });

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.donationType).toBe("one-time");
      expect(body.amount).toBe(25);
      expect(body.currency).toBe("USD");
    });

    it("should fetch checkout token for monthly donation", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            checkoutToken: MOCK_CHECKOUT_TOKEN,
            secretToken: MOCK_SECRET_TOKEN,
          }),
      } as Response);

      await fetchHelcimCheckoutToken(25, "monthly");

      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(body.donationType).toBe("subscription");
    });

    it("should throw when response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: "Unauthorized" }),
      } as unknown as Response);

      await expect(fetchHelcimCheckoutToken(25, "once")).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should throw default message when no error provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      } as Response);

      await expect(fetchHelcimCheckoutToken(25, "once")).rejects.toThrow(
        "Failed to initialize payment form",
      );
    });

    it("should throw when no checkout token in response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, checkoutToken: "" }),
      } as Response);

      await expect(fetchHelcimCheckoutToken(25, "once")).rejects.toThrow(
        "No checkout token received",
      );
    });

    it("should return empty string for missing secretToken", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, checkoutToken: "tok-123" }),
      } as Response);

      const result = await fetchHelcimCheckoutToken(25, "once");
      expect(result.secretToken).toBe("");
    });
  });

  describe("loadHelcimScript", () => {
    it("should resolve immediately when appendHelcimPayIframe already exists", async () => {
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;

      await expect(loadHelcimScript()).resolves.toBeUndefined();
    });

    it("should create a script tag and resolve when global becomes available", async () => {
      jest.useFakeTimers();

      const promise = loadHelcimScript();

      const script = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      expect(script).not.toBeNull();

      // Simulate script load, then global appears
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      script.onload?.(new Event("load"));

      jest.advanceTimersByTime(300);

      await promise;
      jest.useRealTimers();
    });

    it("should reject when script fails to load", async () => {
      const promise = loadHelcimScript();

      const script = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      script.onerror?.(new Event("error"));

      await expect(promise).rejects.toThrow("Failed to load payment processor");
    });

    it("should return the same promise when called multiple times", async () => {
      const promise1 = loadHelcimScript();
      const promise2 = loadHelcimScript();

      expect(promise1).toBe(promise2);

      const script = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      script.onerror?.(new Event("error"));

      await expect(promise1).rejects.toThrow();
    });

    it("should reject when global not available after timeout", async () => {
      jest.useFakeTimers();

      const promise = loadHelcimScript();

      const script = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      script.onload?.(new Event("load"));

      // Advance past the 5s timeout
      jest.advanceTimersByTime(5100);

      await expect(promise).rejects.toThrow(
        "HelcimPay.js not ready after 5000ms",
      );
      jest.useRealTimers();
    });

    it("should handle existing script tag and wait for load", async () => {
      jest.useFakeTimers();

      const existingScript = document.createElement("script");
      existingScript.src =
        "https://secure.helcim.app/helcim-pay/services/start.js";
      document.head.appendChild(existingScript);

      const promise = loadHelcimScript();

      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      existingScript.dispatchEvent(new Event("load"));

      jest.advanceTimersByTime(300);

      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });

    it("should handle existing script tag with error", async () => {
      const existingScript = document.createElement("script");
      existingScript.src =
        "https://secure.helcim.app/helcim-pay/services/start.js";
      document.head.appendChild(existingScript);

      const promise = loadHelcimScript();

      existingScript.dispatchEvent(new Event("error"));

      await expect(promise).rejects.toThrow("Failed to load payment processor");
    });

    it("should resolve immediately for existing script when global already available", async () => {
      const existingScript = document.createElement("script");
      existingScript.src =
        "https://secure.helcim.app/helcim-pay/services/start.js";
      document.head.appendChild(existingScript);

      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;

      await expect(loadHelcimScript()).resolves.toBeUndefined();
    });
  });

  describe("resetHelcimScriptState", () => {
    it("should allow a fresh load after reset", async () => {
      jest.useFakeTimers();

      const promise1 = loadHelcimScript();
      const script1 = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      script1.onerror?.(new Event("error"));
      await expect(promise1).rejects.toThrow();

      script1.remove();
      resetHelcimScriptState();

      const promise2 = loadHelcimScript();
      const script2 = document.querySelector(
        'script[src*="helcim-pay"]',
      ) as HTMLScriptElement;
      expect(script2).not.toBeNull();

      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      script2.onload?.(new Event("load"));
      jest.advanceTimersByTime(300);

      await promise2;
      jest.useRealTimers();
    });
  });

  describe("openHelcimCheckout", () => {
    it("should reject when script is not loaded", async () => {
      await expect(openHelcimCheckout("token-123")).rejects.toThrow(
        "HelcimPay.js not loaded",
      );
    });

    it("should open iframe and resolve on SUCCESS message", async () => {
      const mockAppend = jest.fn();
      const mockRemove = jest.fn();
      window.appendHelcimPayIframe =
        mockAppend as unknown as typeof window.appendHelcimPayIframe;
      window.removeHelcimPayIframe = mockRemove;

      const promise = openHelcimCheckout("token-123", "test@example.com");

      expect(mockAppend).toHaveBeenCalledWith(
        "token-123",
        true,
        "",
        "test@example.com",
      );

      // Simulate SUCCESS message from iframe
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "SUCCESS",
            eventMessage: {
              data: {
                transactionId: "txn-999",
                approvalCode: "APR-111",
                cardNumber: "400000XXXX1234",
                amount: "50.00",
              },
              hash: "abc123hash",
            },
          },
        }),
      );

      const result = await promise;
      expect(result.data.transactionId).toBe("txn-999");
      expect(result.data.approvalCode).toBe("APR-111");
      expect(result.hash).toBe("abc123hash");
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it("should reject on ABORTED message and cleanup iframe", async () => {
      const mockRemove = jest.fn();
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      window.removeHelcimPayIframe = mockRemove;

      const promise = openHelcimCheckout("token-123");

      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "ABORTED",
            eventMessage: "Card declined",
          },
        }),
      );

      await expect(promise).rejects.toThrow("Card declined");
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it("should reject on HIDE message and cleanup iframe", async () => {
      const mockRemove = jest.fn();
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      window.removeHelcimPayIframe = mockRemove;

      const promise = openHelcimCheckout("token-123");

      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "HIDE",
          },
        }),
      );

      await expect(promise).rejects.toThrow("Payment cancelled");
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it("should ignore messages for different checkout tokens", async () => {
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;

      const promise = openHelcimCheckout("token-123");

      // Message for a different token — should be ignored
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-other-token",
            eventStatus: "SUCCESS",
            eventMessage: { data: { transactionId: "wrong" } },
          },
        }),
      );

      // Now send the correct one
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "SUCCESS",
            eventMessage: { data: { transactionId: "correct" } },
          },
        }),
      );

      const result = await promise;
      expect(result.data.transactionId).toBe("correct");
    });

    it("should ignore messages from untrusted origins", async () => {
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;

      let settled = false;
      const promise = openHelcimCheckout("token-123");
      promise
        .then(() => {
          settled = true;
        })
        .catch(() => {
          settled = true;
        });

      // Message from an untrusted origin — must be ignored
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example.com",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "SUCCESS",
            eventMessage: { data: { transactionId: "hacked" }, hash: "bad" },
          },
        }),
      );

      // Allow microtasks to drain
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(settled).toBe(false);

      // Cleanup: resolve via correct origin so the promise doesn't leak
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "HIDE",
          },
        }),
      );
      await expect(promise).rejects.toThrow("Payment cancelled");
    });

    it("should handle SUCCESS with missing eventMessage.data", async () => {
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;

      const promise = openHelcimCheckout("token-123");

      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "SUCCESS",
            eventMessage: {},
          },
        }),
      );

      const result = await promise;
      expect(result.data).toEqual({});
      expect(result.hash).toBe("");
    });

    it("should handle cleanup when removeHelcimPayIframe is undefined", async () => {
      window.appendHelcimPayIframe =
        jest.fn() as unknown as typeof window.appendHelcimPayIframe;
      delete window.removeHelcimPayIframe;

      const promise = openHelcimCheckout("token-123");

      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://secure.helcim.app",
          data: {
            eventName: "helcim-pay-js-token-123",
            eventStatus: "SUCCESS",
            eventMessage: { data: { transactionId: "txn-1" } },
          },
        }),
      );

      // Should not throw even without removeHelcimPayIframe
      const result = await promise;
      expect(result.data.transactionId).toBe("txn-1");
    });
  });

  describe("validateHelcimPayment", () => {
    const mockValidateData = {
      checkoutToken: MOCK_CHECKOUT_TOKEN,
      transactionData: {
        transactionId: "txn-999",
        amount: "50.00",
        approvalCode: "APR-111",
      },
      hash: "sha256hash",
      charityId: "charity-123",
      charityName: "Test Charity",
      donorName: "John Doe",
      donorEmail: "john@example.com",
      coverFees: false,
      donorId: "donor-456",
    };

    it("should validate a payment successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            transactionId: "txn-999",
            approvalCode: "APR-111",
            cardLastFour: "1234",
            donationType: "one-time",
          }),
      } as Response);

      const result = await validateHelcimPayment(mockValidateData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("txn-999");

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("helcim-validate");
      const body = JSON.parse(fetchCall[1].body);
      expect(body.checkoutToken).toBe(MOCK_CHECKOUT_TOKEN);
      expect(body.hash).toBe("sha256hash");
      expect(body.donorId).toBe("donor-456");
    });

    it("should throw on validation failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Payment validation failed: hash mismatch",
          }),
      } as unknown as Response);

      await expect(validateHelcimPayment(mockValidateData)).rejects.toThrow(
        "Payment validation failed: hash mismatch",
      );
    });

    it("should throw default message when no error provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      } as Response);

      await expect(validateHelcimPayment(mockValidateData)).rejects.toThrow(
        "Payment validation failed",
      );
    });

    it("should pass art9Consent through to the edge function (GIV-655)", async () => {
      const dataWithConsent = {
        ...mockValidateData,
        art9Consent: { version: "art9-donation-v1", locale: "en" },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            transactionId: "txn-999",
          }),
      } as Response);

      await validateHelcimPayment(dataWithConsent);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.art9Consent).toEqual({
        version: "art9-donation-v1",
        locale: "en",
      });
    });
  });
});
