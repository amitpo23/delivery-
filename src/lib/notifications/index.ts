import { TelegramSender } from "./telegram";
import { WhatsAppSender } from "./whatsapp";
import type { Channel, NotificationSender } from "./types";

export * from "./types";
export * from "./templates";
export { TelegramSender, WhatsAppSender };

const senders = new Map<Channel, NotificationSender>();

export function getSender(channel: Channel): NotificationSender {
  const cached = senders.get(channel);
  if (cached) return cached;
  let sender: NotificationSender;
  switch (channel) {
    case "telegram":
      sender = new TelegramSender();
      break;
    case "whatsapp":
      sender = new WhatsAppSender();
      break;
    case "sms":
    case "email":
      throw new Error(`Channel '${channel}' not implemented yet`);
  }
  senders.set(channel, sender);
  return sender;
}

/** Test seam — drop cached senders so each test starts fresh. */
export function _resetSendersForTest() {
  senders.clear();
}
