import { describe, it, expect } from "@jest/globals";
import {
  CharityCategory,
  MAX_CAUSES_PER_CHARITY,
  MAX_OPPORTUNITIES_PER_CHARITY,
  hasReachedCauseLimit,
  hasReachedOpportunityLimit,
} from "./charity";

describe("charity types", () => {
  describe("CharityCategory enum", () => {
    it("should have correct values", () => {
      expect(CharityCategory.EDUCATION).toBe("education");
      expect(CharityCategory.HEALTH_MEDICAL).toBe("health_medical");
      expect(CharityCategory.MENTAL_HEALTH).toBe("mental_health");
      expect(CharityCategory.ENVIRONMENT_CONSERVATION).toBe(
        "environment_conservation",
      );
      expect(CharityCategory.HUMAN_SERVICES).toBe("human_services");
      expect(CharityCategory.HOUSING_SHELTER).toBe("housing_shelter");
      expect(CharityCategory.FOOD_SECURITY_NUTRITION).toBe(
        "food_security_nutrition",
      );
      expect(CharityCategory.WOMEN_GENDER_EQUALITY).toBe(
        "women_gender_equality",
      );
      expect(CharityCategory.ANIMAL_WELFARE).toBe("animal_welfare");
      expect(CharityCategory.DISASTER_RELIEF).toBe("disaster_relief");
      expect(CharityCategory.OTHER).toBe("other");
    });
  });

  describe("constants", () => {
    it("should have correct max causes per charity", () => {
      expect(MAX_CAUSES_PER_CHARITY).toBe(3);
    });

    it("should have correct max opportunities per charity", () => {
      expect(MAX_OPPORTUNITIES_PER_CHARITY).toBe(3);
    });
  });

  describe("hasReachedCauseLimit", () => {
    it("should return false when under limit", () => {
      expect(hasReachedCauseLimit(0)).toBe(false);
      expect(hasReachedCauseLimit(1)).toBe(false);
      expect(hasReachedCauseLimit(2)).toBe(false);
    });

    it("should return true when at limit", () => {
      expect(hasReachedCauseLimit(3)).toBe(true);
    });

    it("should return true when over limit", () => {
      expect(hasReachedCauseLimit(4)).toBe(true);
      expect(hasReachedCauseLimit(10)).toBe(true);
    });
  });

  describe("hasReachedOpportunityLimit", () => {
    it("should return false when under limit", () => {
      expect(hasReachedOpportunityLimit(0)).toBe(false);
      expect(hasReachedOpportunityLimit(1)).toBe(false);
      expect(hasReachedOpportunityLimit(2)).toBe(false);
    });

    it("should return true when at limit", () => {
      expect(hasReachedOpportunityLimit(3)).toBe(true);
    });

    it("should return true when over limit", () => {
      expect(hasReachedOpportunityLimit(4)).toBe(true);
      expect(hasReachedOpportunityLimit(10)).toBe(true);
    });
  });
});
