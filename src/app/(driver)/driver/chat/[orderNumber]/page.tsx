"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

export default function DriverChatPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/driver/tasks" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">צ&apos;אט</h1>
          <div className="text-xs text-muted font-mono" dir="ltr">
            #{orderNumber}
          </div>
        </div>
      </div>
      <div className="card !p-4">
        <ChatPanel orderNumber={orderNumber} />
      </div>
    </div>
  );
}
