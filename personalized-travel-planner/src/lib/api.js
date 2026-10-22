import { supabase } from './supabase';

// Use Vite's proxy locally to avoid browser CORS; production uses same-origin
// Vercel rewrites unless an external API origin was explicitly configured.
const API = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function api(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Unable to read your session.');
  const token = data.session?.access_token;
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new Error('Cannot reach the travel planner API. Make sure the backend is running, then retry.');
  }
  if (response.status === 204) return null;
  const responseText = await response.text();
  let payload = {};
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { detail: responseText };
    }
  }
  if (!response.ok) {
    const detail = payload.detail || payload.error || 'Request failed. Please try again.';
    if (response.status === 401 && token) {
      await supabase.auth.signOut();
      throw new Error('Your session expired. Please sign in again.');
    }
    throw new Error(typeof detail === 'string' ? detail : 'Request failed. Please check your input.');
  }
  return payload;
}
