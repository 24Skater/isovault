const BASE = '/api';
const STORAGE_KEY = 'isovault_api_key';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getApiKey();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    (window as Window & { __onUnauthorized?: () => void }).__onUnauthorized?.();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
