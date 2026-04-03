import { saveTokens, clearTokens, getRefreshToken } from "./auth";

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

/** Gọi API với retry khi 401 (refresh token) */
async function fetchWithAuth(path: string, options: RequestInit, skipRetry = false): Promise<Response> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !skipRetry && !path.includes("/api/auth/refresh")) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        let refreshData: { accessToken?: string; refreshToken?: string; expiresAt?: string } = {};
        try {
          refreshData = (await refreshRes.json()) as typeof refreshData;
        } catch {
          /* body không phải JSON */
        }
        if (refreshRes.ok && refreshData.accessToken && refreshData.refreshToken && refreshData.expiresAt) {
          saveTokens(refreshData.accessToken, refreshData.refreshToken, refreshData.expiresAt);
          return fetchWithAuth(path, options, true);
        }
        clearTokens();
      } catch {
        clearTokens();
      }
    } else {
      clearTokens();
    }
  }
  return res;
}

/** Body loi ASP.NET: { error }, ProblemDetails { title, errors } */
function messageFromApiErrorBody(raw: string, statusText: string): string {
  if (!raw?.trim()) return statusText;
  try {
    const err = JSON.parse(raw) as {
      error?: string;
      title?: string;
      errors?: Record<string, string[] | string>;
    };
    if (typeof err.error === "string" && err.error) return err.error;
    if (err.errors && typeof err.errors === "object") {
      for (const v of Object.values(err.errors)) {
        if (Array.isArray(v) && v[0]) return String(v[0]);
        if (typeof v === "string") return v;
      }
    }
    if (typeof err.title === "string" && err.title && err.title !== "One or more validation errors occurred.") {
      return err.title;
    }
  } catch {
    return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
  }
  return statusText;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchWithAuth(path, options);
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(messageFromApiErrorBody(raw, res.statusText));
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
  /** Mẫu Pro / trả phí (badge trên thư viện) */
  isPremium?: boolean;
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

export type WorkspaceGeneralDto = {
  accountName: string;
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  postalCode?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  timezone?: string | null;
  currency?: string | null;
};

export type WorkspaceGeneralUpdate = {
  accountName: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  postalCode: string;
  country: string;
  province: string;
  district: string;
  ward: string;
  timezone: string;
  currency: string;
};

export const settingsApi = {
  getWorkspaceGeneral: (workspaceId: number) =>
    api<WorkspaceGeneralDto>(`/api/workspaces/${workspaceId}/general-settings`),

  updateWorkspaceGeneral: (workspaceId: number, body: WorkspaceGeneralUpdate) =>
    api<WorkspaceGeneralDto>(`/api/workspaces/${workspaceId}/general-settings`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

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

  cancelSubscription: () =>
    api<{ ok: boolean; planName: string }>("/api/plans/cancel", { method: "POST" }),
};

export const editorToolsApi = {
  list: () =>
    api<import("@/types/editor").ToolCategoryData[]>("/api/editor-tools"),
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
    const form = new FormData();
    form.append("file", file);
    if (workspaceId) form.append("workspaceId", String(workspaceId));
    if (folder) form.append("folder", folder);

    const res = await fetchWithAuth("/api/media/upload", { method: "POST", body: form });
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
    const res = await fetchWithAuth(`/api/pages/${id}/publish`, { method: "POST" });
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
    api<import("@/types/editor").PageContent>(`/api/pages/${id}/content`),
  updateContent: (id: number, content: import("@/types/editor").PageContent) => {
    const ri = (n: number | null | undefined, fb: number) => Math.round(Number(n ?? fb));
    const riOpt = (n: number | null | undefined) => (n == null ? null : Math.round(Number(n)));

    const payload = {
      pageId: content.pageId,
      workspaceId: content.workspaceId,
      name: content.name,
      slug: content.slug,
      status: content.status,
      metaTitle: content.metaTitle ?? null,
      metaDescription: content.metaDescription ?? null,
      pageType: content.pageType,
      mobileFriendly: content.mobileFriendly,
      pageSettings: content.pageSettings ?? null,
      sections: content.sections.map((s: import("@/types/editor").EditorSection) => ({
        id: s.id,
        pageId: s.pageId,
        order: s.order,
        name: s.name ?? null,
        backgroundColor: s.backgroundColor ?? null,
        backgroundImageUrl: s.backgroundImageUrl ?? null,
        height: riOpt(s.height ?? undefined),
        isVisible: (s as { visible?: boolean }).visible ?? (s as { isVisible?: boolean }).isVisible ?? true,
        isLocked: s.isLocked,
        customClass: s.customClass ?? null,
        elements: (s.elements ?? []).map((e: import("@/types/editor").EditorElement) => {
          const stylesJson =
            typeof e.styles === "object" && e.styles != null
              ? JSON.stringify(e.styles)
              : "{}";
          return {
            id: e.id,
            sectionId: e.sectionId,
            type: e.type,
            order: e.order,
            x: ri(e.x, 0),
            y: ri(e.y, 0),
            width: riOpt(e.width ?? undefined),
            height: riOpt(e.height ?? undefined),
            zIndex: ri(e.zIndex, 0),
            rotation: Number(e.rotation ?? 0),
            opacity: Number(e.opacity ?? 1),
            isLocked: e.isLocked,
            isHidden: e.isHidden,
            content: e.content ?? null,
            href: e.href ?? null,
            target: e.target ?? null,
            imageUrl: e.imageUrl ?? null,
            videoUrl: e.videoUrl ?? null,
            stylesJson,
          };
        }),
      })),
    };
    return api<{ ok: boolean }>(`/api/pages/${id}/content`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

export type TagDto = {
  id: number;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
};

export const tagsApi = {
  list: (workspaceId: number, search?: string) => {
    const sp = new URLSearchParams({ workspaceId: String(workspaceId) });
    if (search?.trim()) sp.set("search", search.trim());
    return api<TagDto[]>(`/api/tags?${sp.toString()}`);
  },
  create: (workspaceId: number, name: string, color?: string) =>
    api<TagDto & { usageCount?: number }>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ workspaceId, name, color }),
    }),
  update: (id: number, name?: string, color?: string) =>
    api<TagDto & { usageCount?: number }>(`/api/tags/${id}`, { method: "PUT", body: JSON.stringify({ name, color }) }),
  delete: (id: number) => api<{ ok: boolean }>(`/api/tags/${id}`, { method: "DELETE" }),
  bulkDelete: (ids: number[]) =>
    api<{ ok: boolean; deleted: number }>("/api/tags/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  /** Gán tag cho trang (thay toàn bộ danh sách). */
  syncPageTags: (pageId: number, tagIds: number[]) =>
    api<{ ok: boolean; tagIds: number[] }>(`/api/tags/page/${pageId}`, {
      method: "PUT",
      body: JSON.stringify({ tagIds }),
    }),
  getPageTags: (pageId: number) =>
    api<{ id: number; name: string; color: string | null }[]>(`/api/tags/page/${pageId}`),
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
  /** Gửi payload thử tới Webhook URL (cần đăng nhập). */
  testWebhook: (id: number) =>
    api<{ ok: boolean; statusCode?: number; error?: string }>(`/api/forms/${id}/test-webhook`, { method: "POST" }),
};

export type NotificationItem = { id: number; title: string; message: string; type: string; isRead: boolean; createdAt: string };
export const notificationsApi = {
  /** Chuẩn hóa: API có thể trả { items, unread } hoặc (cũ) mảng trực tiếp */
  list: async (): Promise<{ unread: number; items: NotificationItem[] }> => {
    const raw = await api<unknown>("/api/notifications");
    if (Array.isArray(raw)) {
      const items = raw as NotificationItem[];
      return { items, unread: items.filter((n) => !n.isRead).length };
    }
    const obj = raw as { items?: NotificationItem[]; unread?: number };
    const items = Array.isArray(obj.items) ? obj.items : [];
    const unread = typeof obj.unread === "number" ? obj.unread : items.filter((n) => !n.isRead).length;
    return { items, unread };
  },
  markRead: (id: number) => api<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => api<{ ok: boolean }>("/api/notifications/mark-all-read", { method: "PUT" }),
};

export type ProductItem = {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  status: string;
  createdAt: string;
};

function numFromApi(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Chuẩn hoá phản hồi .NET (camelCase hoặc PascalCase) → ProductItem */
export function normalizeProductFromApi(raw: unknown): ProductItem {
  const r = raw as Record<string, unknown>;
  const saleRaw = r.salePrice ?? r.SalePrice;
  return {
    id: numFromApi(r.id ?? r.Id),
    name: String(r.name ?? r.Name ?? ""),
    price: numFromApi(r.price ?? r.Price),
    salePrice: saleRaw != null && saleRaw !== "" ? numFromApi(saleRaw) : null,
    description: (r.description ?? r.Description) != null ? String(r.description ?? r.Description) : null,
    imageUrl: (r.imageUrl ?? r.ImageUrl) != null ? String(r.imageUrl ?? r.ImageUrl) : null,
    category: (r.category ?? r.Category) != null ? String(r.category ?? r.Category) : null,
    stock: numFromApi(r.stock ?? r.Stock),
    status: String(r.status ?? r.Status ?? "active"),
    createdAt: String(r.createdAt ?? r.CreatedAt ?? ""),
  };
}

export const productsApi = {
  list: async (workspaceId: number) => {
    const raw = await api<unknown>(`/api/products?workspaceId=${workspaceId}`);
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => normalizeProductFromApi(row));
  },
  create: async (data: {
    workspaceId: number;
    name: string;
    price: number;
    salePrice?: number | null;
    description?: string;
    imageUrl?: string;
    category?: string;
    stock: number;
  }) => {
    const raw = await api<unknown>("/api/products", { method: "POST", body: JSON.stringify(data) });
    return normalizeProductFromApi(raw);
  },
  update: async (id: number, data: { name?: string; price?: number; salePrice?: number | null; description?: string; imageUrl?: string; category?: string; stock?: number; status?: string }) => {
    const raw = await api<unknown>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
    return normalizeProductFromApi(raw);
  },
  delete: (id: number) => api<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
};

export type OrderItem = {
  id: number;
  customerName: string;
  email: string | null;
  phone: string | null;
  productId: number | null;
  productName?: string | null;
  amount: number;
  status: string;
  createdAt: string;
};
export type OrdersListResponse = { items: OrderItem[]; totalCount: number };

export type OrdersListOpts = {
  status?: string;
  /** Đơn chưa hoàn tất: pending + shipping (ưu tiên hơn status nếu true) */
  incomplete?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "created_desc" | "created_asc" | "amount_desc" | "amount_asc";
};

function buildOrdersQuery(workspaceId: number, opts?: string | OrdersListOpts): string {
  const p = new URLSearchParams();
  p.set("workspaceId", String(workspaceId));
  if (opts === undefined) {
    p.set("page", "1");
    p.set("pageSize", "20");
    p.set("sort", "created_desc");
    return p.toString();
  }
  if (typeof opts === "string") {
    if (opts) p.set("status", opts);
    p.set("page", "1");
    p.set("pageSize", "20");
    p.set("sort", "created_desc");
    return p.toString();
  }
  if (opts.incomplete) p.set("incomplete", "true");
  else if (opts.status) p.set("status", opts.status);
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  p.set("page", String(opts.page ?? 1));
  p.set("pageSize", String(opts.pageSize ?? 20));
  p.set("sort", opts.sort ?? "created_desc");
  return p.toString();
}

export const ordersApi = {
  list: (workspaceId: number, opts?: string | OrdersListOpts) =>
    api<OrdersListResponse>(`/api/orders?${buildOrdersQuery(workspaceId, opts)}`),
  create: (data: { workspaceId: number; customerName: string; email?: string; phone?: string; productId?: number; amount: number }) =>
    api<OrderItem>("/api/orders", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { customerName?: string; email?: string; phone?: string; status?: string }) =>
    api<OrderItem>(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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
export type BillingOptions = {
  onePayEnabled: boolean;
  testUpgradeEnabled: boolean;
};
export const plansApi = {
  list: () => api<PlanItem[]>("/api/plans"),
  billingOptions: () => api<BillingOptions>("/api/plans/billing-options"),
  /** redirectBaseUrl: gửi window.location.origin để ghép vpc_ReturnURL khi API không có CallbackBaseUrl công khai. */
  createOnePayCheckout: (planId: number, redirectBaseUrl?: string) =>
    api<{ payUrl: string; orderId: string }>("/api/plans/onepay/create", {
      method: "POST",
      body: JSON.stringify({ planId, redirectBaseUrl: redirectBaseUrl ?? null }),
    }),
  /** Xác nhận sau khi OnePay redirect về frontend (chuỗi query đầy đủ sau dấu ?). */
  confirmOnePay: (rawQuery: string) =>
    api<{ ok: boolean; already?: boolean }>("/api/plans/onepay/confirm", {
      method: "POST",
      body: JSON.stringify({ rawQuery }),
    }),
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
