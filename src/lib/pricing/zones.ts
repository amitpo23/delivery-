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
