import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { createPayPalOrder, capturePayPalOrder } from "./paypalService";
import { supabase } from "@/lib/supabase";

const mockInvoke = supabase.functions.invoke as ReturnType<typeof jest.fn>;

describe("paypalService", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  describe("createPayPalOrder", () => {
    const params = {
      amount: 100,
      currency: "USD",
      charityId: "charity-1",
      donationType: "one-time" as const,
    };

    it("should call paypal-create-order edge function and return order data", async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, orderId: "ORDER-123", approvalUrl: "https://paypal.com/approve" },
        error: null,
      });

      const result = await createPayPalOrder(params);
      expect(mockInvoke).toHaveBeenCalledWith("paypal-create-order", { body: params });
      expect(result.orderId).toBe("ORDER-123");
      expect(result.approvalUrl).toBe("https://paypal.com/approve");
    });

    it("should throw when edge function returns an error", async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: new Error("Edge function error"),
      });
      await expect(createPayPalOrder(params)).rejects.toThrow("Failed to create PayPal order");
    });

    it("should throw when data.success is false", async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, error: "Insufficient funds" },
        error: null,
      });
      await expect(createPayPalOrder(params)).rejects.toThrow("Insufficient funds");
    });
  });

  describe("capturePayPalOrder", () => {
    it("should call paypal-capture-order and return capture result", async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, transactionId: "TX-456", amount: 100, currency: "USD" },
        error: null,
      });

      const result = await capturePayPalOrder("ORDER-123");
      expect(mockInvoke).toHaveBeenCalledWith("paypal-capture-order", { body: { orderId: "ORDER-123" } });
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("TX-456");
      expect(result.amount).toBe(100);
      expect(result.currency).toBe("USD");
    });

    it("should throw when capture returns an error", async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: new Error("Capture failed"),
      });
      await expect(capturePayPalOrder("ORDER-123")).rejects.toThrow("Failed to capture PayPal payment");
    });

    it("should throw when capture data.success is false", async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, error: "Order expired" },
        error: null,
      });
      await expect(capturePayPalOrder("ORDER-123")).rejects.toThrow("Order expired");
    });
  });
});
