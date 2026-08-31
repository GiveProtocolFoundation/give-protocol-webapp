import {
  DEFAULT_CHARITY_COVER,
  repairCharityImageUrl,
  resolveCharityImageUrl,
} from "./charityAssets";

describe("resolveCharityImageUrl", () => {
  it("rewrites picsum.photos placeholder URLs to the local cover asset", () => {
    expect(
      resolveCharityImageUrl(
        "https://picsum.photos/seed/gecn2024/400/300",
        "99-1230003",
      ),
    ).toBe("/images/charities/99-1230003.svg");
  });

  it("rewrites fastly.picsum.photos URLs to the local cover asset", () => {
    expect(
      resolveCharityImageUrl(
        "https://fastly.picsum.photos/seed/mac2024/800/600.jpg",
        "99-1230005",
      ),
    ).toBe("/images/charities/99-1230005.svg");
  });

  it("rewrites URLs on the deprecated Supabase storage project", () => {
    expect(
      resolveCharityImageUrl(
        "https://etqbojasfmpieigeefdj.supabase.co/storage/v1/object/public/charity-assets/99-1230001/logo.png",
        "99-1230001",
      ),
    ).toBe("/images/charities/99-1230001.svg");
  });

  it("keeps healthy absolute URLs unchanged", () => {
    expect(
      resolveCharityImageUrl("https://example.org/logo.png", "99-1230003"),
    ).toBe("https://example.org/logo.png");
  });

  it("keeps existing local asset paths unchanged", () => {
    expect(
      resolveCharityImageUrl("/images/charities/99-1230001.svg", "99-1230001"),
    ).toBe("/images/charities/99-1230001.svg");
  });

  it("falls back to the default cover for null URLs", () => {
    expect(resolveCharityImageUrl(null, "99-1230003")).toBe(
      DEFAULT_CHARITY_COVER,
    );
  });

  it("falls back to the default cover for empty URLs", () => {
    expect(resolveCharityImageUrl("", "99-1230003")).toBe(
      DEFAULT_CHARITY_COVER,
    );
  });

  it("falls back to the default cover when the EIN is missing", () => {
    expect(
      resolveCharityImageUrl("https://picsum.photos/seed/x/400/300", null),
    ).toBe(DEFAULT_CHARITY_COVER);
  });

  it("sanitizes EINs so path traversal is impossible", () => {
    expect(
      resolveCharityImageUrl(
        "https://picsum.photos/seed/x/400/300",
        "../../etc/passwd",
      ),
    ).toBe("/images/charities/etcpasswd.svg");
  });
});

describe("repairCharityImageUrl", () => {
  it("preserves null so null-fallback UIs keep their behavior", () => {
    expect(repairCharityImageUrl(null, "99-1230003")).toBeNull();
  });

  it("preserves empty strings as null", () => {
    expect(repairCharityImageUrl("", "99-1230003")).toBeNull();
  });

  it("rewrites dead placeholder hosts to the local cover asset", () => {
    expect(
      repairCharityImageUrl(
        "https://picsum.photos/seed/hhha2024/400/300",
        "99-1230002",
      ),
    ).toBe("/images/charities/99-1230002.svg");
  });

  it("keeps healthy absolute URLs unchanged", () => {
    expect(
      repairCharityImageUrl("https://example.org/logo.png", "99-1230002"),
    ).toBe("https://example.org/logo.png");
  });

  it("falls back to the default cover when the EIN is missing", () => {
    expect(
      repairCharityImageUrl("https://picsum.photos/seed/x/400/300", null),
    ).toBe(DEFAULT_CHARITY_COVER);
  });
});
