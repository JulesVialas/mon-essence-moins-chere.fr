"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const StationMap = dynamic(() => import("./StationMap"), { ssr: false });

type FuelType = "Gazole" | "SP95" | "SP98" | "E10" | "E85" | "GPLc";

type AddressSuggestion = {
  label: string;
  coordinates: [number, number];
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

// ─── Navigation bottom sheet ────────────────────────────────────────────────

function NavigationSheet({
  station,
  fuelLabel,
  onClose,
}: {
  station: Station | null;
  fuelLabel: string;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (station) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [station]);

  if (!station) return null;

  const lat = station.geom?.lat ?? 0;
  const lon = station.geom?.lon ?? 0;
  const addr = encodeURIComponent(`${station.adresse}, ${station.cp} ${station.ville}`);

  const navApps = [
    {
      name: "Apple Plans",
      url: `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`,
      bg: "bg-slate-900",
      text: "text-white",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      ),
    },
    {
      name: "Google Maps",
      url: `https://www.google.com/maps/dir/?api=1&destination=${addr}`,
      bg: "bg-white border border-slate-200",
      text: "text-slate-800",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      ),
    },
    {
      name: "Waze",
      url: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
      bg: "bg-cyan-500",
      text: "text-white",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 2.8 1.1 5.4 2.9 7.3L3 22.5l3.3-1.3C7.9 22.3 9.9 23 12 23c5.8 0 10.5-4.7 10.5-10.5S17.8 1.5 12 1.5zm0 19c-1.9 0-3.7-.6-5.2-1.6l-.4-.2-2.5 1 1-2.4-.3-.4C3.6 15.4 3 13.8 3 12 3 6.8 7 2.8 12 2.8s9 4 9 9-4 9.7-9 9.7zm4.5-7.2c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.2-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4 0-.2-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.6.6-.9 1.3-.9 2.1 0 .9.4 1.8 1.1 2.5 1.3 1.5 2.8 2.5 4.5 3 .5.1 1 .2 1.5.2.4 0 .8-.1 1.2-.3.5-.3.8-.7.9-1.2l.1-.5c0-.1-.1-.3-.5-.3z"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Map preview */}
        {station.geom && (
          <div className="h-44 w-full overflow-hidden">
            <StationMap lat={station.geom.lat} lon={station.geom.lon} />
          </div>
        )}

        <div className="px-5 pt-4 pb-8">
          {/* Station info */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 text-base leading-snug">
                  {station.adresse}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  {station.cp} {station.ville}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-2xl font-bold tabular-nums ${getPriceColor(station.prix, station.prix, station.prix)}`}>
                  {station.prix.toFixed(3)}
                </span>
                <span className="text-slate-400 text-sm ml-1">€/L</span>
                <p className="text-xs text-slate-400 mt-0.5">{fuelLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {station.distance !== undefined && (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  {station.distance < 1
                    ? `${Math.round(station.distance * 1000)} m`
                    : `${station.distance.toFixed(1)} km`}
                </span>
              )}
              {station.maj && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                  {formatDate(station.maj)}
                </span>
              )}
              {station.pop === "A" && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full font-medium">
                  Autoroute
                </span>
              )}
              {station.rupture && (
                <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">
                  Rupture signalée
                </span>
              )}
            </div>
          </div>

          {/* Navigation label */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Ouvrir l&apos;itinéraire dans
          </p>

          {/* Nav app buttons */}
          <div className="space-y-2.5">
            {navApps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl ${app.bg} ${app.text} font-medium text-sm active:scale-95 transition-transform`}
              >
                {app.icon}
                <span>{app.name}</span>
                <svg className="w-4 h-4 ml-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Station card ────────────────────────────────────────────────────────────

function StationCard({
  station,
  rank,
  min,
  max,
  onClick,
}: {
  station: Station;
  rank?: number;
  min: number;
  max: number;
  onClick: () => void;
}) {
  const priceColor = getPriceColor(station.prix, min, max);
  const ageH = getPriceAgeHours(station.maj);
  const isStale = ageH > 48;
  const dateColor = ageH > 72 ? "text-red-400" : ageH > 48 ? "text-amber-400" : "text-slate-400";
  const savings = max - station.prix;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border flex items-stretch overflow-hidden active:scale-[0.98] transition-transform ${
        station.rupture ? "border-red-100 opacity-60" : "border-slate-100"
      }`}
    >
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
            <span className={`text-xs ${dateColor}`}>
              {formatDate(station.maj)}{isStale ? " ⚠" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Price + savings + arrow */}
      <div className="flex items-center gap-2 pr-3 flex-shrink-0">
        <div className="text-right">
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
        <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedFuel = localStorage.getItem("fuel") as FuelType;
    if (savedFuel && FUELS.some((f) => f.key === savedFuel)) setFuel(savedFuel);
    const savedRadius = localStorage.getItem("radius");
    if (savedRadius) setRadius(savedRadius);
    const savedExclude = localStorage.getItem("excludeAutoroute");
    if (savedExclude !== null) setExcludeAutoroute(savedExclude === "true");
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
    if (!navigator.geolocation) { setError("Géolocalisation non disponible."); return; }
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
    if (!coords) { setError("Saisissez une adresse ou utilisez la géolocalisation."); return; }
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

      if (!res.ok) { setError(data.error ?? "Erreur lors de la recherche."); return; }

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
      <form onSubmit={handleSearch} className="space-y-3">
        {/* Address */}
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
            {geoLoading ? <IconSpinner className="w-4 h-4 animate-spin" /> : <IconPin className="w-4 h-4" />}
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
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 flex-shrink-0"
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
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
        )}
      </form>

      {/* Results */}
      {searched && stations.length > 0 && (
        <div className="space-y-3">
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
                  {ruptureCount > 0 && hideRupture && ` · ${ruptureCount} rupture${ruptureCount > 1 ? "s" : ""}`}
                  {autorouteCount > 0 && excludeAutoroute && ` · ${autorouteCount} autoroute${autorouteCount > 1 ? "s" : ""}`}
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
                onClick={() => setSelectedStation(station)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation bottom sheet */}
      <NavigationSheet
        station={selectedStation}
        fuelLabel={fuelInfo.label}
        onClose={() => setSelectedStation(null)}
      />
    </div>
  );
}
