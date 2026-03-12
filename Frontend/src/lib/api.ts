const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; expiresAt: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  register: (email: string, password: string, fullName: string, phone?: string, recaptchaToken?: string) =>
    api<{ userId: number }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, phone: phone || null, recaptchaToken: recaptchaToken || null }),
    }),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string; expiresAt: string }>(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) }
    ),
  me: () =>
    api<{
      id: number;
      email: string;
      fullName: string;
      phone?: string;
      avatarUrl?: string;
      role: string;
      currentPlanId?: number;
      planExpiresAt?: string;
    }>("/api/auth/me"),
};

export const workspacesApi = {
  list: () =>
    api<
      Array<{
        id: number;
        name: string;
        slug: string;
        logoUrl?: string;
        isDefault: boolean;
        createdAt: string;
      }>
    >("/api/workspaces"),
  get: (id: number) =>
    api<{
      id: number;
      name: string;
      slug: string;
      logoUrl?: string;
      isDefault: boolean;
      createdAt: string;
    }>(`/api/workspaces/${id}`),
  create: (name: string, slug: string) =>
    api<{
      id: number;
      name: string;
      slug: string;
      logoUrl?: string;
      isDefault: boolean;
      createdAt: string;
    }>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name, slug }),
    }),
};

export const templatesApi = {
  list: (category?: string) =>
    api<
      Array<{
        id: number;
        name: string;
        category: string;
        thumbnailUrl?: string;
        createdAt: string;
      }>
    >(category ? `/api/templates?category=${encodeURIComponent(category)}` : "/api/templates"),
  get: (id: number) =>
    api<{
      id: number;
      name: string;
      category: string;
      thumbnailUrl?: string;
      jsonContent: string;
      createdAt: string;
    }>(`/api/templates/${id}`),
};

export type PageItem = {
  id: number;
  workspaceId: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  updatedAt: string;
};

export const editorToolsApi = {
  list: () =>
    api<import("../types/editor").ToolCategoryData[]>("/api/editor-tools"),
};

export const pagesApi = {
  list: (workspaceId: number) =>
    api<PageItem[]>(`/api/pages?workspaceId=${workspaceId}`),
  create: (workspaceId: number, name: string, slug: string, templateId?: number) =>
    api<PageItem>("/api/pages", {
      method: "POST",
      body: JSON.stringify({ workspaceId, name, slug, templateId: templateId ?? null }),
    }),
  update: (id: number, name: string, slug: string) =>
    api<PageItem>(`/api/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, slug }),
    }),
  delete: (id: number) =>
    api<{ ok: boolean }>(`/api/pages/${id}`, { method: "DELETE" }),
  duplicate: (id: number) =>
    api<PageItem>(`/api/pages/${id}/duplicate`, { method: "POST" }),
  publish: (id: number) =>
    api<{ ok: boolean }>(`/api/pages/${id}/publish`, { method: "POST" }),
  getStats: (id: number) =>
    api<{
      pageId: number;
      pageName: string;
      viewCount: number;
      conversionCount: number;
      lastViewedAt: string | null;
    }>(`/api/pages/${id}/stats`),
  getContent: (id: number) =>
    api<import("../types/editor").PageContent>(`/api/pages/${id}/content`),
  updateContent: (id: number, content: import("../types/editor").PageContent) =>
    api<{ ok: boolean }>(`/api/pages/${id}/content`, {
      method: "PUT",
      body: JSON.stringify(content),
    }),
};
