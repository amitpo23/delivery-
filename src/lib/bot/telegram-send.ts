interface InlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

/**
 * Outgoing Telegram messages — separate from the
 * notification-channel TelegramSender (src/lib/notifications/telegram.ts)
 * because the bot replies don't go through notification_log; they're
 * conversational, not a delivery event.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { replyMarkup?: InlineKeyboard },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // Stub mode — log only so a deploy without the token still works.
    console.log("[telegram stub]", chatId, text.slice(0, 80));
    return;
  }
  const requestBody: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: false,
  };
  if (options?.replyMarkup) {
    requestBody.reply_markup = options.replyMarkup;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${errBody}`);
  }
}

/** Convenience wrapper for callers that always want a keyboard. */
export async function sendTelegramMessageWithKeyboard(
  chatId: string | number,
  text: string,
  replyMarkup: InlineKeyboard,
): Promise<void> {
  return sendTelegramMessage(chatId, text, { replyMarkup });
}

/**
 * Acknowledge a callback_query so the Telegram client stops the spinner on
 * the inline button. Optionally show a small toast (`text`) at the top of
 * the chat. Telegram requires a response within ~15s of the callback or it
 * marks the query as expired.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram stub] answerCallbackQuery", callbackQueryId, text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text ?? "",
      show_alert: showAlert,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram answerCallbackQuery failed: ${res.status} ${body}`);
  }
}
