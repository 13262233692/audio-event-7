import type { Project, Annotation, Label, TagSuggestion } from '@/types';

const API_BASE = 'http://localhost:8000/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const api = {
  projects: {
    getAll: () =>
      fetch(`${API_BASE}/projects`).then(r => handleResponse<Project[]>(r)),

    create: (name: string, audioFile: File) => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('audio_file', audioFile);
      return fetch(`${API_BASE}/projects`, {
        method: 'POST',
        body: formData,
      }).then(r => handleResponse<Project>(r));
    },

    get: (id: string) =>
      fetch(`${API_BASE}/projects/${id}`).then(r => handleResponse<Project>(r)),

    delete: (id: string) =>
      fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
      }).then(r => handleResponse<{ success: boolean }>(r)),

    getAudioUrl: (id: string) => `${API_BASE}/projects/${id}/audio`,
  },

  annotations: {
    getByProject: (projectId: string) =>
      fetch(`${API_BASE}/projects/${projectId}/annotations`).then(r => handleResponse<Annotation[]>(r)),

    create: (projectId: string, data: Omit<Annotation, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
      fetch(`${API_BASE}/projects/${projectId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => handleResponse<Annotation>(r)),

    update: (id: string, data: Partial<Pick<Annotation, 'startTime' | 'endTime' | 'label'>>) =>
      fetch(`${API_BASE}/annotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => handleResponse<Annotation>(r)),

    delete: (id: string) =>
      fetch(`${API_BASE}/annotations/${id}`, {
        method: 'DELETE',
      }).then(r => handleResponse<{ success: boolean }>(r)),
  },

  labels: {
    getAll: () =>
      fetch(`${API_BASE}/labels`).then(r => handleResponse<Label[]>(r)),
  },

  export: {
    download: (projectId: string, format: 'json' | 'csv', includeConfidence: boolean) => {
      const url = `${API_BASE}/export/${projectId}?format=${format}&includeConfidence=${includeConfidence}`;
      window.open(url, '_blank');
    },
  },
};
