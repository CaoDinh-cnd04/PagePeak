import { useRef, useCallback } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { EditorSection, EditorElementType, ToolItemData, ElementPresetData } from "@/types/editor";
import { getLucideIcon } from "@/lib/iconMap";

export type PresetPreviewVariant = "compact" | "card";

export function PresetPreview({
  preset,
  elementType,
  variant = "compact",
}: {
  preset: ElementPresetData;
  elementType: string;
  variant?: PresetPreviewVariant;
}) {
  let styles: Record<string, string | number> = {};
  try {
    styles = JSON.parse(preset.stylesJson || "{}");
  } catch {}
  const content = preset.defaultContent || preset.name;
  const card = variant === "card";

  if (elementType === "button") {
    const bg = (styles.backgroundColor as string) ?? "#4f46e5";
    const color = (styles.color as string) ?? "#ffffff";
    const radius = (styles.borderRadius as number) ?? 8;
    const borderW = (styles.borderWidth as number) ?? 0;
    const borderC = (styles.borderColor as string) ?? "#e2e8f0";
    const fontSize = Math.min((styles.fontSize as number) ?? 14, card ? 12 : 10);
    const textTransform = (styles.textTransform as string) ?? "none";
    const textDeco = (styles.textDecoration as string) ?? "none";
    let displayText = content;
    if (textTransform === "uppercase") displayText = displayText.toUpperCase();
    if (displayText.length > 12) displayText = displayText.slice(0, 10) + "…";
    return (
      <div
        className={`shrink-0 flex items-center justify-center px-2 py-1 rounded ${card ? "min-w-[100px] max-w-[200px] py-1.5" : "min-w-[56px] max-w-[80px]"}`}
        style={{
          backgroundColor: bg,
          color,
          borderRadius: radius,
          border: borderW > 0 ? `${borderW}px solid ${borderC}` : "none",
          fontSize: `${fontSize}px`,
          fontWeight: (styles.fontWeight as number) ?? 600,
          textDecoration: textDeco,
          textTransform: textTransform as React.CSSProperties["textTransform"],
          boxShadow: (styles.boxShadow as string) || undefined,
        }}
      >
        <span className="truncate">{displayText}</span>
      </div>
    );
  }

  if (["text", "headline", "paragraph"].includes(elementType)) {
    const color = (styles.color as string) ?? "#1e293b";
    const rawFs = (styles.fontSize as number) ?? (elementType === "headline" ? 28 : elementType === "paragraph" ? 15 : 14);
    const fontSize = card
      ? Math.min(rawFs, elementType === "headline" ? 22 : elementType === "paragraph" ? 14 : 13)
      : Math.min(rawFs, 11);
    let displayText = content;
    if (!card && displayText.length > 18) displayText = displayText.slice(0, 16) + "…";
    if (card && displayText.length > 120) displayText = displayText.slice(0, 118) + "…";
    const lineHeight = (styles.lineHeight as number) ?? (elementType === "paragraph" ? 1.5 : 1.25);
    const letterSpacing = (styles.letterSpacing as number) ?? 0;
    const textTransform = (styles.textTransform as string) ?? "none";
    const textDeco = (styles.textDecoration as string) ?? "none";
    return (
      <div
        className={`shrink-0 rounded border border-slate-200 bg-white ${card ? "w-full min-w-0 px-2.5 py-2 max-w-none" : "px-2 py-0.5 bg-slate-50/80 min-w-[60px] max-w-[100px]"}`}
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontWeight: (styles.fontWeight as number) ?? (elementType === "headline" ? 700 : 400),
          fontStyle: (styles.fontStyle as string) ?? "normal",
          lineHeight,
          letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
          textTransform: textTransform as React.CSSProperties["textTransform"],
          textDecoration: textDeco,
          textAlign: ((styles.textAlign as string) ?? "left") as React.CSSProperties["textAlign"],
        }}
      >
        <span className={`block ${card ? "line-clamp-4 break-words" : "truncate"}`}>{displayText}</span>
      </div>
    );
  }

  if (elementType === "list") {
    const color = (styles.color as string) ?? "#334155";
    const fs = card ? Math.min((styles.fontSize as number) ?? 14, 12) : 10;
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const show = card ? lines.slice(0, 4) : [lines[0] || "Mục 1"];
    return (
      <div
        className={`shrink-0 rounded border border-slate-200 bg-white ${card ? "w-full min-w-0 px-2.5 py-2 text-left" : "px-2 py-0.5 bg-slate-50/80 max-w-[90px]"}`}
        style={{ color, fontSize: `${fs}px`, lineHeight: (styles.lineHeight as number) ?? 1.5 }}
      >
        {show.map((line, i) => (
          <span key={i} className={`block ${card ? "truncate" : "truncate"}`}>
            • {card ? line.slice(0, 48) : line.slice(0, 12)}
            {!card && line.length > 12 ? "…" : ""}
            {card && line.length > 48 ? "…" : ""}
          </span>
        ))}
      </div>
    );
  }

  if (elementType === "shape") {
    const bg = (styles.backgroundColor as string) ?? "#e0e7ff";
    const radius = (styles.borderRadius as number) ?? 8;
    const borderW = (styles.borderWidth as number) ?? 0;
    const borderC = (styles.borderColor as string) ?? "#e2e8f0";
    const borderStyle = (styles.borderStyle as string) ?? "solid";
    const boxShadow = (styles.boxShadow as string) ?? "";
    const isCircle = radius >= 999;
    return (
      <div
        className={`shrink-0 rounded overflow-hidden ${card ? "w-24 h-16" : "w-10 h-8"}`}
        style={{
          backgroundColor: bg === "transparent" ? "rgba(248,250,252,0.8)" : bg,
          borderRadius: isCircle ? "50%" : radius,
          border: borderW > 0 ? `${borderW}px ${borderStyle} ${borderC}` : "none",
          boxShadow: boxShadow || undefined,
        }}
      />
    );
  }

  if (elementType === "icon") {
    const color = (styles.color as string) ?? "#4f46e5";
    const char = content || "★";
    return (
      <div
        className={`shrink-0 rounded bg-slate-100 flex items-center justify-center ${card ? "w-14 h-14 text-2xl" : "w-8 h-8 text-lg"}`}
        style={{ color }}
      >
        {char}
      </div>
    );
  }

  if (elementType === "gallery") {
    const layoutType = (styles.layoutType as string) ?? "grid";
    const cols = Number(styles.columns ?? 3) || 3;
    const bg = (styles.backgroundColor as string) ?? "#f8fafc";
    const radius = (styles.borderRadius as number) ?? 8;
    let urls: string[] = [];
    try {
      const parsed = JSON.parse(content || "[]");
      urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
    } catch {}
    const cellSize = card
      ? layoutType === "minimal" ? 48 : layoutType === "vertical-thumbs" ? 20 : 24
      : layoutType === "minimal" ? 32 : layoutType === "vertical-thumbs" ? 14 : 18;
    return (
      <div
        className="shrink-0 rounded overflow-hidden border border-slate-200"
        style={{
          width: card ? 72 : 56,
          height: card ? 54 : 42,
          backgroundColor: bg,
          borderRadius: radius,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {urls.length === 0 ? (
          <span className="text-slate-400 text-[10px]">🖼</span>
        ) : layoutType === "minimal" ? (
          <div
            className="rounded"
            style={{
              width: card ? 60 : 44,
              height: card ? 46 : 34,
              background: `url(${urls[0]}) center/cover`,
              backgroundColor: "#e2e8f0",
            }}
          />
        ) : (
          urls.slice(0, layoutType === "vertical-thumbs" ? 4 : cols * 2).map((url, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: cellSize,
                height: cellSize,
                background: `url(${url}) center/cover`,
                backgroundColor: "#e2e8f0",
              }}
            />
          ))
        )}
      </div>
    );
  }

  if (elementType === "divider") {
    const color = (styles.backgroundColor as string) ?? "#d1d5db";
    const thickness = Math.max(1, ((styles.height as number) ?? 2));
    return (
      <div className={`flex w-full items-center justify-center ${card ? "py-3" : "py-1"}`}>
        <div
          style={{
            width: card ? "100%" : 48,
            height: thickness,
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    );
  }

  if (elementType === "countdown") {
    return (
      <div
        className={`flex items-center justify-center gap-1 font-mono font-bold text-slate-700 ${card ? "text-sm gap-1.5" : "text-[10px]"}`}
      >
        {["00", "00", "00", "00"].map((t, i) => (
          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 tabular-nums">
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (elementType === "rating") {
    const n = Math.min(5, Math.max(1, parseInt(String(content).replace(/\D/g, ""), 10) || 5));
    return (
      <div className={`text-amber-400 ${card ? "text-lg tracking-wide" : "text-sm"}`}>
        {"★".repeat(n)}
        <span className="text-slate-300">{"★".repeat(5 - n)}</span>
      </div>
    );
  }

  if (elementType === "progress") {
    const pct = Math.min(100, Math.max(0, parseInt(String(content).replace(/\D/g, ""), 10) || 60));
    const bg = (styles.backgroundColor as string) ?? "#e2e8f0";
    const fill = (styles.color as string) ?? "#4f46e5";
    return (
      <div className={`w-full ${card ? "max-w-[200px]" : "max-w-[80px]"}`}>
        <div className="h-2 w-full rounded-full" style={{ background: bg }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: fill }} />
        </div>
        <p className="mt-0.5 text-center text-[9px] text-slate-500">{pct}%</p>
      </div>
    );
  }

  if (elementType === "form") {
    return (
      <div className={`w-full space-y-1 rounded border border-slate-200 bg-white p-2 ${card ? "text-[11px]" : "text-[9px]"}`}>
        <div className="h-2 w-3/4 rounded bg-slate-100" />
        <div className="h-6 w-full rounded border border-slate-200 bg-slate-50" />
        <div className="mx-auto h-5 w-20 rounded bg-slate-800" />
      </div>
    );
  }

  return (
    <div
      className={`rounded border border-dashed border-slate-200 bg-slate-50 text-slate-600 ${
        card ? "w-full min-w-0 px-2 py-2 text-[11px] font-medium text-center leading-snug line-clamp-3" : "px-2 py-1 text-[9px] max-w-[90px] truncate"
      }`}
    >
      {preset.name}
    </div>
  );
}

const SECTION_LABEL_HEIGHT = 0;
const SECTION_GAP = 4;

function getSectionYOffsets(sections: EditorSection[]): number[] {
  const offsets: number[] = [];
  let y = 0;
  for (const sec of sections) {
    offsets.push(y);
    y += (sec.height ?? 600) + SECTION_LABEL_HEIGHT + SECTION_GAP;
  }
  return offsets;
}

function findSectionAtY(sections: EditorSection[], canvasY: number): { section: EditorSection; localY: number } | null {
  const offsets = getSectionYOffsets(sections);
  for (let i = 0; i < sections.length; i++) {
    const top = offsets[i] ?? 0;
    const h = sections[i].height ?? 600;
    if (canvasY >= top && canvasY < top + h) {
      return { section: sections[i], localY: canvasY - top - SECTION_LABEL_HEIGHT };
    }
  }
  return sections.length > 0 ? { section: sections[0], localY: 50 } : null;
}

export function DraggableToolItem({
  item,
  activeItemId,
  onSelect,
  onAddElement,
  onAddSection,
  forceAddWithPreset,
}: {
  item: ToolItemData;
  activeItemId?: number | null;
  onSelect?: (id: number) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
  forceAddWithPreset?: ElementPresetData;
}) {
  const preset = forceAddWithPreset ?? item.presets[0];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool-${item.id}`,
    data: {
      type: "tool-item",
      item,
      elementType: item.elementType as EditorElementType,
      preset,
    },
  });

  const isActive = activeItemId === item.id;

  const handleClick = () => {
    if (forceAddWithPreset) {
      onAddElement(item.elementType as EditorElementType, forceAddWithPreset);
      return;
    }
    onSelect?.(item.id);
    if (item.presets.length === 0) {
      if (item.elementType === "section") onAddSection();
      else onAddElement(item.elementType as EditorElementType);
    }
  };

  const showPresetPreview = forceAddWithPreset && ["button", "text", "headline", "paragraph", "list", "shape", "icon", "gallery"].includes(item.elementType);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-2 rounded text-[12px] transition cursor-grab active:cursor-grabbing touch-none select-none ${
        isDragging ? "opacity-50" : isActive ? "bg-slate-100 text-[#1e2d7d] font-medium" : "text-slate-600 hover:bg-slate-50"
      }`}
      title="Giữ chuột và kéo vào trang để thả; hoặc nhấn để thêm / chọn mẫu"
    >
      <span className="shrink-0 p-0.5 rounded pointer-events-none" aria-hidden>
        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </span>
      <button
        type="button"
        onClick={handleClick}
        className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-inherit"
      >
        {showPresetPreview ? (
          <PresetPreview preset={forceAddWithPreset} elementType={item.elementType} />
        ) : (
          getLucideIcon(item.icon, "w-4 h-4 shrink-0")
        )}
        <span className="truncate flex-1">{item.name}</span>
      </button>
    </div>
  );
}

export function DroppableCanvas({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`relative ${isOver ? "ring-2 ring-[#1e2d7d] ring-inset rounded" : ""}`}>
      {children}
    </div>
  );
}

export function EditorDndProvider({
  children,
  onDropFromTool,
  canvasContainerRef,
  sections,
  zoom,
  canvasWidth,
}: {
  children: React.ReactNode;
  onDropFromTool: (sectionId: number, elType: EditorElementType, x: number, y: number, preset?: ElementPresetData) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  sections: EditorSection[];
  zoom: number;
  canvasWidth: number;
}) {
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Kéo sau khi di chuyển vài px (giữ chuột + kéo); không bắt chờ 100ms như delay
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragStart = useCallback((_e: DragStartEvent) => {
    pointerRef.current = null;
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || over.id !== "canvas-drop") return;

      const data = active.data.current;
      if (!data || data.type !== "tool-item") return;

      const container = canvasContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const activeRect = active.rect.current;
      if (!activeRect) return;
      const translated = activeRect.translated;
      if (!translated) return;

      const centerX = translated.left + translated.width / 2;
      const centerY = translated.top + translated.height / 2;

      const canvasX = (centerX - rect.left) / zoom;
      const canvasY = (centerY - rect.top) / zoom;

      const found = findSectionAtY(sections, canvasY);
      if (!found) return;

      const { section, localY } = found;
      const x = Math.max(0, Math.min(canvasX, canvasWidth - 50));
      const y = Math.max(0, localY);

      onDropFromTool(section.id, data.elementType, x, y, data.preset);
    },
    [canvasContainerRef, onDropFromTool, sections, zoom]
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
