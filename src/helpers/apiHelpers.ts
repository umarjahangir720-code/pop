import { apiFetch } from '../api';

export const safeApiFetch = async (path: string, options: RequestInit = {}) => {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.error || body.message || response.statusText;
    throw new Error(message);
  }
  return response.json();
};
