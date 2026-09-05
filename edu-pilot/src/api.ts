import type { OllamaModel, OllamaSettings, Project } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch { /* Keep the HTTP fallback for a non-JSON response. */ }
    throw new Error(message);
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  listProjects: () => request<Project[]>("/projects/"),
  getProject: (id: number) => request<Project>(`/projects/${id}/`),
  createProject: (name: string) => request<Project>("/projects/", json("POST", { name })),
  renameProject: (id: number, name: string) => request<Project>(`/projects/${id}/`, json("PATCH", { name })),
  deleteProject: (id: number) => request<void>(`/projects/${id}/`, { method: "DELETE" }),
  getSettings: () => request<OllamaSettings>("/settings/ollama/"),
  saveSettings: (settings: OllamaSettings) => request<OllamaSettings>("/settings/ollama/", json("PUT", settings)),
  listModels: () => request<{ models: OllamaModel[] }>("/ollama/models/"),
  summarize: (id: number, file: File | null, detail: string) => {
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("detail", detail);
    return request<Project>(`/projects/${id}/summary/`, { method: "POST", body: form });
  },
  generateCards: (id: number) => request<{ cards: Project["cards"] }>(`/projects/${id}/cards/`, { method: "POST" }),
  generateQuiz: (id: number) => request<{ quiz: Project["quiz"] }>(`/projects/${id}/quiz/`, { method: "POST" }),
};
