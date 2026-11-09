import { GeoLocation } from '../types';
import { IRISH_LOCATIONS, GLOBAL_LOCATIONS } from '../data/seedData';
import { findClosestIrishLocation, LatLon } from '../utils/calculations';
import { storageService } from './storage';

export interface LocationDetectionResult {
  location: GeoLocation;
  isAuto: boolean;
  source: 'gps_high' | 'gps_low' | 'ip_network' | 'cached' | 'fallback';
  methodDescription: string;
  accuracyMeters?: number;
}

/**
 * Normalizes text to assist in finding matching towns/counties
 */
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves a city, town, or regional name to a known Irish trade location
 */
export function findMatchingIrishTown(townName?: string, countyOrRegionName?: string): GeoLocation | undefined {
  if (!townName) return undefined;
  const tNorm = normalizeName(townName);
  const cNorm = countyOrRegionName ? normalizeName(countyOrRegionName) : '';

  if (tNorm === 'galway') {
    return IRISH_LOCATIONS.find((l) => l.town === 'Galway City');
  }
  if (tNorm === 'dublin') {
    return IRISH_LOCATIONS.find((l) => l.town === 'Dublin City');
  }
  if (tNorm === 'cork') {
    return IRISH_LOCATIONS.find((l) => l.town === 'Cork City');
  }
  if (tNorm === 'limerick') {
    return IRISH_LOCATIONS.find((l) => l.town === 'Limerick City');
  }
  if (tNorm === 'waterford') {
    return IRISH_LOCATIONS.find((l) => l.town === 'Waterford City');
  }

  const directTown = IRISH_LOCATIONS.find((l) => normalizeName(l.town) === tNorm);
  if (directTown) return directTown;

  const partialTown = IRISH_LOCATIONS.find(
    (l) => normalizeName(l.town).includes(tNorm) || tNorm.includes(normalizeName(l.town))
  );
  if (partialTown) return partialTown;

  if (cNorm) {
    const countyMatch = IRISH_LOCATIONS.find(
      (l) => normalizeName(l.county) === cNorm || cNorm.includes(normalizeName(l.county))
    );
    if (countyMatch) return countyMatch;
  }

  return undefined;
}

/**
 * Global reverse geocoding supporting Ireland, UK, Europe, USA, Australia, and worldwide.
 * Uses fast, CORS-friendly keyless client APIs with OSM fallback.
 */
export async function reverseGeocodeGlobal(coords: LatLon): Promise<GeoLocation> {
  const isIrelandRegion =
    coords.latitude >= 51.3 &&
    coords.latitude <= 55.5 &&
    coords.longitude >= -10.7 &&
    coords.longitude <= -5.4;

  // Primary: Fast client-side reverse geocoding
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const town = data.city || data.locality || data.principalSubdivision || 'Local Hub';
      const county = data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || 'Local Region';
      const country = data.countryName || (isIrelandRegion ? 'Ireland' : 'Global');
      const countryCode = data.countryCode || (isIrelandRegion ? 'IE' : '');

      return {
        town,
        county,
        country,
        countryCode,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    }
  } catch (e) {
    // try fallback
  }

  // Secondary: OpenStreetMap Nominatim reverse geocode
  try {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&addressdetails=1`,
      { signal: controller2.signal, headers: { 'Accept-Language': 'en' } }
    );
    clearTimeout(timer2);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const town = addr.city || addr.town || addr.village || addr.suburb || 'Local Hub';
      const county = addr.county || addr.state || addr.region || 'Local Region';
      const country = addr.country || (isIrelandRegion ? 'Ireland' : 'Global');
      const countryCode = (addr.country_code || '').toUpperCase();

      return {
        town,
        county,
        country,
        countryCode,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    }
  } catch (e) {
    // fallback
  }

  // If in Ireland / Northern Ireland region, snap to nearest known trade hub
  if (isIrelandRegion) {
    const closest = findClosestIrishLocation(coords, IRISH_LOCATIONS);
    return {
      town: closest.town,
      county: closest.county,
      country: closest.county === 'Antrim' || closest.county === 'Derry' || closest.county === 'Down' || closest.county === 'Armagh' || closest.county === 'Tyrone' || closest.county === 'Fermanagh' ? 'Northern Ireland' : 'Ireland',
      countryCode: 'IE',
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  // Generic global fallback
  return {
    town: `Site ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
    county: 'Global Region',
    country: 'Global',
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

/**
 * Searches places globally across pre-indexed international trade hubs and live OpenStreetMap geocoding
 */
export async function searchGlobalPlaces(query: string): Promise<GeoLocation[]> {
  const q = query.trim().toLowerCase();
  if (!q) return GLOBAL_LOCATIONS.slice(0, 15);

  const matchedLocal: GeoLocation[] = [];
  const seen = new Set<string>();

  // 1. Search local preloaded global & Irish list
  const combined = [...GLOBAL_LOCATIONS, ...IRISH_LOCATIONS];
  for (const loc of combined) {
    const key = `${loc.town}-${loc.county}-${loc.country || ''}`.toLowerCase();
    if (seen.has(key)) continue;

    const matchTown = loc.town.toLowerCase().includes(q);
    const matchCounty = loc.county.toLowerCase().includes(q);
    const matchCountry = (loc.country || '').toLowerCase().includes(q);

    if (matchTown || matchCounty || matchCountry) {
      matchedLocal.push(loc);
      seen.add(key);
    }
  }

  if (matchedLocal.length >= 8) {
    return matchedLocal.slice(0, 10);
  }

  // 2. Query live OpenStreetMap Geocoder for worldwide cities/towns
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const addr = item.address || {};
          const town = addr.city || addr.town || addr.municipality || addr.village || item.name || query;
          const county = addr.state || addr.county || addr.region || 'Region';
          const country = addr.country || 'Global';
          const key = `${town}-${county}-${country}`.toLowerCase();

          if (!seen.has(key)) {
            matchedLocal.push({
              town,
              county,
              country,
              countryCode: (addr.country_code || '').toUpperCase(),
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
            });
            seen.add(key);
          }
        }
      }
    }
  } catch (e) {
    // ignore network errors and return local matches
  }

  return matchedLocal.slice(0, 12);
}

/**
 * Multi-tier automatic location detector:
 * Tier 1: Hardware GPS via navigator.geolocation with Global Reverse Geocoding
 * Tier 2: IP-based Network Geolocation (worldwide city/region/country)
 * Tier 3: Saved local preferences or default hub
 */
export async function autoDetectLocation(options?: {
  preferGps?: boolean;
  gpsTimeoutMs?: number;
}): Promise<LocationDetectionResult> {
  const timeoutMs = options?.gpsTimeoutMs ?? 4500;

  // 1. Try Hardware / Browser GPS if supported
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await queryBrowserGeolocation(timeoutMs);
      const coords: LatLon = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const detectedLoc = await reverseGeocodeGlobal(coords);

      const result: LocationDetectionResult = {
        location: detectedLoc,
        isAuto: true,
        source: position.coords.accuracy < 100 ? 'gps_high' : 'gps_low',
        methodDescription: `Hardware GPS (${detectedLoc.town}, ${detectedLoc.country || detectedLoc.county})`,
        accuracyMeters: Math.round(position.coords.accuracy),
      };

      storageService.saveLocationPrefs({
        location: detectedLoc,
        isAuto: true,
        source: result.source,
      });

      return result;
    } catch (gpsErr) {
      console.warn('Browser GPS unavailable or timed out, executing Network/IP fallback:', gpsErr);
    }
  }

  // 2. Tier 2: Network / IP Geolocation fallback (Fast, worldwide, works in iframes)
  try {
    const ipResult = await queryNetworkIpLocation();
    if (ipResult && ipResult.city) {
      const detectedLoc: GeoLocation = {
        town: ipResult.city,
        county: ipResult.region || ipResult.country || 'Region',
        country: ipResult.country || 'Global',
        latitude: ipResult.latitude,
        longitude: ipResult.longitude,
      };

      const result: LocationDetectionResult = {
        location: detectedLoc,
        isAuto: true,
        source: 'ip_network',
        methodDescription: `Network Geolocation (${detectedLoc.town}, ${detectedLoc.country})`,
      };

      storageService.saveLocationPrefs({
        location: detectedLoc,
        isAuto: true,
        source: result.source,
      });

      return result;
    }
  } catch (ipErr) {
    console.warn('Network IP geolocation failed:', ipErr);
  }

  // 3. Tier 3: Check cached preferences
  const cached = storageService.getLocationPrefs();
  if (cached && cached.isAuto) {
    return {
      location: cached.location,
      isAuto: true,
      source: 'cached',
      methodDescription: 'Cached Auto-Location',
    };
  }

  // 4. Fallback to default hub
  const defaultLoc = GLOBAL_LOCATIONS[0]; // Dublin City, Ireland
  return {
    location: defaultLoc,
    isAuto: false,
    source: 'fallback',
    methodDescription: 'Default Trade Hub (Manual setting recommended)',
  };
}

/**
 * Queries navigator.geolocation with two-pass attempt:
 * First attempts with low accuracy (fastest & works on desktop/Wi-Fi), then falls back if needed.
 */
function queryBrowserGeolocation(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Fast attempt with low accuracy (uses cell/Wi-Fi/IP, doesn't wait for GPS satellite lock)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!resolved) {
          resolved = true;
          resolve(pos);
        }
      },
      (err) => {
        // If low accuracy fails or times out, try high accuracy if allowed
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!resolved) {
              resolved = true;
              resolve(pos);
            }
          },
          (err2) => {
            if (!resolved) {
              resolved = true;
              reject(err2 || err);
            }
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 }
    );

    // Hard safety timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Geolocation query timed out'));
      }
    }, timeoutMs + 1000);
  });
}

interface RawIpResponse {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

/**
 * Queries fast, keyless public IP Geolocation endpoints
 */
async function queryNetworkIpLocation(): Promise<RawIpResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  // Primary: ipwho.is
  try {
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          city: data.city || '',
          region: data.region || '',
          country: data.country || '',
        };
      }
    }
  } catch {
    // try fallback
  }

  // Fallback: geojs.io
  try {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 3500);
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller2.signal });
    clearTimeout(timer2);
    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city || '',
          region: data.region || '',
          country: data.country || '',
        };
      }
    }
  } catch {
    // network down or blocked
  }

  return null;
}
