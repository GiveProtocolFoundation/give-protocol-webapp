import { resources } from "./index";
import en from "./en";
import es from "./es";
import de from "./de";
import fr from "./fr";
import ja from "./ja";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";
import th from "./th";
import vi from "./vi";
import ko from "./ko";
import ar from "./ar";
import hi from "./hi";

describe("i18n resources", () => {
  it("should export all 12 language resources", () => {
    expect(Object.keys(resources)).toHaveLength(12);
    expect(resources).toHaveProperty("en");
    expect(resources).toHaveProperty("es");
    expect(resources).toHaveProperty("de");
    expect(resources).toHaveProperty("fr");
    expect(resources).toHaveProperty("ja");
    expect(resources).toHaveProperty("zh-CN");
    expect(resources).toHaveProperty("zh-TW");
    expect(resources).toHaveProperty("th");
    expect(resources).toHaveProperty("vi");
    expect(resources).toHaveProperty("ko");
    expect(resources).toHaveProperty("ar");
    expect(resources).toHaveProperty("hi");
  });

  it("en should export a translation object with keys", () => {
    expect(en).toHaveProperty("translation");
    expect(typeof en.translation).toBe("object");
    expect(Object.keys(en.translation).length).toBeGreaterThan(0);
  });

  it("es should export a translation object", () => {
    expect(es).toHaveProperty("translation");
    expect(typeof es.translation).toBe("object");
  });

  it("de should export a translation object", () => {
    expect(de).toHaveProperty("translation");
    expect(typeof de.translation).toBe("object");
  });

  it("fr should export a translation object", () => {
    expect(fr).toHaveProperty("translation");
    expect(typeof fr.translation).toBe("object");
  });

  it("ja should export a translation object", () => {
    expect(ja).toHaveProperty("translation");
    expect(typeof ja.translation).toBe("object");
  });

  it("zh-CN should export a translation object", () => {
    expect(zhCN).toHaveProperty("translation");
    expect(typeof zhCN.translation).toBe("object");
  });

  it("zh-TW should export a translation object", () => {
    expect(zhTW).toHaveProperty("translation");
    expect(typeof zhTW.translation).toBe("object");
  });

  it("th should export a translation object", () => {
    expect(th).toHaveProperty("translation");
    expect(typeof th.translation).toBe("object");
  });

  it("vi should export a translation object", () => {
    expect(vi).toHaveProperty("translation");
    expect(typeof vi.translation).toBe("object");
  });

  it("ko should export a translation object", () => {
    expect(ko).toHaveProperty("translation");
    expect(typeof ko.translation).toBe("object");
  });

  it("ar should export a translation object", () => {
    expect(ar).toHaveProperty("translation");
    expect(typeof ar.translation).toBe("object");
  });

  it("hi should export a translation object", () => {
    expect(hi).toHaveProperty("translation");
    expect(typeof hi.translation).toBe("object");
  });

  it("all non-English languages should have translation keys", () => {
    const languages = { es, de, fr, ja, "zh-CN": zhCN, "zh-TW": zhTW, th, vi, ko, ar, hi };

    Object.entries(languages).forEach(([_lang, resource]) => {
      const langKeyCount = Object.keys(resource.translation).length;
      expect(langKeyCount).toBeGreaterThan(0);
    });
  });
});
