import { describe, it, expect } from "vitest";
import { resolveZone, getZoneById, ZONES } from "../zones";

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
