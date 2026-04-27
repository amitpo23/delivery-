"use client";

import dynamic from "next/dynamic";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] bg-gray-100 rounded-xl flex items-center justify-center text-muted text-sm">
      טוען מפה…
    </div>
  ),
});

interface Props {
  pickup?: { lat: number; lng: number; address: string } | null;
  delivery?: { lat: number; lng: number; address: string } | null;
}

export default function TrackingMapWrapper(props: Props) {
  return <TrackingMap {...props} />;
}
