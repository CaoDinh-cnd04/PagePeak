import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  EditorSection,
  EditorElement,
  EditorElementType,
  PageContent,
  PageSettings,
} from "@/types/editor";

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
  selected: SelectedTarget;
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
  setDeviceType: (device: DeviceType) => void;
  selectPage: () => void;
  selectSection: (id: number) => void;
  selectElement: (id: number) => void;
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
  text: { width: 300, height: 40, content: "Text element" },
  headline: {
    width: 500,
    height: 60,
    content: "Headline",
    styles: { fontSize: 32, fontWeight: 700 },
  },
  paragraph: {
    width: 400,
    height: 80,
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    styles: { fontSize: 14 },
  },
  button: {
    width: 180,
    height: 48,
    content: "Click me",
    styles: { backgroundColor: "#4f46e5", color: "#ffffff", borderRadius: 8, fontSize: 14, fontWeight: 600, borderWidth: 0, borderColor: "#e2e8f0" },
  },
  image: { width: 280, height: 200, content: "", imageUrl: "" },
  video: { width: 480, height: 270, content: "", videoUrl: "" },
  shape: {
    width: 120,
    height: 120,
    content: "[]",
    styles: { backgroundColor: "#e0e7ff", borderRadius: 8, borderWidth: 0, borderColor: "#e2e8f0", borderStyle: "solid" },
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
  gallery: { width: 500, height: 300, content: "" },
  "product-detail": {
    width: 360,
    height: 480,
    content: JSON.stringify({
      images: ["https://picsum.photos/400/400?random=1"],
      title: "Áo thun nam cao cấp",
      price: "1.290.000đ",
      salePrice: "990.000đ",
      description: "Chất liệu cotton 100%, thoáng mát, form dáng chuẩn. Phù hợp mặc hàng ngày hoặc đi làm.",
      badge: "Giảm 23%",
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  "collection-list": {
    width: 600,
    height: 340,
    content: JSON.stringify({
      columns: 3,
      items: [
        { image: "https://picsum.photos/200/200?random=2", title: "Áo Polo Basic", price: "299.000đ" },
        { image: "https://picsum.photos/200/200?random=3", title: "Quần Jeans Slim", price: "499.000đ" },
        { image: "https://picsum.photos/200/200?random=4", title: "Giày Sneaker", price: "890.000đ" },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  frame: { width: 400, height: 300, content: "", styles: { border: "1px solid #e2e8f0", borderRadius: 8 } },
  accordion: { width: 500, height: 200, content: "Câu hỏi 1|Trả lời 1\nCâu hỏi 2|Trả lời 2", styles: { fontSize: 14 } },
  table: { width: 600, height: 200, content: "Col1,Col2,Col3\nR1C1,R1C2,R1C3\nR2C1,R2C2,R2C3", styles: { fontSize: 13 } },
  cart: { width: 400, height: 300, content: "" },
  "blog-list": { width: 700, height: 400, content: "" },
  "blog-detail": { width: 600, height: 500, content: "" },
  popup: { width: 500, height: 400, content: "", styles: { backgroundColor: "#ffffff", borderRadius: 12 } },
  map: { width: 500, height: 300, content: "10.762622,106.660172" },
  "social-share": { width: 200, height: 40, content: "" },
  rating: { width: 200, height: 40, content: "5", styles: { color: "#f59e0b" } },
  progress: { width: 400, height: 24, content: "75", styles: { backgroundColor: "#e2e8f0" } },
  carousel: {
    width: 420,
    height: 280,
    content: JSON.stringify({
      layoutType: "media",
      items: [
        { image: "https://picsum.photos/800/450?random=21", title: "Slide 1", desc: "Mô tả ngắn cho slide." },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
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
  antigravity: { width: 800, height: 600, content: "Antigravity UI", styles: {} },
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
    selected: { type: "page" },
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
      set(() => ({
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
        sections: content.sections,
        selected: { type: "page" },
        dirty: false,
        history: [JSON.parse(JSON.stringify(content.sections))],
        historyIndex: 0,
      })),

    setDeviceType: (device) =>
      set((state) => {
        state.deviceType = device;
        state.canvasWidth = device === "mobile" ? 420 : state.desktopCanvasWidth;
      }),

    selectPage: () =>
      set((state) => {
        state.selected = { type: "page" };
      }),

    selectSection: (id) =>
      set((state) => {
        state.selected = { type: "section", id };
      }),

    selectElement: (id: number) =>
      set((state) => {
        state.selected = { type: "element", id };
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
        const elType = partial.type ?? "text";
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
