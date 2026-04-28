"use client";

import { Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface DriverDot {
  id: string;
  name: string;
  phone: string;
  status: string;
  vehicleType: string | null;
  lat: number;
  lng: number;
  lastUpdate: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
}

const driverIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#10B981" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ),
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const pickupIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#1E3A5F" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>',
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#F97316" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>',
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const NORTH_CENTER: [number, number] = [32.62, 35.3];

export default function AdminLiveMap({
  drivers,
  orders,
}: {
  drivers: DriverDot[];
  orders: OrderRow[];
}) {
  return (
    <MapContainer
      center={NORTH_CENTER}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {drivers.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]} icon={driverIcon}>
          <Popup>
            <div className="space-y-1 text-sm">
              <div className="font-bold">{d.name}</div>
              <div className="text-xs text-gray-600">{d.vehicleType ?? "—"}</div>
              <div className="text-xs">
                <span className="font-medium">סטטוס:</span> {d.status}
              </div>
              {d.lastUpdate && (
                <div className="text-xs text-gray-500">
                  עודכן: {new Date(d.lastUpdate).toLocaleTimeString("he-IL")}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {orders.map((o) => {
        // react-leaflet rejects DOM elements as direct children of MapContainer;
        // it walks the children tree looking for Marker/Polyline. Fragment is
        // a transparent wrapper that lets us group an order's three layers
        // (pickup marker, delivery marker, joining polyline) under a stable key.
        const hasPickup = o.pickup_lat != null && o.pickup_lng != null;
        const hasDelivery = o.delivery_lat != null && o.delivery_lng != null;
        return (
          <Fragment key={o.id}>
            {hasPickup && (
              <Marker position={[o.pickup_lat!, o.pickup_lng!]} icon={pickupIcon}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-bold" dir="ltr">
                      #{o.order_number}
                    </div>
                    <div className="text-xs text-gray-600">איסוף: {o.pickup_address}</div>
                    <div className="text-xs">
                      <span className="font-medium">סטטוס:</span> {o.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
            {hasDelivery && (
              <Marker position={[o.delivery_lat!, o.delivery_lng!]} icon={deliveryIcon}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-bold" dir="ltr">
                      #{o.order_number}
                    </div>
                    <div className="text-xs text-gray-600">מסירה: {o.delivery_address}</div>
                    <div className="text-xs">
                      <span className="font-medium">סטטוס:</span> {o.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
            {hasPickup && hasDelivery && (
              <Polyline
                positions={[
                  [o.pickup_lat!, o.pickup_lng!],
                  [o.delivery_lat!, o.delivery_lng!],
                ]}
                pathOptions={{ color: "#94A3B8", weight: 2, dashArray: "6 4" }}
              />
            )}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
