"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom fuel pin using divIcon — avoids the broken default marker image issue in Next.js
const fuelPin = L.divIcon({
  className: "",
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  html: `
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <g filter="url(#shadow)">
        <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 26 14 26S32 26 32 16C32 8.268 25.732 2 18 2z" fill="#2563eb"/>
        <circle cx="18" cy="16" r="6" fill="white"/>
      </g>
    </svg>
  `,
});

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 15);
  }, [lat, lon, map]);
  return null;
}

export default function StationMap({ lat, lon }: { lat: number; lon: number }) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={15}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full"
      style={{ background: "#e8eaed" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[lat, lon]} icon={fuelPin} />
      <RecenterMap lat={lat} lon={lon} />
    </MapContainer>
  );
}
