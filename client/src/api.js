const base = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${base}/api${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const api = {
  health: () => request('/health'),
  stats: () => request('/stats'),
  candidates: (params = {}) => request(`/candidates?${new URLSearchParams(params)}`),
  candidate: (id) => request(`/candidates/${id}`),
  createCandidate: (data) => request('/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateCandidate: (id, data) => request(`/candidates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  history: (id) => request(`/candidates/${id}/history`),
  moveCandidate: (id, stage, note = '') => request(`/candidates/${id}/stage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage, note }) }),
  interviews: () => request('/interviews'),
  createInterview: (data) => request('/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateInterview: (id, data) => request(`/interviews/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  scoreResume: (id, file) => { const form = new FormData(); form.append('resume', file); return request(`/candidates/${id}/resume-score`, { method: 'POST', body: form }); },
};