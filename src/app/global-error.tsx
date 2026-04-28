"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Caught at the top level when the app shell itself fails. Reports to
 * Sentry and renders a minimal fallback so the browser tab still shows
 * something better than an unstyled stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>משהו השתבש</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            התקלה דווחה ונבדק אותה. אפשר לנסות שוב.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#1E3A5F",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
