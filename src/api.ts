const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const url = path.startsWith('/') ? `${BASE_URL}${path}` : path;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  });
  return response;
};

export default BASE_URL;
