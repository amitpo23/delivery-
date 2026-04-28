/**
 * Lightweight Google Maps Geocoding API wrapper.
 *
 * Uses GOOGLE_MAPS_API_KEY (server-side, not exposed to the browser). The
 * NEXT_PUBLIC_ key is also accepted as a fallback so existing setups work.
 *
 * The geocoder is intentionally permissive: it returns null on any failure
 * (missing key, network error, no result) so callers can fall back to
 * zone-only pricing without blocking order creation.
 *
 * In-memory LRU cache keeps repeated identical requests off the wire — a
 * legitimate concern when the same address is geocoded once for the quote
 * and again on the order POST.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
}

interface CacheEntry {
  value: GeocodeResult | null;
  insertedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): GeocodeResult | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.insertedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key: string, value: GeocodeResult | null): void {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, insertedAt: Date.now() });
}

function getApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 2) return null;
  const key = getApiKey();
  if (!key) return null;

  const cacheKey = address.trim().toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", key);
    url.searchParams.set("region", "il");
    url.searchParams.set("language", "he");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      cacheSet(cacheKey, null);
      return null;
    }
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{
        geometry?: { location?: { lat?: number; lng?: number } };
        formatted_address?: string;
      }>;
    };
    const first = json.results?.[0];
    const loc = first?.geometry?.location;
    if (json.status !== "OK" || !loc?.lat || !loc?.lng) {
      cacheSet(cacheKey, null);
      return null;
    }
    const result: GeocodeResult = {
      lat: loc.lat,
      lng: loc.lng,
      formatted: first?.formatted_address ?? address,
    };
    cacheSet(cacheKey, result);
    return result;
  } catch {
    cacheSet(cacheKey, null);
    return null;
  }
}

export function clearGeocodeCache(): void {
  cache.clear();
}
