import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Layers, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editor/editorStore";
import type { EditorSection } from "@/types/editor";

function SortableSectionItem({
  section,
  isExpanded,
  isSelected,
  onToggle,
  onClick,
}: {
  section: EditorSection;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[12px] transition cursor-grab active:cursor-grabbing ${
          isSelected ? "bg-slate-100 text-[#1e2d7d] font-medium" : "text-slate-600 hover:bg-slate-50"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <span className="p-0.5" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{section.name ?? `Section ${section.order}`}</span>
        <span className="text-[10px] text-slate-400">{section.elements.length}</span>
      </div>
    </div>
  );
}

export function SortableLayersPanel() {
  const {
    sections,
    selected,
    selectSection,
    selectElement,
    addSection,
    moveSectionToIndex,
    moveElementLayer,
    removeElement,
    duplicateElement,
    pushHistory,
  } = useEditorStore();

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [ctx, setCtx] = useState<{ x: number; y: number; elId: number } | null>(null);

  useEffect(() => {
    const h = () => setCtx(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);
  const toggle = (id: number) =>
    setExpandedSections((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const aid = String(active.id);
      const oid = String(over.id);
      if (!aid.startsWith("section-") || !oid.startsWith("section-")) return;
      const activeId = Number(aid.replace("section-", ""));
      const overId = Number(oid.replace("section-", ""));
      const oldIdx = sections.findIndex((s) => s.id === activeId);
      const newIdx = sections.findIndex((s) => s.id === overId);
      if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
        moveSectionToIndex(activeId, newIdx);
        pushHistory();
      }
    },
    [sections, moveSectionToIndex, pushHistory]
  );

  const sectionIds = sections.map((s) => `section-${s.id}`);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 relative p-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layers</p>
            <button
              type="button"
              onClick={() => addSection()}
              className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
          {sections.map((sec) => (
            <div key={sec.id}>
              <SortableSectionItem
                section={sec}
                isExpanded={expandedSections.has(sec.id)}
                isSelected={selected.type === "section" && selected.id === sec.id}
                onToggle={() => toggle(sec.id)}
                onClick={() => selectSection(sec.id)}
              />
              {expandedSections.has(sec.id) && (
                <div className="ml-5 border-l border-slate-200 pl-2 space-y-0.5 py-0.5">
                  {sec.elements.map((el) => {
                    const isElSel = selected.type === "element" && selected.id === el.id;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition text-left ${
                          isElSel ? "bg-slate-100 text-[#1e2d7d] font-medium" : "text-slate-500 hover:bg-slate-50"
                        }`}
                        onClick={() => selectElement(el.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setCtx({ x: e.clientX, y: e.clientY, elId: el.id });
                        }}
                      >
                        <span className="capitalize truncate">{el.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
      {ctx && (
        <div
          className="fixed bg-white border border-[#e0e0e0] rounded-lg shadow-xl py-1 z-[200] min-w-[150px]"
          style={{ left: ctx.x, top: ctx.y }}
        >
          {[
            { label: "Lên trên cùng", action: () => { moveElementLayer(ctx.elId, "front"); pushHistory(); } },
            { label: "Lên 1 lớp", action: () => { moveElementLayer(ctx.elId, "forward"); pushHistory(); } },
            { label: "Xuống 1 lớp", action: () => { moveElementLayer(ctx.elId, "backward"); pushHistory(); } },
            { label: "Xuống dưới cùng", action: () => { moveElementLayer(ctx.elId, "back"); pushHistory(); } },
            null,
            { label: "Nhân bản", action: () => { duplicateElement(ctx.elId); pushHistory(); } },
            { label: "Xóa", action: () => { removeElement(ctx.elId); pushHistory(); }, danger: true },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="h-px bg-slate-100 my-1" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => {
                  (item as { action: () => void }).action();
                  setCtx(null);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  (item as { danger?: boolean }).danger ? "text-red-500" : "text-slate-700"
                }`}
              >
                {(item as { label: string }).label}
              </button>
            )
          )}
        </div>
      )}
    </DndContext>
  );
}
