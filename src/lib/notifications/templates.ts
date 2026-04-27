import type { NotificationTemplate } from "./types";

/**
 * Maps a logical template + payload to the actual user-facing text per channel.
 * All Hebrew. Keep messages short and actionable. Include order_number whenever
 * present so the recipient can identify the shipment.
 */
export function renderMessage(
  template: NotificationTemplate,
  payload: Record<string, string | number | null | undefined>
): { title: string; body: string } {
  const orderNumber = String(payload.orderNumber ?? payload.order_number ?? "");
  const trackingUrl = String(payload.trackingUrl ?? "");
  const driverName = String(payload.driverName ?? "");
  const pickupAddress = String(payload.pickupAddress ?? "");
  const deliveryAddress = String(payload.deliveryAddress ?? "");
  const cancelReason = String(payload.cancelReason ?? "");

  switch (template) {
    case "order.created":
      return {
        title: "ההזמנה התקבלה",
        body: `הזמנה #${orderNumber} התקבלה בהצלחה. נשלח לך עדכון ברגע שתשובץ לשליח.\n${trackingUrl}`,
      };
    case "order.assigned.driver":
      return {
        title: "משלוח חדש שובץ אליך",
        body: `הזמנה #${orderNumber}\nאיסוף: ${pickupAddress}\nמסירה: ${deliveryAddress}`,
      };
    case "order.assigned.customer":
      return {
        title: "השליח בדרך",
        body: `הזמנה #${orderNumber} שובצה לשליח${driverName ? ` ${driverName}` : ""}.\n${trackingUrl}`,
      };
    case "order.picked_up":
      return {
        title: "החבילה נאספה",
        body: `הזמנה #${orderNumber} בדרך אליך.\n${trackingUrl}`,
      };
    case "order.delivered":
      return {
        title: "המשלוח נמסר",
        body: `הזמנה #${orderNumber} נמסרה בהצלחה. תודה שבחרת בנו!`,
      };
    case "order.cancelled":
      return {
        title: "ההזמנה בוטלה",
        body: `הזמנה #${orderNumber} בוטלה.${cancelReason ? ` סיבה: ${cancelReason}` : ""}`,
      };
    case "order.returned":
      return {
        title: "ההזמנה הוחזרה",
        body: `הזמנה #${orderNumber} הוחזרה למחסן.`,
      };
    case "order.pending_admin_attention":
      return {
        title: "הזמנה ממתינה לטיפול",
        body: `הזמנה #${orderNumber} ממתינה לשיבוץ נהג.\nאיסוף: ${pickupAddress}\nמסירה: ${deliveryAddress}`,
      };
  }
}
