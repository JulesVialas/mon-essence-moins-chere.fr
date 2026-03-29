"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type FuelType = "Gazole" | "SP95" | "SP98" | "E10" | "E85" | "GPLc";

type AddressSuggestion = {
  label: string;
  coordinates: [number, number]; // [lon, lat]
};

type Station = {
  id: string;
  adresse: string;
  ville: string;
  cp: string;
  geom: { lon: number; lat: number };
  prix: number;
  maj: string;
  rupture: boolean;
  pop: string;
  distance?: number;
};

const FUELS: { key: FuelType; label: string; short: string }[] = [
  { key: "SP95",   label: "Sans-Plomb 95",   short: "SP95" },
  { key: "SP98",   label: "Sans-Plomb 98",   short: "SP98" },
  { key: "E10",    label: "E10",              short: "E10" },
  { key: "Gazole", label: "Gazole",           short: "Diesel" },
  { key: "E85",    label: "Superéthanol E85", short: "E85" },
  { key: "GPLc",   label: "GPL",              short: "GPL" },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.round(diffH)}h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function getPriceAgeHours(dateStr: string): number {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / 3600000;
}

function getPriceColor(price: number, min: number, max: number): string {
  const range = max - min;
  if (range < 0.001) return "text-slate-900";
  const ratio = (price - min) / range;
  if (ratio < 0.33) return "text-emerald-600";
  if (ratio < 0.66) return "text-amber-600";
  return "text-red-500";
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconNav({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function StationCard({
  station,
  rank,
  min,
  max,
}: {
  station: Station;
  rank?: number;
  min: number;
  max: number;
}) {
  const priceColor = getPriceColor(station.prix, min, max);
  const ageH = getPriceAgeHours(station.maj);
  const isStale = ageH > 48;
  const dateColor = ageH > 72 ? "text-red-400" : ageH > 48 ? "text-amber-400" : "text-slate-400";
  const savings = max - station.prix;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${station.adresse}, ${station.cp} ${station.ville}`
  )}`;

  return (
    <div className={`bg-white rounded-xl border flex items-stretch overflow-hidden ${
      station.rupture ? "border-red-100 opacity-60" : "border-slate-100"
    }`}>
      {/* Rank stripe */}
      {rank !== undefined && (
        <div className={`w-9 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          rank === 1 ? "bg-amber-400 text-white"
          : rank === 2 ? "bg-slate-200 text-slate-600"
          : rank === 3 ? "bg-orange-300 text-white"
          : "bg-slate-50 text-slate-400"
        }`}>
          {rank}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 px-3 py-3 min-w-0">
        <p className="font-medium text-slate-900 text-sm leading-tight truncate">
          {station.adresse}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          {station.cp} {station.ville}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
          {station.rupture && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
              Rupture
            </span>
          )}
          {station.pop === "A" && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
              Autoroute
            </span>
          )}
          {station.distance !== undefined && (
            <span className="text-xs text-slate-400">
              {station.distance < 1
                ? `${Math.round(station.distance * 1000)} m`
                : `${station.distance.toFixed(1)} km`}
            </span>
          )}
          {station.maj && (
            <span className={`text-xs ${dateColor}`} title={isStale ? "Prix potentiellement obsolète" : undefined}>
              {formatDate(station.maj)}{isStale ? " ⚠" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Price + savings + nav */}
      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
        <div className="text-right mr-1">
          <span className={`text-xl font-bold tabular-nums leading-none ${priceColor}`}>
            {station.prix.toFixed(3)}
          </span>
          <span className="text-slate-400 text-xs block">€/L</span>
          {savings > 0.005 && (
            <span className="text-emerald-600 text-xs font-medium block leading-none mt-0.5">
              −{(savings * 100).toFixed(0)} cts
            </span>
          )}
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 active:bg-blue-50 transition-colors"
        >
          <IconNav className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default function FuelSearch() {
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [fuel, setFuel] = useState<FuelType>("SP95");
  const [radius, setRadius] = useState("10");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"prix" | "distance">("prix");
  const [searched, setSearched] = useState(false);
  const [excludeAutoroute, setExcludeAutoroute] = useState(false);
  const [hideRupture, setHideRupture] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore preferences from localStorage
  useEffect(() => {
    const savedFuel = localStorage.getItem("fuel") as FuelType;
    if (savedFuel && FUELS.some((f) => f.key === savedFuel)) setFuel(savedFuel);
    const savedRadius = localStorage.getItem("radius");
    if (savedRadius) setRadius(savedRadius);
    const savedExcludeAutoroute = localStorage.getItem("excludeAutoroute");
    if (savedExcludeAutoroute !== null) setExcludeAutoroute(savedExcludeAutoroute === "true");
  }, []);

  function handleFuelChange(f: FuelType) {
    setFuel(f);
    localStorage.setItem("fuel", f);
  }

  function handleRadiusChange(r: string) {
    setRadius(r);
    localStorage.setItem("radius", r);
  }

  function handleExcludeAutorouteChange(v: boolean) {
    setExcludeAutoroute(v);
    localStorage.setItem("excludeAutoroute", String(v));
  }

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(
        (data.features as Array<{
          properties: { label: string };
          geometry: { coordinates: [number, number] };
        }>)?.map((f) => ({
          label: f.properties.label,
          coordinates: f.geometry.coordinates,
        })) ?? []
      );
    } catch {
      setSuggestions([]);
    }
  }, []);

  function handleAddressChange(value: string) {
    setAddress(value);
    setShowSuggestions(true);
    setCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 280);
  }

  function selectSuggestion(s: AddressSuggestion) {
    setAddress(s.label);
    setLocationLabel(s.label);
    setCoords({ lat: s.coordinates[1], lon: s.coordinates[0] });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setError("Géolocalisation non disponible.");
      return;
    }
    setGeoLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setAddress("Ma position");
        setLocationLabel("votre position");
        setSuggestions([]);
        setShowSuggestions(false);
        setGeoLoading(false);
      },
      () => {
        setError("Impossible d'obtenir votre position.");
        setGeoLoading(false);
      }
    );
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!coords) {
      setError("Saisissez une adresse ou utilisez la géolocalisation.");
      return;
    }
    setLoading(true);
    setError("");
    setStations([]);
    setSearched(false);

    try {
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lon),
        fuel,
        radius,
      });
      const res = await fetch(`/api/stations?${params}`);
      const data: { results?: Station[]; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la recherche.");
        return;
      }

      const results: Station[] = (data.results ?? []).map((s) => ({
        ...s,
        distance: s.geom
          ? haversineKm(coords.lat, coords.lon, s.geom.lat, s.geom.lon)
          : undefined,
      }));

      setStations(results);
      setSearched(true);

      if (results.length === 0) {
        const f = FUELS.find((x) => x.key === fuel);
        setError(`Aucune station trouvée pour ${f?.label ?? fuel} dans ${radius} km.`);
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStations = stations.filter((s) => {
    if (excludeAutoroute && s.pop === "A") return false;
    if (hideRupture && s.rupture) return false;
    return true;
  });

  const sortedStations = [...filteredStations].sort((a, b) => {
    if (sortBy === "distance") return (a.distance ?? 999) - (b.distance ?? 999);
    return a.prix - b.prix;
  });

  const prices = filteredStations.map((s) => s.prix);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const ruptureCount = stations.filter((s) => s.rupture).length;
  const autorouteCount = stations.filter((s) => s.pop === "A").length;
  const hiddenCount = stations.length - filteredStations.length;
  const fuelInfo = FUELS.find((f) => f.key === fuel)!;

  return (
    <div className="space-y-4">
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">

        {/* Address row */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Adresse, ville…"
              autoComplete="off"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 placeholder:text-slate-400"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => selectSuggestion(s)}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            title="Me géolocaliser"
            className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 active:bg-blue-50 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {geoLoading
              ? <IconSpinner className="w-4 h-4 animate-spin" />
              : <IconPin className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Fuel pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
          {FUELS.map(({ key, short }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleFuelChange(key)}
              className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                fuel === key
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 active:bg-slate-50"
              }`}
            >
              {short}
            </button>
          ))}
        </div>

        {/* Radius + submit */}
        <div className="flex gap-2">
          <select
            value={radius}
            onChange={(e) => handleRadiusChange(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 flex-shrink-0"
          >
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
            <option value="50">50 km</option>
          </select>
          <button
            type="submit"
            disabled={loading || !coords}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Recherche…" : "Trouver"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeAutoroute}
              onChange={(e) => handleExcludeAutorouteChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">Sans autoroutes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideRupture}
              onChange={(e) => setHideRupture(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">Masquer les ruptures</span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}
      </form>

      {/* Results */}
      {searched && stations.length > 0 && (
        <div className="space-y-3">
          {/* Stats + sort */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{filteredStations.length}</span> stations
                {" · "}<span className="font-medium text-slate-700">{fuelInfo.short}</span>
                {" · "}{locationLabel}
              </p>
              {hiddenCount > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {hiddenCount} masquée{hiddenCount > 1 ? "s" : ""}
                  {ruptureCount > 0 && hideRupture && ` (${ruptureCount} rupture${ruptureCount > 1 ? "s" : ""})`}
                  {autorouteCount > 0 && excludeAutoroute && ` (${autorouteCount} autoroute${autorouteCount > 1 ? "s" : ""})`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
              <button
                onClick={() => setSortBy("prix")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sortBy === "prix" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Prix
              </button>
              <button
                onClick={() => setSortBy("distance")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sortBy === "distance" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Distance
              </button>
            </div>
          </div>

          {/* Price range */}
          {minPrice > 0 && (
            <div className="flex items-center gap-3 px-1 text-xs text-slate-500">
              <span><span className="font-semibold text-emerald-600">{minPrice.toFixed(3)} €</span> min</span>
              <span className="text-slate-300">—</span>
              <span><span className="font-semibold text-red-500">{maxPrice.toFixed(3)} €</span> max</span>
              <span className="text-slate-300">—</span>
              <span>écart {((maxPrice - minPrice) * 100).toFixed(1)} cts</span>
            </div>
          )}

          <div className="space-y-2">
            {sortedStations.map((station, index) => (
              <StationCard
                key={station.id}
                station={station}
                rank={sortBy === "prix" ? index + 1 : undefined}
                min={minPrice}
                max={maxPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
