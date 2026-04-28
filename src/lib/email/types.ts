export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text fallback. Required. */
  text: string;
  /** HTML body. Optional but recommended. */
  html?: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ id: string }>;
}
