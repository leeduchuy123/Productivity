const API_BASE = 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    };

    const res = await fetch(url, config);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

export const api = {
    // Pomodoro
    startSession: (data) => request('/pomodoro/sessions', { method: 'POST', body: data }),
    completeSession: (id) => request(`/pomodoro/sessions/${id}/complete`, { method: 'PATCH' }),
    getSessions: (params) => request(`/pomodoro/sessions?${new URLSearchParams(params)}`),
    deleteSession: (id) => request(`/pomodoro/sessions/${id}`, { method: 'DELETE' }),
    getStats: (params) => request(`/pomodoro/stats?${new URLSearchParams(params)}`),

    // Habits
    createHabit: (data) => request('/habits', { method: 'POST', body: data }),
    getHabits: (date) => {
        if (!date) {
            const d = new Date();
            date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return request(`/habits?date=${date}`);
    },
    getHabitById: (id) => request(`/habits/${id}`),
    updateHabit: (id, data) => request(`/habits/${id}`, { method: 'PUT', body: data }),
    deleteHabit: (id) => request(`/habits/${id}`, { method: 'DELETE' }),
    logHabit: (habitId, data) => request(`/habits/${habitId}/log`, { method: 'POST', body: data }),
    getHabitLogs: (habitId, params) => request(`/habits/${habitId}/logs?${new URLSearchParams(params)}`),

    // Media
    uploadMedia: async (type, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/media/upload/${type}`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },
    getMedia: (type) => request(`/media${type ? `?type=${type}` : ''}`),
    deleteMedia: (id) => request(`/media/${id}`, { method: 'DELETE' }),

    // Settings
    getSetting: (key) => request(`/settings/${key}`),
    setSetting: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: { value } }),

    // Media URL helper
    mediaUrl: (path) => `http://localhost:3000${path}`
};
