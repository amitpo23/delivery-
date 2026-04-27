"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const pickupIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#1E3A5F" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>'
    ),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#F97316" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>'
    ),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface Props {
  pickup?: { lat: number; lng: number; address: string } | null;
  delivery?: { lat: number; lng: number; address: string } | null;
}

const CENTER_NORTH = { lat: 32.78, lng: 35.2 };

export default function TrackingMap({ pickup, delivery }: Props) {
  const points = [pickup, delivery].filter(
    (p): p is { lat: number; lng: number; address: string } =>
      Boolean(p && Number.isFinite(p.lat) && Number.isFinite(p.lng))
  );

  const center = points.length
    ? { lat: average(points.map((p) => p.lat)), lng: average(points.map((p) => p.lng)) }
    : CENTER_NORTH;

  const zoom = points.length === 0 ? 9 : points.length === 1 ? 12 : 10;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng) && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>איסוף: {pickup.address}</Popup>
        </Marker>
      )}
      {delivery && Number.isFinite(delivery.lat) && Number.isFinite(delivery.lng) && (
        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
          <Popup>מסירה: {delivery.address}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
