import { CharityCategory, CHARITY_CATEGORY_LABELS } from '../charity';

describe('CharityCategory', () => {
  it('has all expected category values', () => {
    expect(CharityCategory.EDUCATION).toBe('education');
    expect(CharityCategory.HEALTH_MEDICAL).toBe('health_medical');
    expect(CharityCategory.MENTAL_HEALTH).toBe('mental_health');
    expect(CharityCategory.ENVIRONMENT_CONSERVATION).toBe('environment_conservation');
    expect(CharityCategory.HUMAN_SERVICES).toBe('human_services');
    expect(CharityCategory.ARTS_CULTURE_HUMANITIES).toBe('arts_culture_humanities');
    expect(CharityCategory.RELIGION_SPIRITUAL).toBe('religion_spiritual');
    expect(CharityCategory.ANIMAL_WELFARE).toBe('animal_welfare');
    expect(CharityCategory.DISASTER_RELIEF).toBe('disaster_relief');
    expect(CharityCategory.INTERNATIONAL_DEVELOPMENT).toBe('international_development');
    expect(CharityCategory.CIVIL_RIGHTS_ADVOCACY).toBe('civil_rights_advocacy');
    expect(CharityCategory.COMMUNITY_ECONOMIC_DEVELOPMENT).toBe('community_economic_development');
    expect(CharityCategory.YOUTH_DEVELOPMENT).toBe('youth_development');
    expect(CharityCategory.SCIENCE_TECHNOLOGY).toBe('science_technology');
    expect(CharityCategory.GRANTMAKING_FOUNDATIONS).toBe('grantmaking_foundations');
    expect(CharityCategory.PUBLIC_SAFETY).toBe('public_safety');
    expect(CharityCategory.SPORTS_RECREATION).toBe('sports_recreation');
    expect(CharityCategory.VETERANS_MILITARY).toBe('veterans_military');
    expect(CharityCategory.OTHER).toBe('other');
  });

  it('contains exactly 19 category values', () => {
    const categoryValues = Object.values(CharityCategory);
    expect(categoryValues).toHaveLength(19);
  });

  it('has unique category values', () => {
    const categoryValues = Object.values(CharityCategory);
    const uniqueValues = new Set(categoryValues);
    expect(uniqueValues.size).toBe(categoryValues.length);
  });

  it('uses lowercase string values with underscores', () => {
    Object.values(CharityCategory).forEach(category => {
      expect(typeof category).toBe('string');
      expect(category).toBe(category.toLowerCase());
      expect(category).toMatch(/^[a-z_]+$/);
    });
  });

  it('includes common charity categories', () => {
    const categoryValues = Object.values(CharityCategory);
    expect(categoryValues).toContain('education');
    expect(categoryValues).toContain('health_medical');
    expect(categoryValues).toContain('environment_conservation');
    expect(categoryValues).toContain('disaster_relief');
  });
});

describe('CHARITY_CATEGORY_LABELS', () => {
  it('has a label for every CharityCategory value', () => {
    Object.values(CharityCategory).forEach(cat => {
      expect(CHARITY_CATEGORY_LABELS[cat]).toBeTruthy();
      expect(typeof CHARITY_CATEGORY_LABELS[cat]).toBe('string');
    });
  });

  it('has non-empty string labels', () => {
    Object.values(CharityCategory).forEach(cat => {
      expect(CHARITY_CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    });
  });

  it('maps education to correct label', () => {
    expect(CHARITY_CATEGORY_LABELS[CharityCategory.EDUCATION]).toBe('Education');
  });

  it('maps disaster_relief to correct label', () => {
    expect(CHARITY_CATEGORY_LABELS[CharityCategory.DISASTER_RELIEF]).toBe('Disaster Relief & Humanitarian Aid');
  });
});
