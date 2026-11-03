let rawApi = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
if (!rawApi.startsWith('http://') && !rawApi.startsWith('https://') && !rawApi.startsWith('/')) {
  rawApi = `https://${rawApi}`;
}
const baseApi = rawApi.replace(/\/+$/, '');
const API = baseApi.endsWith('/api') ? baseApi : `${baseApi}/api`;

export function getToken() {
  return localStorage.getItem('tm_token');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();

  if (token && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, { ...options, headers });

  // Handle non-JSON responses (like 500 errors or HTML fallback pages)
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("API returned invalid JSON:", text);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}