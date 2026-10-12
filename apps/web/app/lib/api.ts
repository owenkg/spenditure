const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }

  const envelope = (await res.json()) as { data: T };
  return envelope.data;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth state is stored in localStorage because:
// - access_token is httpOnly (not readable by JS)
// - cookies from spenditure-api.onrender.com are never visible in document.cookie
//   when the page is served from spenditure.onrender.com (different origins)
export function isAuthenticated(): boolean {
  return localStorage.getItem('auth') === '1';
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem('auth', '1');
  } else {
    localStorage.removeItem('auth');
  }
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
  setAuthenticated(false);
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadForm: <T>(path: string, form: FormData) => upload<T>(path, form),
};
