export type Channel = "telegram" | "whatsapp" | "sms" | "email";

export type NotificationTemplate =
  | "order.created"
  | "order.assigned.driver"
  | "order.assigned.customer"
  | "order.picked_up"
  | "order.delivered"
  | "order.cancelled"
  | "order.returned"
  | "order.pending_admin_attention"
  | "order.next_step.driver";

export interface InlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

export interface NotificationRequest {
  template: NotificationTemplate;
  recipient: string;        // chat_id for telegram, E.164 phone for whatsapp/sms, email
  channel: Channel;
  payload: Record<string, string | number | null | undefined>;
  /** Stable idempotency key — same value across webhook retries. */
  eventId: string;
  orderId?: string;
  /** Telegram-only: inline keyboard attached to the message. Other channels ignore. */
  replyMarkup?: InlineKeyboard;
}

export interface NotificationResult {
  ok: boolean;
  externalId?: string;
  failureReason?: string;
  raw?: unknown;
}

export interface NotificationSender {
  channel: Channel;
  send(req: NotificationRequest): Promise<NotificationResult>;
}

export class NotificationError extends Error {
  constructor(message: string, public readonly channel: Channel, public readonly cause?: unknown) {
    super(message);
    this.name = "NotificationError";
  }
}
