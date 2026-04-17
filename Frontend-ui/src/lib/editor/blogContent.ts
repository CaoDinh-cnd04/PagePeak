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
  /** layout: flat | header | banner */
  layout?: string;
  /** CTA button */
  btnText?: string;
  btnUrl?: string;
  showBtn?: boolean;
  /** Icon/emoji hiển thị phía trên tiêu đề */
  imageEmoji?: string;
  /** Hiệu ứng xuất hiện: fade | slide-up | zoom | none */
  animation?: string;
  /** Đóng khi click ra ngoài overlay */
  closeOnOverlay?: boolean;
  /** Kích hoạt: click | delay | exit | scroll */
  trigger?: string;
  triggerDelay?: number;
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
        templateId: typeof p.templateId === "string" ? p.templateId : undefined,
        category: typeof p.category === "string" ? p.category : undefined,
        layout: typeof p.layout === "string" ? p.layout : "flat",
        btnText: typeof p.btnText === "string" ? p.btnText : undefined,
        btnUrl: typeof p.btnUrl === "string" ? p.btnUrl : undefined,
        showBtn: typeof p.showBtn === "boolean" ? p.showBtn : false,
        imageEmoji: typeof p.imageEmoji === "string" ? p.imageEmoji : undefined,
        animation: typeof p.animation === "string" ? p.animation : "fade",
        closeOnOverlay: typeof p.closeOnOverlay === "boolean" ? p.closeOnOverlay : true,
        trigger: typeof p.trigger === "string" ? p.trigger : "click",
        triggerDelay: typeof p.triggerDelay === "number" ? p.triggerDelay : 0,
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
