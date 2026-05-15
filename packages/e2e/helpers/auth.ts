export function getApiKey(): string {
  const key = process.env['ISO_MANAGER_API_KEY'];
  if (!key) throw new Error('ISO_MANAGER_API_KEY is not set. Run global-setup first.');
  return key;
}

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getApiKey()}` };
}
