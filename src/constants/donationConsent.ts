/**
 * Art. 9(2)(a) explicit-consent copy for donation confirmation.
 * Counsel-accepted baseline per GIV-652 memo §5; board confirmation c7fcdc8d.
 * All donation surfaces import from here so the legal wording stays in one
 * authoritative place.
 *
 * @returns Frozen consent configuration object
 */
export const ART9_DONATION_CONSENT = Object.freeze({
  /** Version tag persisted in donation_consents table. */
  version: "art9-donation-v1",

  /**
   * English consent statement (v1).
   * {{charity}} is interpolated at render time via i18n.
   */
  statement:
    "I understand my donation record links me to {{charity}}. Where that could indicate a religious, political, or philosophical affiliation, I explicitly consent to Give Protocol processing this record to complete and administer my donation.",
});
