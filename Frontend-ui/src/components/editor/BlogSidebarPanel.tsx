import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { LayoutGrid, FileText, Plus, GripVertical } from "lucide-react";
import type { EditorElementType, EditorSection, ElementPresetData, ToolItemData } from "@/types/editor";
import { parseBlogDetailContent, parseBlogListContent } from "@/lib/editor/blogContent";
import {
  BLOG_TEMPLATE_CATEGORY_LABELS,
  type BlogTemplateCategoryId,
  filterBlogTemplatesByCategory,
  getAllBlogCanvasTemplateEntries,
  blogDetailPresetByEntryId,
  blogListPresetByEntryId,
  toElementPresetFromBlogDetail,
  toElementPresetFromBlogList,
} from "@/lib/editor/blogTemplateCatalog";

const TOOL_BLOG_LIST: ToolItemData = {
  id: 601,
  name: "Danh sách bài viết",
  icon: "file-text",
  elementType: "blog-list",
  order: 1,
  hasSubTabs: false,
  presets: [],
};
const TOOL_BLOG_DETAIL: ToolItemData = {
  id: 602,
  name: "Chi tiết bài viết",
  icon: "file-text",
  elementType: "blog-detail",
  order: 2,
  hasSubTabs: false,
  presets: [],
};

type TabKey = "list" | "templates" | "mine";

function blogElementLabel(el: { type: string; content?: string | null }): string {
  if (el.type === "blog-list") {
    const bl = parseBlogListContent(el.content ?? undefined);
    const t = bl.posts?.[0]?.title?.trim();
    return t ? `Lưới: ${t.slice(0, 28)}${t.length > 28 ? "…" : ""}` : "Danh sách bài viết";
  }
  if (el.type === "blog-detail") {
    const bd = parseBlogDetailContent(el.content ?? undefined);
    const t = bd.title?.trim();
    return t ? `Bài: ${t.slice(0, 32)}${t.length > 32 ? "…" : ""}` : "Chi tiết bài viết";
  }
  return el.type;
}

export function BlogSidebarPanel({
  sections,
  onSelectElement,
  onAddElement,
}: {
  sections: EditorSection[];
  onSelectElement: (id: number) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
}) {
  const [tab, setTab] = useState<TabKey>("templates");
  const [templateCat, setTemplateCat] = useState<BlogTemplateCategoryId>("all");

  const blogBlocks = useMemo(() => {
    const out: { id: number; type: string; label: string }[] = [];
    for (const s of sections) {
      for (const el of s.elements ?? []) {
        if (el.type === "blog-list" || el.type === "blog-detail") {
          out.push({ id: el.id, type: el.type, label: blogElementLabel(el) });
        }
      }
    }
    return out;
  }, [sections]);

  const templateEntries = useMemo(() => {
    const all = getAllBlogCanvasTemplateEntries();
    return filterBlogTemplatesByCategory(all, templateCat);
  }, [templateCat]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex border-b border-[#e0e0e0] shrink-0 px-1">
        {(
          [
            ["list", "Danh sách"],
            ["templates", "Mẫu blog"],
            ["mine", "Của tôi"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 px-2 py-2 text-[10px] font-medium transition border-b-2 ${
              tab === k ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-2 border-b border-slate-100 space-y-1.5 shrink-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Thêm nhanh</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onAddElement("blog-list")}
            className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#1e2d7d]/40 hover:bg-indigo-50/50 text-left"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#1e2d7d] shrink-0" />
            <span className="text-[10px] font-medium text-slate-800 leading-tight">Lưới trống</span>
          </button>
          <button
            type="button"
            onClick={() => onAddElement("blog-detail")}
            className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#1e2d7d]/40 hover:bg-indigo-50/50 text-left"
          >
            <FileText className="w-3.5 h-3.5 text-[#1e2d7d] shrink-0" />
            <span className="text-[10px] font-medium text-slate-800 leading-tight">Bài trống</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {tab === "list" && (
          <div className="flex flex-col flex-1 min-h-0 p-2">
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Trên trang này</span>
              <button
                type="button"
                onClick={() => onAddElement("blog-list")}
                className="text-[10px] font-semibold text-[#1e2d7d] flex items-center gap-0.5 hover:underline"
              >
                <Plus className="w-3 h-3" /> Thêm lưới
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {blogBlocks.length === 0 ? (
                <p className="text-[10px] text-slate-500 px-1 py-3 text-center leading-relaxed">Chưa có khối blog. Dùng &quot;Thêm nhanh&quot; hoặc tab Mẫu blog.</p>
              ) : (
                blogBlocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectElement(b.id)}
                    className="w-full text-left px-2 py-2 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-indigo-50/80 hover:border-indigo-200 transition"
                  >
                    <span className="text-[9px] font-semibold text-indigo-600 uppercase">{b.type === "blog-list" ? "Lưới" : "Chi tiết"}</span>
                    <span className="block text-[11px] text-slate-800 line-clamp-2 mt-0.5">{b.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div className="flex flex-1 min-h-0">
            <div className="w-[88px] shrink-0 border-r border-slate-100 overflow-y-auto py-1 bg-slate-50/50">
              {BLOG_TEMPLATE_CATEGORY_LABELS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTemplateCat(id)}
                  className={`w-full text-left px-2 py-1.5 text-[10px] leading-snug transition ${
                    templateCat === id ? "bg-white text-[#1e2d7d] font-semibold shadow-sm" : "text-slate-600 hover:bg-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 min-w-0">
              <div className="grid grid-cols-1 gap-2">
                {templateEntries.map((entry, idx) => (
                  <BlogTemplateCard
                    key={entry.id}
                    entry={entry}
                    order={idx}
                    onInsert={() => {
                      if (entry.kind === "blog-list") {
                        const p = blogListPresetByEntryId(entry.id);
                        if (p) onAddElement("blog-list", toElementPresetFromBlogList(p, idx));
                      } else {
                        const p = blogDetailPresetByEntryId(entry.id);
                        if (p) onAddElement("blog-detail", toElementPresetFromBlogDetail(p, idx));
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "mine" && (
          <div className="p-3 flex flex-col gap-2 flex-1">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              <strong>Blog của tôi</strong> — lưu bản nháp / bài từ workspace sẽ kết nối API sau.
            </p>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 text-center">
              <p className="text-[10px] text-slate-500">Chưa có mục đã lưu.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BlogTemplateCard({
  entry,
  order,
  onInsert,
}: {
  entry: import("@/lib/editor/blogTemplateCatalog").BlogCanvasTemplateEntry;
  order: number;
  onInsert: () => void;
}) {
  const item = entry.kind === "blog-list" ? TOOL_BLOG_LIST : TOOL_BLOG_DETAIL;
  const preset: ElementPresetData | undefined = (() => {
    if (entry.kind === "blog-list") {
      const p = blogListPresetByEntryId(entry.id);
      return p ? toElementPresetFromBlogList(p, order) : undefined;
    }
    const p = blogDetailPresetByEntryId(entry.id);
    return p ? toElementPresetFromBlogDetail(p, order) : undefined;
  })();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `blog-template-${entry.id}`,
    disabled: !preset,
    data: preset
      ? {
          type: "tool-item" as const,
          item,
          elementType: entry.kind as EditorElementType,
          preset,
        }
      : undefined,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col transition ${
        isDragging ? "opacity-60 ring-2 ring-[#1e2d7d]/25" : "hover:border-[#1e2d7d]/35"
      } ${preset ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
    >
      <div className="flex items-stretch gap-1 px-1 py-1 border-b border-slate-100 bg-slate-50/50">
        <span className="shrink-0 p-1 text-slate-400 pointer-events-none" aria-hidden>
          <GripVertical className="w-3 h-3" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInsert();
          }}
          className="flex-1 text-left min-w-0"
        >
          <div className="h-[72px] rounded-md overflow-hidden bg-slate-100 border border-slate-200/80">
            <img src={entry.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="pt-1.5 px-0.5 pb-1">
            <span className="text-[10px] font-semibold text-slate-800 line-clamp-2">{entry.name}</span>
            <span className="text-[9px] text-slate-500 line-clamp-1">{entry.description}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
