// src/context/ApiClients.ts
export type ApiError = Error & { status?: number; code?: string };

function toApiError(res: Response, data: any): ApiError {
  const err: ApiError = new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  (err as ApiError).status = res.status;
  (err as ApiError).code = data?.code;
  return err as ApiError;
}

export interface TokenProvider {
  getToken: () => Promise<string | null>;
  refreshToken?: () => Promise<string | null>;
}

export class ApiClient {
  private base: string;
  private tp: TokenProvider;

  constructor(base: string, tp: TokenProvider) {
    this.base = base.replace(/\/$/, "");
    this.tp = tp;
  }

  private async authedFetch(path: string, init: RequestInit = {}) {
    const token = await this.tp.getToken();
    if (!token) throw new Error("Not authenticated");

    const isForm = init.body instanceof FormData;
    const bodyStr =
      !isForm && init.body && typeof init.body !== "string"
        ? JSON.stringify(init.body)
        : (init.body as string | undefined);

    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (!isForm && bodyStr && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res = await fetch(`${this.base}${path}`, {
      ...init,
      headers,
      body: isForm ? (init.body as FormData) : bodyStr,
    });

    if (res.status === 401 && this.tp.refreshToken) {
      const nt = await this.tp.refreshToken();
      if (nt) {
        headers.set("Authorization", `Bearer ${nt}`);
        res = await fetch(`${this.base}${path}`, {
          ...init,
          headers,
          body: isForm ? (init.body as FormData) : bodyStr,
        });
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw toApiError(res, data);
    }
    return res;
  }

  // ✅ add optional opts so callers can pass AbortSignal etc.
  get(p: string, opts?: { signal?: AbortSignal }): Promise<any> {
    return this.authedFetch(p, { signal: opts?.signal }).then((r) => r.json());
  }

  postJson(p: string, body: any, opts?: { signal?: AbortSignal }): Promise<any> {
    return this.authedFetch(p, { method: "POST", body, signal: opts?.signal }).then((r) =>
      r.json()
    );
  }

  postForm(p: string, form: FormData, opts?: { signal?: AbortSignal }): Promise<any> {
    return this.authedFetch(p, { method: "POST", body: form, signal: opts?.signal }).then((r) =>
      r.json()
    );
  }
}
