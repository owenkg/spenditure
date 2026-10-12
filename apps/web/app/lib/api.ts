const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// --- Token storage ---

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('auth', '1');
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth');
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('auth') === '1';
}

// kept for call-sites that only toggle auth without a token (e.g. legacy code)
export function setAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem('auth', '1');
  } else {
    clearTokens();
  }
}

// --- Errors ---

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Token refresh ---

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const envelope = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    storeTokens(envelope.data.accessToken, envelope.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// --- Core request ---

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry) {
    const refreshed = await attemptRefresh();
    if (refreshed) return request<T>(path, init, false);
    clearTokens();
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }

  const envelope = (await res.json()) as { data: T };
  return envelope.data;
}

// --- Logout ---

export async function logout(): Promise<void> {
  const accessToken = getAccessToken();
  await fetch(`${BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  }).catch(() => {});
  clearTokens();
}

// --- File upload ---

async function upload<T>(path: string, form: FormData): Promise<T> {
  const accessToken = getAccessToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// --- Public API ---

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadForm: <T>(path: string, form: FormData) => upload<T>(path, form),
};
