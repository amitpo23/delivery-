export type UserRole = "admin" | "dispatcher" | "driver" | "customer" | "supplier";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "returned";

export type ServiceType = "express" | "same_day" | "next_day" | "economy";

export type PackageType = "documents" | "small_package" | "package" | "fragile" | "heavy";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  driver_id: string | null;
  status: OrderStatus;
  service_type: ServiceType;
  pickup_address: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  package_type: PackageType;
  package_weight_kg: number;
  package_description: string | null;
  special_instructions: string | null;
  estimated_price: number;
  final_price: number | null;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string | null;
}

export interface Customer {
  id: string;
  user_id: string;
  customer_type: "private" | "business";
  company_name: string | null;
  notes: string | null;
}

export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  is_default: boolean;
}

export interface PriceCalculation {
  basePrice: number;
  distanceSurcharge: number;
  weightSurcharge: number;
  typeSurcharge: number;
  subtotal: number;
  vat: number;
  total: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "ממתין לאישור",
  confirmed: "אושר",
  assigned: "שובץ שליח",
  picked_up: "נאסף",
  in_transit: "בדרך",
  delivered: "נמסר",
  cancelled: "בוטל",
  returned: "הוחזר",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  assigned: "#8B5CF6",
  picked_up: "#6366F1",
  in_transit: "#F97316",
  delivered: "#10B981",
  cancelled: "#EF4444",
  returned: "#6B7280",
};
