import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  MonitoringService,
  getMonitoringService,
} from "@/utils/monitoring.real";

describe("MonitoringService", () => {
  beforeEach(() => {
    // Reset singleton between tests
    (MonitoringService as unknown as { instance: null }).instance = null;
    localStorage.clear();
  });

  afterEach(() => {
    (MonitoringService as unknown as { instance: null }).instance = null;
  });

  describe("getInstance", () => {
    it("should return a singleton instance", () => {
      const instance1 = MonitoringService.getInstance();
      const instance2 = MonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("trackMetric (without initialization)", () => {
    it("should not track when not initialized", () => {
      const instance = MonitoringService.getInstance();
      instance.trackMetric("test_event", { key: "value" });
      const metrics = instance.exportMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("exportMetrics", () => {
    it("should return empty array when no metrics tracked", () => {
      const instance = MonitoringService.getInstance();
      expect(instance.exportMetrics()).toEqual([]);
    });

    it("should include metrics from localStorage", () => {
      const storedMetrics = [
        { timestamp: 1000, event: "stored_event", data: {} },
      ];
      localStorage.setItem(
        "monitoring_metrics",
        JSON.stringify(storedMetrics),
      );

      const instance = MonitoringService.getInstance();
      const metrics = instance.exportMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics.some((m) => m.event === "stored_event")).toBe(true);
    });

    it("should handle invalid localStorage data gracefully", () => {
      localStorage.setItem("monitoring_metrics", "invalid json{{{");

      const instance = MonitoringService.getInstance();
      const metrics = instance.exportMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe("clearMetrics", () => {
    it("should clear all metrics", () => {
      localStorage.setItem(
        "monitoring_metrics",
        JSON.stringify([{ timestamp: 1, event: "x", data: {} }]),
      );

      const instance = MonitoringService.getInstance();
      instance.clearMetrics();

      expect(instance.exportMetrics()).toEqual([]);
      expect(localStorage.getItem("monitoring_metrics")).toBeNull();
    });
  });

  describe("getMonitoringService", () => {
    it("should return the singleton instance", () => {
      const instance = getMonitoringService();
      expect(instance).toBeInstanceOf(MonitoringService);
      expect(instance).toBe(MonitoringService.getInstance());
    });
  });
});
