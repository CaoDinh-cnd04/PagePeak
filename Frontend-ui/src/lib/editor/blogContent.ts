/** JSON shapes cho khối Blog / Popup (editor + preview). */

export type BlogPostItem = {
  title?: string;
  excerpt?: string;
  date?: string;
  image?: string;
};

export type BlogListData = {
  columns?: number;
  posts?: BlogPostItem[];
};

export type BlogDetailData = {
  title?: string;
  author?: string;
  date?: string;
  body?: string;
};

export type PopupData = {
  title?: string;
  body?: string;
  /** id mẫu trong popupTemplateCatalog (nếu có) */
  templateId?: string;
  category?: string;
};

export function parseBlogListContent(content: string | undefined): BlogListData {
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") {
      const posts = Array.isArray(p.posts)
        ? (p.posts as unknown[]).filter((x) => x && typeof x === "object").map((x) => x as BlogPostItem)
        : [];
      const columns = typeof p.columns === "number" && p.columns > 0 ? Math.min(6, Math.floor(p.columns)) : undefined;
      return { posts, columns };
    }
  } catch {
    /* ignore */
  }
  return { posts: [] };
}

export function parseBlogDetailContent(content: string | undefined): BlogDetailData {
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") {
      return {
        title: typeof p.title === "string" ? p.title : undefined,
        author: typeof p.author === "string" ? p.author : undefined,
        date: typeof p.date === "string" ? p.date : undefined,
        body: typeof p.body === "string" ? p.body : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function parsePopupContent(content: string | undefined): PopupData {
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") {
      return {
        title: typeof p.title === "string" ? p.title : undefined,
        body: typeof p.body === "string" ? p.body : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return {};
}

export type SocialShareData = {
  networks?: string[];
};

export function parseSocialShareContent(content: string | undefined): SocialShareData {
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object" && Array.isArray(p.networks)) {
      return { networks: p.networks.map(String).filter(Boolean) };
    }
  } catch {
    /* ignore */
  }
  return {};
}
