import { describe, it, expect } from "vitest";
import { resolveZone, resolveSubZone, getZoneById, ZONES, SUB_ZONES } from "../zones";

describe("resolveZone", () => {
  it("matches Haifa addresses", () => {
    expect(resolveZone("חיפה, רח' הרצל 5")?.id).toBe("haifa");
  });

  it("prefers longer matches: עפולה עילית over עפולה", () => {
    expect(resolveZone("עפולה עילית, שדרות יצחק רבין 1")?.id).toBe("afula");
    expect(resolveZone("עפולה, רח' הנשיא 7")?.id).toBe("afula");
  });

  it("matches מ\"א גלבוע town", () => {
    expect(resolveZone("יזרעאל, מועצה אזורית גלבוע")?.id).toBe("gilboa");
  });

  it("matches בית שאן", () => {
    expect(resolveZone("בית שאן, רח' שאול המלך 22")?.id).toBe("beit_shean");
  });

  it("matches מגידו yishuv", () => {
    expect(resolveZone("יקנעם המושבה")?.id).toBe("megido");
  });

  it("matches תענכים village", () => {
    expect(resolveZone("נהלל, מועצה אזורית עמק יזרעאל")?.id).toBe("taanachim");
  });

  it("returns null for outside coverage", () => {
    expect(resolveZone("תל אביב, דיזנגוף 99")).toBeNull();
    expect(resolveZone("ירושלים, יפו 1")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(resolveZone("")).toBeNull();
  });

  it("ignores quotes and whitespace", () => {
    expect(resolveZone('  חיפה  ,  רח״  הרצל  ')?.id).toBe("haifa");
  });
});

describe("getZoneById", () => {
  it("looks up by id", () => {
    expect(getZoneById("afula")?.name).toBe("עפולה");
  });

  it("returns null for unknown id", () => {
    expect(getZoneById("petah_tikva")).toBeNull();
  });
});

describe("ZONES sanity", () => {
  it("has 6 zones", () => {
    expect(ZONES).toHaveLength(6);
  });

  it("every zone has a non-empty towns list", () => {
    for (const z of ZONES) expect(z.towns.length).toBeGreaterThan(0);
  });

  it("multipliers are between 1.0 and 2.0", () => {
    for (const z of ZONES) {
      expect(z.multiplier).toBeGreaterThanOrEqual(1.0);
      expect(z.multiplier).toBeLessThanOrEqual(2.0);
    }
  });
});

describe("resolveSubZone", () => {
  const haifa = getZoneById("haifa")!;
  const afula = getZoneById("afula")!;
  const beitShean = getZoneById("beit_shean")!;

  it("matches Carmel as a Haifa sub-zone with 1.10 surcharge", () => {
    const sz = resolveSubZone("חיפה, סטלה מאריס 12, מרכז הכרמל", haifa);
    expect(sz.name).toBe("כרמל");
    expect(sz.multiplier).toBe(1.1);
  });

  it("matches Hadar with 1.05 surcharge", () => {
    const sz = resolveSubZone("חיפה, הדר, רח' הרצל 5", haifa);
    expect(sz.name).toBe("הדר");
    expect(sz.multiplier).toBe(1.05);
  });

  it("returns multiplier 1.0 for plain Haifa addresses with no neighborhood match", () => {
    const sz = resolveSubZone("חיפה, רח' שדרות בן גוריון", haifa);
    expect(sz.multiplier).toBe(1.0);
    expect(sz.name).toBe("");
  });

  it("recognizes עפולה עילית sub-zone inside the afula zone", () => {
    const sz = resolveSubZone("עפולה עילית, שדרות יצחק רבין 10", afula);
    expect(sz.name).toBe("עפולה עילית");
    expect(sz.multiplier).toBe(1.05);
  });

  it("does not flag plain עפולה as a sub-zone surcharge", () => {
    const sz = resolveSubZone("עפולה, רח' הנשיא 7", afula);
    expect(sz.multiplier).toBe(1.0);
  });

  it("flags border-adjacent kibbutzim with 1.10 (מעלה גלבוע)", () => {
    const sz = resolveSubZone("מעלה גלבוע, מועצה אזורית בקעת בית שאן", beitShean);
    expect(sz.multiplier).toBe(1.1);
  });

  it("returns 1.0 for empty input", () => {
    expect(resolveSubZone("", haifa).multiplier).toBe(1.0);
  });
});

describe("SUB_ZONES sanity", () => {
  it("only contains multipliers in [1.0, 1.15]", () => {
    for (const list of Object.values(SUB_ZONES)) {
      for (const sz of list) {
        expect(sz.multiplier).toBeGreaterThanOrEqual(1.0);
        expect(sz.multiplier).toBeLessThanOrEqual(1.15);
      }
    }
  });
});
