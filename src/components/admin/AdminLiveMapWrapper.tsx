"use client";

import dynamic from "next/dynamic";

// react-leaflet uses window — load on the client only.
const AdminLiveMap = dynamic(() => import("./AdminLiveMap"), { ssr: false });

export default AdminLiveMap;
