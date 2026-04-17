import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  EditorSection,
  EditorElement,
  EditorElementType,
  PageContent,
  PageSettings,
  PagePopupDef,
} from "@/types/editor";
import { normalizeElementType, normalizeSectionsElementTypes } from "@/lib/editor/normalizeElementType";
import {
  SIDEBAR_SAMPLE_COLLECTION_LIST,
  SIDEBAR_SAMPLE_PRODUCT_DETAIL,
} from "@/lib/editor/elementSidebarSamples";
import { getDefaultContentForVariant } from "@/lib/editor/frameContent";

type SelectedTarget =
  | { type: "page" }
  | { type: "section"; id: number }
  | { type: "element"; id: number };

type DeviceType = "web" | "mobile";

type EditorState = {
  pageId: number | null;
  workspaceId: number | null;
  name: string;
  slug: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  pageType: string;
  mobileFriendly: boolean;
  pageSettings: PageSettings;
  sections: EditorSection[];
  popups: PagePopupDef[];
  selected: SelectedTarget;
  /** Chọn nhiều phần tử (Shift+click) — rỗng = chỉ dùng selected */
  multiSelectedElementIds: number[];
  deviceType: DeviceType;
  dirty: boolean;
  history: EditorSection[][];
  historyIndex: number;

  zoom: number;
  canvasWidth: number;
  desktopCanvasWidth: number;
  canvasHeight: number;
  clipboard: EditorElement | null;
  snapToGrid: boolean;
  gridSize: number;
  showGuides: boolean;
};

type EditorActions = {
  loadFromContent: (content: PageContent) => void;
  /** Swap canvas sections (dùng khi vào/ra chế độ edit popup) */
  swapEditorContext: (
    newSections: EditorSection[],
    savedHistory?: EditorSection[][],
    savedHistoryIndex?: number,
  ) => void;
  /** Popup độc lập */
  addPopup: (def: PagePopupDef) => void;
  updatePopup: (id: string, partial: Partial<Omit<PagePopupDef, "id">>) => void;
  removePopup: (id: string) => void;
  setDeviceType: (device: DeviceType) => void;
  selectPage: () => void;
  selectSection: (id: number) => void;
  selectElement: (id: number) => void;
  /** Chọn nhiều phần tử cùng lúc (primary = phần tử cuối trong danh sách) */
  selectMultipleElements: (elementIds: number[]) => void;
  setMultiSelectedElementIds: (ids: number[]) => void;
  /** Gom các phần tử đang chọn (cùng section) thành một nhóm */
  groupElements: (sectionId: number, elementIds: number[]) => void;
  /** Tách nhóm thành các phần tử riêng */
  ungroupElement: (groupElementId: number) => void;
  addSection: () => void;
  removeSection: (id: number) => void;
  updateSection: (id: number, partial: Partial<EditorSection>) => void;
  moveSectionUp: (id: number) => void;
  moveSectionDown: (id: number) => void;
  moveSectionToIndex: (id: number, newIndex: number) => void;
  reorderElementInSection: (sectionId: number, elementId: number, newIndex: number) => void;
  duplicateSection: (id: number) => void;
  addElement: (sectionId: number, partial: Partial<EditorElement>) => void;
  updateElement: (id: number, partial: Partial<EditorElement>) => void;
  /** Chuyển phần tử sang section khác (kéo xuyên section trên canvas) */
  moveElementToSection: (elementId: number, targetSectionId: number, x: number, y: number) => void;
  removeElement: (id: number) => void;
  duplicateElement: (id: number) => void;
  markSaved: () => void;
  updatePageMeta: (meta: { metaTitle?: string; metaDescription?: string; name?: string }) => void;
  updatePageSettings: (settings: Partial<PageSettings>) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  getSelectedElement: () => EditorElement | null;
  getSelectedSection: () => EditorSection | null;
  toContentPayload: () => PageContent | null;

  setZoom: (level: number) => void;
  setCanvasWidth: (w: number) => void;
  setDesktopCanvasWidth: (w: number) => void;
  setCanvasHeight: (h: number) => void;
  copyElement: () => void;
  pasteElement: () => void;
  cutElement: () => void;
  setSnapToGrid: (val: boolean) => void;
  setGridSize: (size: number) => void;
  setShowGuides: (val: boolean) => void;
  moveElementLayer: (id: number, direction: "front" | "back" | "forward" | "backward") => void;
};

const ELEMENT_DEFAULTS: Record<EditorElementType, Partial<EditorElement>> = {
  text: {
    width: 320,
    height: 44,
    content: "Văn bản của bạn",
    styles: {
      fontSize: 16,
      fontWeight: 400,
      fontFamily: "Inter",
      color: "#1e293b",
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: "left",
    },
  },
  headline: {
    width: 540,
    height: 60,
    content: "Tiêu đề chính của bạn",
    styles: {
      fontSize: 36,
      fontWeight: 700,
      fontFamily: "Inter",
      color: "#0f172a",
      lineHeight: 1.2,
      letterSpacing: -0.5,
      textAlign: "left",
    },
  },
  paragraph: {
    width: 460,
    height: 96,
    content: "Đây là đoạn văn bản mô tả. Hãy nhấp để chỉnh sửa nội dung này theo ý muốn của bạn.",
    styles: {
      fontSize: 15,
      fontWeight: 400,
      fontFamily: "Inter",
      color: "#475569",
      lineHeight: 1.75,
      letterSpacing: 0,
      textAlign: "left",
    },
  },
  button: {
    width: 200,
    height: 52,
    content: "Nhấn vào đây",
    styles: {
      backgroundColor: "#4f46e5",
      color: "#ffffff",
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      fontFamily: "Inter",
      borderWidth: 0,
      borderColor: "#4f46e5",
      letterSpacing: 0.3,
      paddingTop: 0,
      paddingRight: 28,
      paddingBottom: 0,
      paddingLeft: 28,
      hoverBackgroundColor: "#4338ca",
      boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
    },
  },
  image: {
    width: 340,
    height: 220,
    content: "",
    imageUrl: "",
    styles: {
      objectFit: "cover",
      objectPosition: "center",
      borderRadius: 0,
    },
  },
  video: { width: 480, height: 270, content: "", videoUrl: "" },
  shape: {
    width: 200,
    height: 160,
    content: "[]",
    styles: {
      backgroundColor: "#e0e7ff",
      borderRadius: 12,
      borderWidth: 0,
      borderColor: "#6366f1",
      borderStyle: "solid",
      boxShadow: "0 4px 20px rgba(99,102,241,0.15)",
    },
  },
  icon: { width: 48, height: 48, content: "star" },
  divider: {
    width: 400,
    height: 2,
    styles: { backgroundColor: "#d1d5db" },
  },
  countdown: { width: 300, height: 60, content: "" },
  form: { width: 400, height: 300, content: "" },
  html: { width: 400, height: 200, content: "<div></div>" },
  "html-code": {
    width: 400,
    height: 250,
    content: JSON.stringify({
      subType: "html-js",
      code: "<div style=\"padding:16px;background:#f8fafc;border-radius:8px;font-family:monospace;font-size:12px\">Nhấn <b>Sửa HTML</b> để thêm mã tùy chỉnh</div>",
      iframeSrc: "",
    }),
    styles: {},
  },
  list: {
    width: 300,
    height: 120,
    content: "Item 1\nItem 2\nItem 3",
  },
  gallery: {
    width: 560,
    height: 400,
    content: JSON.stringify([
      "https://picsum.photos/seed/gal1/800/600",
      "https://picsum.photos/seed/gal2/800/600",
      "https://picsum.photos/seed/gal3/800/600",
      "https://picsum.photos/seed/gal4/800/600",
    ]),
    styles: {
      showThumbnails: 1,
      thumbnailPosition: "bottom",
      thumbWidth: 80,
      thumbHeight: 60,
      thumbGap: 6,
      galleryGap: 8,
      showArrows: 1,
      showDots: 0,
      transition: "fade",
      autoPlay: 1,
      autoPlaySpeed: 5,
      borderRadius: 8,
      thumbnailBorderRadius: 4,
      mainObjectFit: "cover",
    },
  },
  "product-detail": {
    width: 660,
    height: 340,
    content: SIDEBAR_SAMPLE_PRODUCT_DETAIL,
    styles: {
      backgroundColor: "#ffffff",
      borderRadius: 4,
      boxShadow: "0 1px 8px rgba(0,0,0,0.1)",
    },
  },
  "collection-list": {
    width: 600,
    height: 360,
    content: SIDEBAR_SAMPLE_COLLECTION_LIST,
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  frame: {
    width: 680,
    height: 260,
    content: JSON.stringify(getDefaultContentForVariant("quote")),
    styles: { border: "none", borderRadius: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" },
  },
  group: {
    width: 320,
    height: 200,
    content: JSON.stringify({ v: 1, items: [] }),
    styles: { border: "1px dashed #6366f1", borderRadius: 8, backgroundColor: "transparent" },
  },
  accordion: { width: 500, height: 200, content: "Câu hỏi 1|Trả lời 1\nCâu hỏi 2|Trả lời 2", styles: { fontSize: 14 } },
  table: { width: 600, height: 200, content: "Col1,Col2,Col3\nR1C1,R1C2,R1C3\nR2C1,R2C2,R2C3", styles: { fontSize: 13 } },
  cart: {
    width: 400,
    height: 320,
    content: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Giỏ hàng trống",
      checkoutButtonText: "Thanh toán",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Sản phẩm A", price: "299.000đ", qty: 1, image: "" },
        { title: "Sản phẩm B", price: "150.000đ", qty: 2, image: "" },
      ],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  "blog-list": {
    width: 700,
    height: 400,
    content: JSON.stringify({
      columns: 2,
      posts: [
        { title: "Bài viết mẫu 1", excerpt: "Đoạn giới thiệu ngắn cho bài viết.", date: "01/01/2025", image: "" },
        { title: "Bài viết mẫu 2", excerpt: "Nội dung blog — chỉnh trong panel bên phải.", date: "15/01/2025", image: "" },
      ],
    }),
    styles: { fontSize: 14 },
  },
  "blog-detail": {
    width: 600,
    height: 500,
    content: JSON.stringify({
      title: "Tiêu đề bài viết",
      author: "Tác giả",
      date: "01/01/2025",
      body: "Nội dung chi tiết bài viết. Bạn có thể thay bằng HTML hoặc văn bản thuần tùy cấu hình.",
    }),
    styles: { fontSize: 15 },
  },
  popup: {
    width: 480,
    height: 280,
    content: JSON.stringify({
      title: "Tiêu đề popup",
      body: "Nội dung popup — chỉnh tiêu đề, nội dung và màu sắc ở panel bên phải.",
      layout: "flat",
      showBtn: true,
      btnText: "Tìm hiểu thêm",
      btnUrl: "#",
      animation: "fade",
      closeOnOverlay: true,
      trigger: "click",
      triggerDelay: 0,
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 14, bodyTextColor: "#334155", headerTextColor: "#0f172a", btnColor: "#1e2d7d", btnTextColor: "#ffffff", btnRadius: 8 },
  },
  map: { width: 500, height: 300, content: "10.762622,106.660172" },
  "social-share": { width: 280, height: 48, content: JSON.stringify({ networks: ["facebook", "twitter", "linkedin", "link"] }) },
  rating: { width: 200, height: 40, content: "5", styles: { color: "#f59e0b" } },
  progress: { width: 400, height: 24, content: "75", styles: { backgroundColor: "#e2e8f0" } },
  carousel: {
    width: 560,
    height: 300,
    content: JSON.stringify({
      layoutType: "testimonial",
      carouselStyle: {
        autoplayMs: 5000,
        transitionType: "slide",
        showArrows: true,
        showDots: true,
        dotStyle: "pill",
        dotActiveColor: "#6366f1",
        dotColor: "#d1d5db",
        quoteFontSize: 13,
        quoteColor: "#374151",
        quoteAlign: "center",
        nameFontSize: 13,
        nameColor: "#111827",
        nameAlign: "center",
        roleFontSize: 11,
        roleColor: "#6b7280",
        roleAlign: "center",
        showRating: true,
        ratingColor: "#f59e0b",
      },
      items: [
        {
          avatar: "https://picsum.photos/seed/av1/120/120",
          quote: "Sản phẩm chất lượng tuyệt vời, giao hàng nhanh và đóng gói cẩn thận!",
          name: "Nguyễn Thị Lan",
          role: "Khách hàng thân thiết",
          rating: 5,
        },
        {
          avatar: "https://picsum.photos/seed/av2/120/120",
          quote: "Dịch vụ hỗ trợ rất nhiệt tình, phản hồi nhanh và giải quyết vấn đề triệt để.",
          name: "Trần Văn Minh",
          role: "CEO — StartUp ABC",
          rating: 5,
        },
        {
          avatar: "https://picsum.photos/seed/av3/120/120",
          quote: "Tôi đặc biệt ấn tượng với UX/UI, rất dễ sử dụng ngay cả với người mới.",
          name: "Phạm Hoàng Yến",
          role: "Designer tự do",
          rating: 4,
        },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 16 },
  },
  tabs: {
    width: 520,
    height: 280,
    content: JSON.stringify({
      items: [
        {
          label: "Giới thiệu",
          title: "Tiêu đề tab 1",
          desc: "Nội dung mô tả cho tab đầu tiên. Chỉnh sửa nhãn, tiêu đề và mô tả trong panel bên phải (mục Tabs).",
        },
        { label: "Chi tiết", title: "Tab 2", desc: "Nội dung tab thứ hai." },
        { label: "Liên hệ", title: "Tab 3", desc: "Thông tin thêm." },
      ],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 8 },
  },
  menu: {
    width: 520,
    height: 48,
    content: JSON.stringify({
      items: [
        { label: "Trang chủ", href: "#", target: "_self" },
        { label: "Giới thiệu", href: "#", target: "_self" },
        { label: "Dịch vụ", href: "#", target: "_self" },
        { label: "Liên hệ", href: "#", target: "_self" },
      ],
      activeIndex: 0,
      variant: 1,
      align: "left",
      activeColor: "#f97316",
      activeBgColor: "#fff7ed",
      textColor: "#1e293b",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "Inter",
      textTransform: "none",
      gap: 8,
      backgroundColor: "#ffffff",
      borderRadius: 8,
    }),
    styles: {},
  },
};

const MAX_HISTORY = 50;

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    pageId: null,
    workspaceId: null,
    name: "",
    slug: "",
    status: "draft",
    metaTitle: "",
    metaDescription: "",
    pageType: "trangdich",
    mobileFriendly: true,
    pageSettings: {},
    sections: [],
    popups: [],
    selected: { type: "page" },
    multiSelectedElementIds: [],
    deviceType: "web",
    dirty: false,
    history: [],
    historyIndex: -1,

    zoom: 1,
    canvasWidth: 960,
    desktopCanvasWidth: 960,
    canvasHeight: 800,
    clipboard: null,
    snapToGrid: false,
    gridSize: 10,
    showGuides: true,

    loadFromContent: (content) =>
      set(() => {
        const sections = normalizeSectionsElementTypes(content.sections);
        const rawPopups =
          content.popups ??
          (content as { Popups?: import("@/types/editor").PagePopupDef[] }).Popups;
        return {
          pageId: content.pageId,
          workspaceId: content.workspaceId,
          name: content.name,
          slug: content.slug,
          status: content.status,
          metaTitle: content.metaTitle ?? "",
          metaDescription: content.metaDescription ?? "",
          pageType: content.pageType ?? "trangdich",
          mobileFriendly: content.mobileFriendly ?? true,
          pageSettings: content.pageSettings ?? {},
          sections,
          popups: Array.isArray(rawPopups) ? rawPopups : [],
          selected: { type: "page" },
          multiSelectedElementIds: [],
          dirty: false,
          history: [JSON.parse(JSON.stringify(sections))],
          historyIndex: 0,
        };
      }),

    swapEditorContext: (newSections, savedHistory, savedHistoryIndex) =>
      set((state) => {
        const cloned = JSON.parse(JSON.stringify(newSections)) as EditorSection[];
        state.sections = cloned;
        state.selected = { type: "page" };
        state.multiSelectedElementIds = [];
        if (savedHistory !== undefined && savedHistoryIndex !== undefined) {
          state.history = JSON.parse(JSON.stringify(savedHistory));
          state.historyIndex = savedHistoryIndex;
        } else {
          state.history = [JSON.parse(JSON.stringify(cloned))];
          state.historyIndex = 0;
        }
      }),

    addPopup: (def) =>
      set((state) => {
        state.popups.push(def);
        state.dirty = true;
      }),

    updatePopup: (id, partial) =>
      set((state) => {
        const popup = state.popups.find((p) => p.id === id);
        if (popup) {
          Object.assign(popup, partial);
          state.dirty = true;
        }
      }),

    removePopup: (id) =>
      set((state) => {
        state.popups = state.popups.filter((p) => p.id !== id);
        state.dirty = true;
      }),

    setDeviceType: (device) =>
      set((state) => {
        state.deviceType = device;
        state.canvasWidth = device === "mobile" ? 420 : state.desktopCanvasWidth;
      }),

    selectPage: () =>
      set((state) => {
        state.selected = { type: "page" };
        state.multiSelectedElementIds = [];
      }),

    selectSection: (id) =>
      set((state) => {
        state.selected = { type: "section", id };
        state.multiSelectedElementIds = [];
      }),

    selectElement: (id: number) =>
      set((state) => {
        state.selected = { type: "element", id };
        state.multiSelectedElementIds = [];
      }),

    selectMultipleElements: (elementIds) =>
      set((state) => {
        const ids = elementIds.filter((id) => Number.isFinite(id));
        if (ids.length === 0) return;
        const primary = ids[ids.length - 1]!;
        state.selected = { type: "element", id: primary };
        state.multiSelectedElementIds = ids;
      }),

    setMultiSelectedElementIds: (ids) =>
      set((state) => {
        state.multiSelectedElementIds = [...ids];
      }),

    groupElements: (sectionId, elementIds) =>
      set((state) => {
        const uniq = [...new Set(elementIds)].filter((id) => Number.isFinite(id));
        if (uniq.length < 2) return;
        const section = state.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const picked = uniq
          .map((id) => section.elements.find((e) => e.id === id))
          .filter((e): e is EditorElement => !!e && !e.isLocked && e.type !== "group");
        if (picked.length < 2) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxR = -Infinity;
        let maxB = -Infinity;
        for (const e of picked) {
          const w = e.width ?? 100;
          const h = e.height ?? 40;
          minX = Math.min(minX, e.x);
          minY = Math.min(minY, e.y);
          maxR = Math.max(maxR, e.x + w);
          maxB = Math.max(maxB, e.y + h);
        }
        const gw = Math.max(20, maxR - minX);
        const gh = Math.max(10, maxB - minY);

        const items: EditorElement[] = picked.map((e) => {
          const clone = JSON.parse(JSON.stringify(e)) as EditorElement;
          clone.x = e.x - minX;
          clone.y = e.y - minY;
          clone.sectionId = sectionId;
          return clone;
        });

        const groupId = Date.now();
        const maxOrder = Math.max(0, ...section.elements.map((e) => e.order ?? 0));
        const maxZ = Math.max(0, ...section.elements.map((e) => e.zIndex ?? 0));

        const groupEl: EditorElement = {
          id: groupId,
          sectionId,
          type: "group",
          order: maxOrder + 1,
          x: minX,
          y: minY,
          width: gw,
          height: gh,
          zIndex: maxZ + 1,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          isHidden: false,
          content: JSON.stringify({ v: 1 as const, items }),
          styles: { border: "none", borderRadius: 0, backgroundColor: "transparent", padding: 0 },
        };

        section.elements = section.elements.filter((e) => !uniq.includes(e.id));
        section.elements.push(groupEl);
        state.selected = { type: "element", id: groupId };
        state.multiSelectedElementIds = [];
        state.dirty = true;
      }),

    ungroupElement: (groupElementId) =>
      set((state) => {
        for (const section of state.sections) {
          const gi = section.elements.findIndex((e) => e.id === groupElementId && e.type === "group");
          if (gi < 0) continue;
          const gel = section.elements[gi];
          let data: { v?: number; items?: EditorElement[] } = {};
          try {
            data = JSON.parse(gel.content || "{}");
          } catch {
            return;
          }
          const items = data.items ?? [];
          if (items.length === 0) {
            section.elements.splice(gi, 1);
            state.selected = { type: "section", id: section.id };
            state.dirty = true;
            return;
          }
          const gx = gel.x;
          const gy = gel.y;
          section.elements.splice(gi, 1);
          let t = Date.now();
          for (const child of items) {
            const restored: EditorElement = {
              ...JSON.parse(JSON.stringify(child)),
              id: t++,
              sectionId: section.id,
              x: gx + child.x,
              y: gy + child.y,
            };
            section.elements.push(restored);
          }
          const lastId = t - 1;
          state.selected = { type: "element", id: lastId };
          state.multiSelectedElementIds = [];
          state.dirty = true;
          return;
        }
      }),

    pushHistory: () =>
      set((state) => {
        const snapshot = JSON.parse(JSON.stringify(state.sections));
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) return;
        state.historyIndex -= 1;
        state.sections = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.dirty = true;
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex += 1;
        state.sections = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.dirty = true;
      }),

    addSection: () =>
      set((state) => {
        const nextOrder = (state.sections[state.sections.length - 1]?.order ?? 0) + 1;
        const tempId = Date.now();
        state.sections.push({
          id: tempId,
          pageId: state.pageId ?? 0,
          order: nextOrder,
          name: `Section ${nextOrder}`,
          backgroundColor: "#ffffff",
          backgroundImageUrl: null,
          height: 600,
          visible: true,
          isLocked: false,
          customClass: null,
          elements: [],
        });
        state.selected = { type: "section", id: tempId };
        state.dirty = true;
      }),

    removeSection: (id) =>
      set((state) => {
        state.sections = state.sections.filter((s) => s.id !== id);
        if (state.selected.type === "section" && state.selected.id === id) {
          state.selected = { type: "page" };
        }
        state.dirty = true;
      }),

    updateSection: (id, partial) =>
      set((state) => {
        const section = state.sections.find((s) => s.id === id);
        if (section) {
          Object.assign(section, partial);
          state.dirty = true;
        }
      }),

    moveSectionUp: (id) =>
      set((state) => {
        const idx = state.sections.findIndex((s) => s.id === id);
        if (idx > 0) {
          [state.sections[idx - 1], state.sections[idx]] = [state.sections[idx], state.sections[idx - 1]];
          state.sections.forEach((s, i) => (s.order = i + 1));
          state.dirty = true;
        }
      }),

    moveSectionDown: (id) =>
      set((state) => {
        const idx = state.sections.findIndex((s) => s.id === id);
        if (idx >= 0 && idx < state.sections.length - 1) {
          [state.sections[idx], state.sections[idx + 1]] = [state.sections[idx + 1], state.sections[idx]];
          state.sections.forEach((s, i) => (s.order = i + 1));
          state.dirty = true;
        }
      }),

    moveSectionToIndex: (id, newIndex) =>
      set((state) => {
        const idx = state.sections.findIndex((s) => s.id === id);
        if (idx < 0 || newIndex < 0 || newIndex >= state.sections.length) return;
        const [removed] = state.sections.splice(idx, 1);
        state.sections.splice(newIndex, 0, removed);
        state.sections.forEach((s, i) => (s.order = i + 1));
        state.dirty = true;
      }),

    reorderElementInSection: (sectionId, elementId, newIndex) =>
      set((state) => {
        const section = state.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const idx = section.elements.findIndex((e) => e.id === elementId);
        if (idx < 0 || newIndex < 0 || newIndex >= section.elements.length) return;
        const [removed] = section.elements.splice(idx, 1);
        section.elements.splice(newIndex, 0, removed);
        section.elements.forEach((e, i) => (e.order = i + 1));
        state.dirty = true;
      }),

    duplicateSection: (id) =>
      set((state) => {
        const src = state.sections.find((s) => s.id === id);
        if (!src) return;
        const tempId = Date.now();
        const newSection: EditorSection = {
          ...JSON.parse(JSON.stringify(src)),
          id: tempId,
          order: src.order + 1,
          name: `${src.name ?? "Section"} (Copy)`,
          elements: src.elements.map((el, i) => ({
            ...JSON.parse(JSON.stringify(el)),
            id: tempId + i + 1,
            sectionId: tempId,
          })),
        };
        const idx = state.sections.findIndex((s) => s.id === id);
        state.sections.splice(idx + 1, 0, newSection);
        state.sections.forEach((s, i) => (s.order = i + 1));
        state.selected = { type: "section", id: tempId };
        state.dirty = true;
      }),

    addElement: (sectionId, partial) =>
      set((state) => {
        const section = state.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const nextOrder = (section.elements[section.elements.length - 1]?.order ?? 0) + 1;
        const tempId = Date.now();
        const elType = normalizeElementType(partial.type);
        const defaults = ELEMENT_DEFAULTS[elType] ?? {};
        const element: EditorElement = {
          id: tempId,
          sectionId,
          type: elType,
          order: nextOrder,
          x: partial.x ?? 50,
          y: partial.y ?? 50,
          width: partial.width ?? defaults.width ?? 200,
          height: partial.height ?? defaults.height ?? 40,
          zIndex: partial.zIndex ?? nextOrder,
          rotation: partial.rotation ?? 0,
          opacity: partial.opacity ?? 1,
          isLocked: false,
          isHidden: false,
          content: partial.content ?? defaults.content ?? "",
          href: partial.href ?? null,
          target: partial.target ?? null,
          imageUrl: partial.imageUrl ?? defaults.imageUrl ?? null,
          videoUrl: partial.videoUrl ?? defaults.videoUrl ?? null,
          styles: { ...defaults.styles, ...partial.styles },
        };
        section.elements.push(element);
        state.selected = { type: "element", id: tempId };
        state.dirty = true;
      }),

    updateElement: (id, partial) =>
      set((state) => {
        for (const section of state.sections) {
          const el = section.elements.find((e) => e.id === id);
          if (el) {
            if (partial.styles) {
              el.styles = { ...el.styles, ...partial.styles };
              delete partial.styles;
            }
            Object.assign(el, partial);
            state.dirty = true;
            break;
          }
        }
      }),

    moveElementToSection: (elementId, targetSectionId, x, y) =>
      set((state) => {
        let fromSectionIdx = -1;
        let fromElIdx = -1;
        for (let si = 0; si < state.sections.length; si++) {
          const ei = state.sections[si].elements.findIndex((e) => e.id === elementId);
          if (ei >= 0) {
            fromSectionIdx = si;
            fromElIdx = ei;
            break;
          }
        }
        if (fromSectionIdx < 0 || fromElIdx < 0) return;
        const fromSection = state.sections[fromSectionIdx];
        const el = fromSection.elements[fromElIdx];
        if (el.isLocked) return;
        const target = state.sections.find((s) => s.id === targetSectionId);
        if (!target) return;
        if (fromSection.id === targetSectionId) {
          el.x = x;
          el.y = y;
          state.dirty = true;
          return;
        }
        const [removed] = fromSection.elements.splice(fromElIdx, 1);
        removed.sectionId = targetSectionId;
        removed.x = x;
        removed.y = y;
        const maxOrder = target.elements.reduce((m, e) => Math.max(m, e.order ?? 0), 0);
        removed.order = maxOrder + 1;
        target.elements.push(removed);
        state.dirty = true;
      }),

    removeElement: (id) =>
      set((state) => {
        for (const section of state.sections) {
          const idx = section.elements.findIndex((e) => e.id === id);
          if (idx >= 0) {
            section.elements.splice(idx, 1);
            break;
          }
        }
        if (state.selected.type === "element" && state.selected.id === id) {
          state.selected = { type: "page" };
        }
        state.dirty = true;
      }),

    duplicateElement: (id) =>
      set((state) => {
        for (const section of state.sections) {
          const el = section.elements.find((e) => e.id === id);
          if (el) {
            const tempId = Date.now();
            const clone: EditorElement = {
              ...JSON.parse(JSON.stringify(el)),
              id: tempId,
              x: el.x + 20,
              y: el.y + 20,
              order: (section.elements[section.elements.length - 1]?.order ?? 0) + 1,
            };
            section.elements.push(clone);
            state.selected = { type: "element", id: tempId };
            state.dirty = true;
            break;
          }
        }
      }),

    markSaved: () =>
      set((state) => {
        state.dirty = false;
      }),

    updatePageMeta: (meta) =>
      set((state) => {
        if (meta.metaTitle !== undefined) state.metaTitle = meta.metaTitle;
        if (meta.metaDescription !== undefined) state.metaDescription = meta.metaDescription;
        if (meta.name !== undefined) state.name = meta.name;
        state.dirty = true;
      }),

    updatePageSettings: (settings) =>
      set((state) => {
        state.pageSettings = { ...state.pageSettings, ...settings };
        state.dirty = true;
      }),

    getSelectedElement: () => {
      const state = get();
      if (state.selected.type !== "element") return null;
      const selId = state.selected.id;
      for (const section of state.sections) {
        const el = section.elements.find((e) => e.id === selId);
        if (el) return el as EditorElement;
      }
      return null;
    },

    getSelectedSection: () => {
      const state = get();
      if (state.selected.type !== "section") return null;
      const selId = state.selected.id;
      return (state.sections.find((s) => s.id === selId) as EditorSection) ?? null;
    },

    toContentPayload: () => {
      const state = get();
      if (state.pageId == null || state.workspaceId == null) return null;
      return {
        pageId: state.pageId,
        workspaceId: state.workspaceId,
        name: state.name,
        slug: state.slug,
        status: state.status,
        metaTitle: state.metaTitle || null,
        metaDescription: state.metaDescription || null,
        pageType: state.pageType,
        mobileFriendly: state.mobileFriendly,
        pageSettings: state.pageSettings,
        sections: state.sections,
        popups: state.popups,
      };
    },

    setZoom: (level) =>
      set((state) => {
        state.zoom = Math.max(0.25, Math.min(3, level));
      }),

    setCanvasWidth: (w) =>
      set((state) => {
        state.canvasWidth = w;
        if ([960, 1200, 1440].includes(w)) state.desktopCanvasWidth = w;
      }),

    setDesktopCanvasWidth: (w) =>
      set((state) => {
        state.desktopCanvasWidth = w;
        if (state.deviceType === "web") state.canvasWidth = w;
      }),

    setCanvasHeight: (h) =>
      set((state) => {
        state.canvasHeight = h;
      }),

    copyElement: () =>
      set((state) => {
        if (state.selected.type !== "element") return;
        const selId = state.selected.id;
        for (const section of state.sections) {
          const el = section.elements.find((e) => e.id === selId);
          if (el) {
            state.clipboard = JSON.parse(JSON.stringify(el));
            break;
          }
        }
      }),

    pasteElement: () =>
      set((state) => {
        if (!state.clipboard) return;
        const sel = state.selected;
        const sectionId =
          sel.type === "section"
            ? sel.id
            : sel.type === "element"
            ? (() => {
                const eid = sel.id;
                for (const s of state.sections) {
                  if (s.elements.some((e) => e.id === eid)) return s.id;
                }
                return state.sections[0]?.id;
              })()
            : state.sections[0]?.id;
        if (!sectionId) return;
        const section = state.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const tempId = Date.now();
        const clone: EditorElement = {
          ...JSON.parse(JSON.stringify(state.clipboard)),
          id: tempId,
          sectionId,
          x: state.clipboard.x + 20,
          y: state.clipboard.y + 20,
          order: (section.elements[section.elements.length - 1]?.order ?? 0) + 1,
        };
        section.elements.push(clone);
        state.selected = { type: "element", id: tempId };
        state.dirty = true;
      }),

    cutElement: () => {
      const state = get();
      if (state.selected.type !== "element") return;
      const elId = state.selected.id;
      state.copyElement();
      state.removeElement(elId);
      state.pushHistory();
    },

    setSnapToGrid: (val) =>
      set((state) => {
        state.snapToGrid = val;
      }),

    setGridSize: (size) =>
      set((state) => {
        state.gridSize = size;
      }),

    setShowGuides: (val) =>
      set((state) => {
        state.showGuides = val;
      }),

    moveElementLayer: (id, direction) =>
      set((state) => {
        for (const section of state.sections) {
          const idx = section.elements.findIndex((e) => e.id === id);
          if (idx < 0) continue;
          const els = section.elements;
          switch (direction) {
            case "front":
              els.push(els.splice(idx, 1)[0]);
              break;
            case "back":
              els.unshift(els.splice(idx, 1)[0]);
              break;
            case "forward":
              if (idx < els.length - 1) {
                [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
              }
              break;
            case "backward":
              if (idx > 0) {
                [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
              }
              break;
          }
          els.forEach((e, i) => {
            e.zIndex = i + 1;
            e.order = i + 1;
          });
          state.dirty = true;
          break;
        }
      }),
  })),
);
