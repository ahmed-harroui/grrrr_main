/**
 * Address → coordinates with OpenStreetMap's free Nominatim service (no API key).
 * Their usage policy asks for an identifying User-Agent and at most ~1 request per second — fine for a Studio.
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(address)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'GrrStudio/1.0 (https://grrrr-main.vercel.app)', 'Accept-Language': 'fr,en' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Geocoding failed (${res.status}).`)
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[]
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null
}
