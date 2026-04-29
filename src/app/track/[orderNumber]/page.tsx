import Link from "next/link";
import { headers } from "next/headers";
import { Package, MapPin, Clock, AlertCircle } from "lucide-react";
import { Timeline } from "@/components/tracking/Timeline";
import TrackingMap from "@/components/tracking/TrackingMapWrapper";
import ComplaintButton from "@/components/tracking/ComplaintButton";
import FeedbackForm from "@/components/tracking/FeedbackForm";
import PushToggle from "@/components/push/PushToggle";
import CustomerChatLauncher from "@/components/chat/CustomerChatLauncher";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";
import { COMPANY_SHORT } from "@/constants/services";
import { formatDate, formatPrice } from "@/lib/utils";

interface OrderRecord {
  id: string;
  order_number: string;
  status: OrderStatus;
  service_type: string;
  pickup_address: string;
  delivery_address: string;
  time_window: string | null;
  distance_km: number | null;
  estimated_price: number | null;
  created_at: string;
  delivered_at: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  rating: number | null;
}

interface HistoryRecord {
  status: string;
  notes: string | null;
  created_at: string;
}

async function fetchTracking(orderNumber: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  if (!host) return { kind: "error" as const, message: "Host not resolvable" };
  try {
    const res = await fetch(`${proto}://${host}/api/track/${encodeURIComponent(orderNumber)}`, {
      cache: "no-store",
    });
    const body = await res.json();
    if (res.status === 404) return { kind: "not_found" as const };
    if (!res.ok) return { kind: "error" as const, message: body?.error ?? "Failed to load" };
    return { kind: "ok" as const, order: body.order as OrderRecord, history: body.history as HistoryRecord[] };
  } catch (err) {
    return { kind: "error" as const, message: err instanceof Error ? err.message : "Network error" };
  }
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const result = await fetchTracking(orderNumber);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary">{COMPANY_SHORT}</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-primary">
            לאתר הראשי
          </Link>
        </div>
      </header>

      <main className="container-custom py-6 md:py-10 max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1 flex items-center gap-2">
          <Package className="w-6 h-6" />
          מעקב משלוח
        </h1>
        <div className="text-sm text-muted mb-6" dir="ltr">
          #{orderNumber}
        </div>

        {result.kind === "not_found" && (
          <div className="card !p-8 text-center">
            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <h2 className="font-bold text-primary mb-1">לא נמצאה הזמנה</h2>
            <p className="text-sm text-muted">בדקו את מספר ההזמנה ונסו שוב.</p>
          </div>
        )}

        {result.kind === "error" && (
          <div className="card !p-6 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-900">שגיאה בטעינת ההזמנה</div>
                <div className="text-sm text-muted mt-1">{result.message}</div>
              </div>
            </div>
          </div>
        )}

        {result.kind === "ok" && (
          <div className="space-y-4">
            <div className="card !p-5">
              <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                  {ORDER_STATUS_LABELS[result.order.status]}
                </span>
                {result.order.estimated_price && (
                  <span className="text-sm text-muted">
                    סה״כ: <span className="text-primary font-bold">{formatPrice(result.order.estimated_price)}</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-muted text-xs">איסוף</div>
                    <div className="font-medium">{result.order.pickup_address}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-muted text-xs">מסירה</div>
                    <div className="font-medium">{result.order.delivery_address}</div>
                  </div>
                </div>
                {result.order.time_window && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                    <div className="text-muted text-xs">חלון זמן</div>
                    <div className="font-medium">{result.order.time_window}</div>
                  </div>
                )}
                <div className="text-xs text-muted pt-2">
                  נוצר: {formatDate(result.order.created_at)}
                </div>
              </div>
            </div>

            <div className="card !p-0 overflow-hidden">
              <div className="h-[320px]">
                <TrackingMap
                  pickup={
                    result.order.pickup_lat !== null && result.order.pickup_lng !== null
                      ? {
                          lat: result.order.pickup_lat,
                          lng: result.order.pickup_lng,
                          address: result.order.pickup_address,
                        }
                      : null
                  }
                  delivery={
                    result.order.delivery_lat !== null && result.order.delivery_lng !== null
                      ? {
                          lat: result.order.delivery_lat,
                          lng: result.order.delivery_lng,
                          address: result.order.delivery_address,
                        }
                      : null
                  }
                />
              </div>
            </div>

            <div className="card !p-5">
              <h2 className="font-bold text-primary mb-4">סטטוס</h2>
              <Timeline current={result.order.status} events={result.history} />
            </div>

            <PushToggle />

            {!["delivered", "cancelled", "returned"].includes(result.order.status) && (
              <div className="card !p-4">
                <CustomerChatLauncher orderNumber={result.order.order_number} />
              </div>
            )}

            <div className="card !p-4 flex items-center justify-between">
              <div className="text-sm text-muted">
                משהו לא כשורה? ניתן לדווח כאן ונחזור אליך בהקדם.
              </div>
              <ComplaintButton orderNumber={result.order.order_number} />
            </div>

            {result.order.status === "delivered" && (
              <div className="card !p-4">
                <FeedbackForm
                  orderNumber={result.order.order_number}
                  alreadyRated={result.order.rating}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
