/**
 * Thin Sumit API wrapper. Endpoints + body shapes follow the public
 * v1 swagger at https://app.sumit.co.il/swagger/v1/swagger.json
 *
 * Auth: every request body carries a `Credentials: { CompanyID, APIKey }`
 * pair. There is no header-based auth in this API.
 *
 * The base host is api.sumit.co.il in production. SUMIT_API_BASE can
 * override (e.g. when Sumit publishes a sandbox).
 */

const DEFAULT_BASE = "https://api.sumit.co.il";

export interface SumitCreds {
  CompanyID: number;
  APIKey: string;
}

export class SumitApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "SumitApiError";
  }
}

export async function sumitPost<TBody, TRes>(
  path: string,
  body: TBody,
): Promise<TRes> {
  const base = process.env.SUMIT_API_BASE ?? DEFAULT_BASE;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Language": "he",
    },
    body: JSON.stringify(body),
    // Sumit can be slow on first cold-call; 30s ceiling protects us
    // against hung sockets without giving up too fast.
    signal: AbortSignal.timeout(30_000),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new SumitApiError(`Sumit returned non-JSON ${res.status}`, res.status, null);
  }

  if (!res.ok) {
    throw new SumitApiError(
      `Sumit ${path} → ${res.status}`,
      res.status,
      json,
    );
  }

  return json as TRes;
}

export function getCreds(): SumitCreds | null {
  const id = process.env.SUMIT_COMPANY_ID;
  const key = process.env.SUMIT_API_KEY;
  if (!id || !key) return null;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return null;
  return { CompanyID: numeric, APIKey: key };
}
