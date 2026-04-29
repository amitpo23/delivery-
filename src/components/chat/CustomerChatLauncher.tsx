"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ChatPanel from "./ChatPanel";

/**
 * Anonymous-tracker chat opener: collects the phone once (used as
 * proof-of-ownership) and then mounts ChatPanel. Stays in the same card
 * so the user doesn't lose context.
 */
export default function CustomerChatLauncher({ orderNumber }: { orderNumber: string }) {
  const [phone, setPhone] = useState<string>("");
  const [open, setOpen] = useState(false);

  if (open && phone) {
    return <ChatPanel orderNumber={orderNumber} phone={phone} />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-secondary" />
        שיחה עם הנהג / המוקד
      </h3>
      <p className="text-xs text-muted">
        להגנה על השיחה, הזן את הטלפון שאיתו ביצעת את ההזמנה.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phone.trim().length >= 7) setOpen(true);
        }}
        className="flex gap-2"
      >
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-1234567"
          dir="ltr"
          className="input-field !py-2 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={phone.trim().length < 7}
          className="btn-primary !py-2 px-3 text-sm disabled:opacity-50"
        >
          פתח שיחה
        </button>
      </form>
    </div>
  );
}
