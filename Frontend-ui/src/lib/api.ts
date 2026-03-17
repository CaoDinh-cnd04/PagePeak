const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export type PublishCheck = {
  key: string;
  passed: boolean;
  message: string;
};

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
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string; expiresAt?: string; error?: string };
    if (res.status === 403 && data.error === "EMAIL_NOT_VERIFIED") {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
    if (!res.ok) throw new Error(data.error ?? "Đăng nhập thất bại");
    return data as { accessToken: string; refreshToken: string; expiresAt: string };
  },
  register: (email: string, password: string, fullName: string, phone?: string, recaptchaToken?: string) =>
    api<{ userId: number; emailVerificationRequired: boolean; message: string }>("/api/auth/register", {
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
  verifyEmail: async (token: string) => {
    const res = await fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
    if (!res.ok) throw new Error(data.error ?? "Xác thực thất bại");
    return data;
  },
  resendVerification: (email: string) =>
    api<{ ok: boolean; message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
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

export type TemplateItem = {
  id: number;
  name: string;
  category: string;
  thumbnailUrl?: string;
  description?: string;
  designType: string;
  isFeatured: boolean;
  usageCount: number;
  createdAt: string;
};

export type TemplateDetail = TemplateItem & { jsonContent: string };

export const templatesApi = {
  list: (params?: { category?: string; search?: string; designType?: string; featured?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    if (params?.designType) sp.set("designType", params.designType);
    if (params?.featured) sp.set("featured", "true");
    const qs = sp.toString();
    return api<TemplateItem[]>(qs ? `/api/templates?${qs}` : "/api/templates");
  },
  get: (id: number) => api<TemplateDetail>(`/api/templates/${id}`),
  categories: () => api<string[]>("/api/templates/categories"),
};

export type PageItem = {
  id: number;
  workspaceId: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  updatedAt: string;
};

export const settingsApi = {
  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api<{
      id: number;
      email: string;
      fullName: string;
      phone?: string;
      avatarUrl?: string;
      role: string;
      currentPlanId?: number;
      planExpiresAt?: string;
    }>("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ ok: boolean }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getSessions: () =>
    api<
      Array<{
        id: number;
        ipAddress?: string;
        userAgent?: string;
        createdAt: string;
        expiresAt: string;
        isExpired: boolean;
      }>
    >("/api/auth/sessions"),

  revokeSession: (id: number) =>
    api<{ ok: boolean }>(`/api/auth/sessions/${id}`, { method: "DELETE" }),

  getPlanInfo: () =>
    api<{
      plan: {
        id: number;
        name: string;
        code: string;
        price: number;
        billingCycle: string;
        maxPages: number;
        maxMembers: number;
        maxPageViews?: number;
        storageGb: number;
        hasAi: boolean;
        hasEcommerce: boolean;
        hasAutomation: boolean;
        hasAbTest: boolean;
        hasCustomDomain: boolean;
      } | null;
      usage: { totalPages: number; publishedPages: number; totalMembers: number };
      planExpiresAt?: string;
      emailConfirmed: boolean;
      phoneConfirmed: boolean;
      createdAt: string;
      lastLoginAt?: string;
      referralCode?: string;
    }>("/api/settings/plan"),

  upgradePlan: (planId: number) =>
    api<{ ok: boolean; planName: string }>("/api/plans/upgrade", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
};

export const editorToolsApi = {
  list: () =>
    api<import("../types/editor").ToolCategoryData[]>("/api/editor-tools"),
};

export type MediaItem = {
  id: number;
  fileName: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  folder?: string;
  createdAt: string;
};

export const mediaApi = {
  list: (page = 1, pageSize = 40, folder?: string) =>
    api<{ total: number; page: number; pageSize: number; items: MediaItem[] }>(
      `/api/media?page=${page}&pageSize=${pageSize}${folder ? `&folder=${folder}` : ""}`
    ),

  upload: async (file: File, workspaceId?: number, folder?: string): Promise<MediaItem> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    if (workspaceId) form.append("workspaceId", String(workspaceId));
    if (folder) form.append("folder", folder);

    const headers: HeadersInit = {};
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/media/upload`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? res.statusText);
    }
    return res.json();
  },

  delete: (id: number) =>
    api<{ ok: boolean }>(`/api/media/${id}`, { method: "DELETE" }),
};

export const pagesApi = {
  list: (workspaceId: number) =>
    api<PageItem[]>(`/api/pages?workspaceId=${workspaceId}`, { cache: "no-store" } as RequestInit),
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
  publish: async (id: number): Promise<{ ok: boolean; checks?: PublishCheck[]; error?: string }> => {
    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/pages/${id}/publish`, { method: "POST", headers });
    const data = (await res.json()) as { ok: boolean; checks?: PublishCheck[]; error?: string };
    if (res.status === 422) return data;
    if (!res.ok) throw new Error(data.error ?? res.statusText);
    return data;
  },
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

export const tagsApi = {
  list: (workspaceId: number) => api<{ id: number; name: string; color: string | null; createdAt: string }[]>(`/api/tags?workspaceId=${workspaceId}`),
  create: (workspaceId: number, name: string, color?: string) => api<{ id: number; name: string; color: string | null }>("/api/tags", { method: "POST", body: JSON.stringify({ workspaceId, name, color }) }),
  update: (id: number, name?: string, color?: string) => api<{ id: number; name: string; color: string | null }>(`/api/tags/${id}`, { method: "PUT", body: JSON.stringify({ name, color }) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/tags/${id}`, { method: "DELETE" }),
};

export const domainsApi = {
  list: (workspaceId: number) => api<{ id: number; domainName: string; status: string; verifiedAt: string | null; createdAt: string }[]>(`/api/domains?workspaceId=${workspaceId}`),
  create: (workspaceId: number, domainName: string) => api<{ id: number; domainName: string; status: string }>("/api/domains", { method: "POST", body: JSON.stringify({ workspaceId, domainName }) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/domains/${id}`, { method: "DELETE" }),
};

export const formsApi = {
  list: (workspaceId: number) => api<{ id: number; name: string; fieldsJson: string; webhookUrl: string | null; emailNotify: boolean; createdAt: string }[]>(`/api/forms?workspaceId=${workspaceId}`),
  create: (workspaceId: number, name: string, fieldsJson?: string, webhookUrl?: string, emailNotify?: boolean) => api<{ id: number; name: string }>("/api/forms", { method: "POST", body: JSON.stringify({ workspaceId, name, fieldsJson, webhookUrl, emailNotify: emailNotify ?? false }) }),
  update: (id: number, data: { name?: string; fieldsJson?: string; webhookUrl?: string; emailNotify?: boolean }) => api<{ id: number; name: string }>(`/api/forms/${id}`, { method: "PUT", body: JSON.stringify({ ...data, emailNotify: data.emailNotify ?? false }) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/forms/${id}`, { method: "DELETE" }),
};

export type NotificationItem = { id: number; title: string; message: string; type: string; isRead: boolean; createdAt: string };
export const notificationsApi = {
  list: () => api<{ unread: number; items: NotificationItem[] }>("/api/notifications"),
  markRead: (id: number) => api<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => api<{ ok: boolean }>("/api/notifications/mark-all-read", { method: "PUT" }),
};

export type ProductItem = { id: number; name: string; price: number; description: string | null; imageUrl: string | null; category: string | null; stock: number; status: string; createdAt: string };
export const productsApi = {
  list: (workspaceId: number) => api<ProductItem[]>(`/api/products?workspaceId=${workspaceId}`),
  create: (data: { workspaceId: number; name: string; price: number; description?: string; imageUrl?: string; category?: string; stock: number }) => api<ProductItem>("/api/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; price?: number; description?: string; imageUrl?: string; category?: string; stock?: number; status?: string }) => api<ProductItem>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
};

export type OrderItem = { id: number; customerName: string; email: string | null; phone: string | null; productId: number | null; amount: number; status: string; createdAt: string };
export const ordersApi = {
  list: (workspaceId: number, status?: string) => api<OrderItem[]>(`/api/orders?workspaceId=${workspaceId}${status ? `&status=${status}` : ""}`),
  create: (data: { workspaceId: number; customerName: string; email?: string; phone?: string; productId?: number; amount: number }) => api<OrderItem>("/api/orders", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { customerName?: string; email?: string; phone?: string; status?: string }) => api<OrderItem>(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/orders/${id}`, { method: "DELETE" }),
};

export type CustomerItem = { id: number; name: string; email: string | null; phone: string | null; group: string | null; source: string | null; createdAt: string };
export const customersApi = {
  list: (workspaceId: number) => api<CustomerItem[]>(`/api/customers?workspaceId=${workspaceId}`),
  create: (data: { workspaceId: number; name: string; email?: string; phone?: string; group?: string; source?: string }) => api<CustomerItem>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; email?: string; phone?: string; group?: string; source?: string }) => api<CustomerItem>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/customers/${id}`, { method: "DELETE" }),
};

export type LeadItem = { id: number; pageId: number | null; formId: number | null; dataJson: string; ipAddress: string | null; createdAt: string };
export const leadsApi = {
  list: (workspaceId: number, pageId?: number) => api<LeadItem[]>(`/api/leads?workspaceId=${workspaceId}${pageId ? `&pageId=${pageId}` : ""}`),
  delete: (id: number) => api<{ ok: boolean }>(`/api/leads/${id}`, { method: "DELETE" }),
};

export type ReportsOverview = { totalPages: number; publishedPages: number; draftPages: number; totalSections: number; totalElements: number; totalProducts: number; totalOrders: number; totalCustomers: number; totalLeads: number };
export const reportsApi = {
  overview: (workspaceId: number) => api<ReportsOverview>(`/api/reports/overview?workspaceId=${workspaceId}`),
};

export type PlanItem = { id: number; name: string; code: string; price: number; billingCycle: string; maxPages: number; maxMembers: number; maxPageViews: number | null; storageGb: number; hasAi: boolean; hasEcommerce: boolean; hasAutomation: boolean; hasAbTest: boolean; hasCustomDomain: boolean };
export const plansApi = {
  list: () => api<PlanItem[]>("/api/plans"),
};

export type SectionTemplate = { id: number; name: string; thumbnailUrl: string | null; jsonContent: string };
export const sectionTemplatesApi = {
  list: () => api<SectionTemplate[]>("/api/section-templates"),
  create: (name: string, jsonContent: string, previewUrl?: string) =>
    api<{ id: number; name: string }>("/api/section-templates", {
      method: "POST",
      body: JSON.stringify({ name, jsonContent, previewUrl }),
    }),
};

export const fontsApi = {
  list: () => api<string[]>("/api/fonts"),
};
