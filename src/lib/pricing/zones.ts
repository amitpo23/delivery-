export interface PricingZone {
  id: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  multiplier: number;
  towns: readonly string[];
}

export const ZONES: readonly PricingZone[] = [
  {
    id: "haifa",
    name: "חיפה",
    basePrice: 20,
    pricePerKm: 1.0,
    multiplier: 1.0,
    towns: ["חיפה", "נווה שאנן", "הדר", "כרמל", "בת גלים", "נשר"],
  },
  {
    id: "megido",
    name: "מועצה אזורית מגידו",
    basePrice: 30,
    pricePerKm: 1.4,
    multiplier: 1.1,
    towns: [
      "יקנעם המושבה",
      "מדרך עוז",
      "מגידו",
      "רמות מנשה",
      "משמר העמק",
      "עין השופט",
      "הזורע",
      "דליה",
      "גלעד",
      "אליקים",
    ],
  },
  {
    id: "gilboa",
    name: "מועצה אזורית גלבוע",
    basePrice: 30,
    pricePerKm: 1.4,
    multiplier: 1.1,
    towns: [
      "בית השיטה",
      "גן נר",
      "דבורה",
      "הרדוף",
      "חבר",
      "יזרעאל",
      "מולדת",
      "מיטב",
      "נורית",
      "עין החורש",
      "עין חרוד איחוד",
      "עין חרוד מאוחד",
      "פרזון",
      "רמת צבי",
      "תל יוסף",
      "מגן שאול",
    ],
  },
  {
    id: "beit_shean",
    name: "מועצה אזורית בקעת בית שאן",
    basePrice: 35,
    pricePerKm: 1.5,
    multiplier: 1.2,
    towns: [
      "בית שאן",
      "גשר",
      "חמדיה",
      "טירת צבי",
      "כפר רופין",
      "מסילות",
      "מעלה גלבוע",
      "מעוז חיים",
      "נווה איתן",
      "נווה אור",
      "ניר דוד",
      "רחוב",
      "רויה",
      "רשפים",
      "שדה אליהו",
      "שדה נחום",
      "שלוחות",
      "שדי תרומות",
    ],
  },
  {
    id: "afula",
    name: "עפולה",
    basePrice: 25,
    pricePerKm: 1.2,
    multiplier: 1.0,
    towns: ["עפולה", "עפולה עילית"],
  },
  {
    id: "taanachim",
    name: "התענכים",
    basePrice: 30,
    pricePerKm: 1.4,
    multiplier: 1.1,
    towns: [
      "גבעת עוז",
      "עין דור",
      "תל עדשים",
      "עדנים",
      "עדי",
      "נהלל",
      "בלפוריה",
      "דברת",
      "מרחביה",
      "כפר ברוך",
      "מזרע",
      "גזית",
      "רמת ישי",
      "קריית טבעון",
      "קרית טבעון",
    ],
  },
];

const TOWN_INDEX: ReadonlyArray<{ town: string; zone: PricingZone }> = ZONES.flatMap(
  (zone) => zone.towns.map((town) => ({ town, zone }))
).sort((a, b) => b.town.length - a.town.length);

function normalize(text: string): string {
  return text
    .replace(/["'״׳`]/g, "")
    .replace(/[,./\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Returns the pricing zone for an address.
 *  - Matches with word boundaries so "יזרעאל" (kibbutz) does not hit "עמק יזרעאל".
 *  - The town that appears earliest in the address wins (it is the destination;
 *    later tokens are usually descriptors like "מועצה אזורית X").
 *  - On equal position, the longer town name wins ("עפולה עילית" > "עפולה").
 */
export function resolveZone(address: string): PricingZone | null {
  if (!address) return null;
  const padded = " " + normalize(address) + " ";
  let best: { idx: number; townLen: number; zone: PricingZone } | null = null;
  for (const { town, zone } of TOWN_INDEX) {
    const needle = " " + normalize(town) + " ";
    const idx = padded.indexOf(needle);
    if (idx < 0) continue;
    if (
      !best ||
      idx < best.idx ||
      (idx === best.idx && town.length > best.townLen)
    ) {
      best = { idx, townLen: town.length, zone };
    }
  }
  return best?.zone ?? null;
}

export function getZoneById(id: string): PricingZone | null {
  return ZONES.find((z) => z.id === id) ?? null;
}

/**
 * Sub-zone overrides for known neighborhoods/streets that justify a small
 * surcharge on top of the base zone (parking, narrow access, hilltop,
 * border-adjacent, etc). Patterns are word-boundary matched against the
 * normalized address. The default for any unmatched address is multiplier 1.0.
 */
export interface SubZone {
  name: string;
  patterns: readonly string[];
  multiplier: number;
}

export const SUB_ZONES: Record<string, readonly SubZone[]> = {
  haifa: [
    {
      name: "כרמל",
      patterns: ["כרמל", "סטלה מאריס", "אחוזה", "רמת בגין", "מרכז הכרמל"],
      multiplier: 1.1,
    },
    { name: "הדר", patterns: ["הדר"], multiplier: 1.05 },
    { name: "נווה שאנן", patterns: ["נווה שאנן"], multiplier: 1.05 },
    { name: "רוממה", patterns: ["רוממה"], multiplier: 1.05 },
  ],
  afula: [
    { name: "עפולה עילית", patterns: ["עפולה עילית"], multiplier: 1.05 },
  ],
  // Beit She'an valley: city neighborhoods + border-adjacent kibbutzim
  beit_shean: [
    // Border-adjacent (Jordan) — hardest access
    { name: "מעלה גלבוע", patterns: ["מעלה גלבוע"], multiplier: 1.1 },
    { name: "רויה", patterns: ["רויה"], multiplier: 1.1 },
    { name: "טירת צבי", patterns: ["טירת צבי"], multiplier: 1.1 },
    { name: "שדה אליהו", patterns: ["שדה אליהו"], multiplier: 1.1 },
    // Inner valley kibbutzim — moderate distance from city
    { name: "מסילות", patterns: ["מסילות"], multiplier: 1.05 },
    { name: "כפר רופין", patterns: ["כפר רופין"], multiplier: 1.05 },
    { name: "ניר דוד", patterns: ["ניר דוד"], multiplier: 1.05 },
    { name: "שלוחות", patterns: ["שלוחות"], multiplier: 1.05 },
    { name: "מעוז חיים", patterns: ["מעוז חיים"], multiplier: 1.05 },
    // City neighborhoods
    { name: "רובע ה'", patterns: ["רובע ה", "שיכון ה"], multiplier: 1.05 },
    { name: "אזור התעשייה", patterns: ["אזור התעשייה"], multiplier: 1.05 },
  ],
  // Gilboa: hilltop + border kibbutzim get +10%, mid-mountain +5%
  gilboa: [
    { name: "מגן שאול", patterns: ["מגן שאול"], multiplier: 1.1 },
    { name: "נורית", patterns: ["נורית"], multiplier: 1.1 },
    { name: "מולדת", patterns: ["מולדת"], multiplier: 1.1 },
    { name: "רמת צבי", patterns: ["רמת צבי"], multiplier: 1.1 },
    { name: "חבר", patterns: ["חבר"], multiplier: 1.05 },
    { name: "מיטב", patterns: ["מיטב"], multiplier: 1.05 },
    { name: "פרזון", patterns: ["פרזון"], multiplier: 1.05 },
    { name: "דבורה", patterns: ["דבורה"], multiplier: 1.05 },
  ],
  // Megido: kibbutzim on Mt. Carmel ridge are higher altitude, harder access
  megido: [
    { name: "עין השופט", patterns: ["עין השופט"], multiplier: 1.1 },
    { name: "רמות מנשה", patterns: ["רמות מנשה"], multiplier: 1.1 },
    { name: "דליה", patterns: ["דליה"], multiplier: 1.1 },
    { name: "גלעד", patterns: ["גלעד"], multiplier: 1.05 },
    { name: "אליקים", patterns: ["אליקים"], multiplier: 1.05 },
    { name: "הזורע", patterns: ["הזורע"], multiplier: 1.05 },
    { name: "משמר העמק", patterns: ["משמר העמק"], multiplier: 1.05 },
    { name: "מדרך עוז", patterns: ["מדרך עוז"], multiplier: 1.05 },
  ],
  // Ta'anachim / Yizra'el valley: edge kibbutzim
  taanachim: [
    { name: "גזית", patterns: ["גזית"], multiplier: 1.1 },
    { name: "עין דור", patterns: ["עין דור"], multiplier: 1.05 },
    { name: "גבעת עוז", patterns: ["גבעת עוז"], multiplier: 1.05 },
    { name: "עדי", patterns: ["עדי"], multiplier: 1.05 },
    { name: "מרחביה", patterns: ["מרחביה"], multiplier: 1.05 },
    { name: "דברת", patterns: ["דברת"], multiplier: 1.05 },
  ],
};

const SUB_ZONE_DEFAULT: SubZone = { name: "", patterns: [], multiplier: 1.0 };

/**
 * Returns the sub-zone of an address inside a given zone. Earliest-position
 * + longest-pattern wins, mirroring resolveZone(). Returns multiplier 1.0
 * when the address doesn't match any known sub-zone (including all of the
 * mo'atza-azurit zones, which don't have intra-zone variation worth pricing).
 */
export function resolveSubZone(address: string, zone: PricingZone): SubZone {
  const subZones = SUB_ZONES[zone.id];
  if (!subZones || subZones.length === 0 || !address) return SUB_ZONE_DEFAULT;

  const padded = " " + normalize(address) + " ";
  let best: { idx: number; patternLen: number; subZone: SubZone } | null = null;

  for (const sz of subZones) {
    for (const pattern of sz.patterns) {
      const needle = " " + normalize(pattern) + " ";
      const idx = padded.indexOf(needle);
      if (idx < 0) continue;
      if (
        !best ||
        idx < best.idx ||
        (idx === best.idx && pattern.length > best.patternLen)
      ) {
        best = { idx, patternLen: pattern.length, subZone: sz };
      }
    }
  }
  return best?.subZone ?? SUB_ZONE_DEFAULT;
}

/**
 * Coarse distance estimate (km) between two zones — used as a server-side
 * floor for pricing so the client cannot shrink the price by lying about
 * `distanceKm`. Same-zone trips assume 5 km of city driving. Cross-zone
 * pairs are based on rough road distances; replace with Google Routes when
 * the API key is wired.
 *
 * The matrix is symmetric — order of arguments doesn't matter.
 */
const ZONE_DISTANCES_KM: Record<string, Record<string, number>> = {
  haifa: { haifa: 5, megido: 25, gilboa: 60, beit_shean: 75, afula: 50, taanachim: 45 },
  megido: { haifa: 25, megido: 8, gilboa: 50, beit_shean: 65, afula: 35, taanachim: 30 },
  gilboa: { haifa: 60, megido: 50, gilboa: 10, beit_shean: 25, afula: 25, taanachim: 30 },
  beit_shean: { haifa: 75, megido: 65, gilboa: 25, beit_shean: 8, afula: 35, taanachim: 40 },
  afula: { haifa: 50, megido: 35, gilboa: 25, beit_shean: 35, afula: 5, taanachim: 12 },
  taanachim: { haifa: 45, megido: 30, gilboa: 30, beit_shean: 40, afula: 12, taanachim: 8 },
};

export function estimateZoneDistanceKm(from: PricingZone, to: PricingZone): number {
  return ZONE_DISTANCES_KM[from.id]?.[to.id] ?? 50;
}
