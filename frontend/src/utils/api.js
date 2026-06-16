import { API_BASE_URL } from '../config';

export function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function asJson(res) {
  if (res.status === 204 || res.status === 205) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function request(path, { method = 'GET', body, isForm } = {}) {
  const headers = authHeaders(isForm ? {} : (body ? { 'Content-Type': 'application/json' } : {}));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || parsed.error || text;
        } catch { message = text; }
      }
    } catch { /* ignore */ }
    // Note: we deliberately do NOT clear the token here on 401. A 401 from one
    // endpoint while other endpoints still work with the same token is a
    // server-side bug (likely the endpoint not yet deployed), not an actual
    // expired session — wiping the token would mask the real cause and force
    // the user out for no reason. The caller decides what to do with err.status.
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return asJson(res);
}

export const reviewsApi = {
  lockStatus: () => request('/api/reviews/lock-status'),
  active: () => request('/api/reviews/active'),
  history: () => request('/api/reviews/history'),
  gallery: () => request('/api/reviews/gallery'),
  create: (measurements) => request('/api/reviews', { method: 'POST', body: measurements }),
  uploadImage: (reviewId, file, view) => {
    const form = new FormData();
    form.append('file', file);
    if (view) form.append('view', view);
    return request(`/api/reviews/${reviewId}/images`, { method: 'POST', body: form, isForm: true });
  },
  deleteImage: (imageId) => request(`/api/reviews/images/${imageId}`, { method: 'DELETE' }),
  feedbackReceived: (reviewId) => request(`/api/reviews/${reviewId}/feedback-received`, { method: 'POST' }),
  // Coach
  pending: () => request('/api/reviews/pending'),
  byClient: (clientId) => request(`/api/reviews/by-client/${clientId}`),
  validate: (reviewId, feedback) => request(`/api/reviews/${reviewId}/validate`, { method: 'POST', body: { feedback } }),
  imageUrl: (imageId) => `${API_BASE_URL}/api/reviews/images/${imageId}`,
};

export const authApi = {
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};

export const usersApi = {
  completeOnboarding: (measurements) => request('/api/users/me/complete-onboarding', { method: 'POST', body: measurements }),
  uploadInitialPhoto: (file, view) => {
    const form = new FormData();
    form.append('file', file);
    if (view) form.append('view', view);
    return request('/api/users/me/initial-photo', { method: 'POST', body: form, isForm: true });
  },
  updateMe: (dto) => request('/api/users/me', { method: 'PUT', body: dto }),
  updateClient: (clientId, dto) => request(`/api/users/clients/${clientId}`, { method: 'PUT', body: dto }),
  resetClientPassword: (clientId) => request(`/api/users/clients/${clientId}/reset-password`, { method: 'POST' }),
};
