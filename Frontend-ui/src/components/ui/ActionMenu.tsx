import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ActionItem =
  | { key: string; label: string; icon?: React.ReactNode; onClick: () => void; variant?: "default" | "destructive" }
  | { key: string; type: "divider" };

type ActionMenuProps = {
  trigger: React.ReactNode;
  items: ActionItem[];
  align?: "left" | "right";
};

export function ActionMenu({ trigger, items, align = "right" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target instanceof Node ? e.target : null;
      if (!target) return;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuW = 208;
      const menuH = 280;
      const padding = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuH && rect.top > spaceBelow;
      let top = openUpward ? rect.top - menuH - padding : rect.bottom + padding;
      let left = align === "right" ? rect.right - menuW : rect.left;
      top = Math.max(padding, Math.min(window.innerHeight - menuH - padding, top));
      left = Math.max(padding, Math.min(window.innerWidth - menuW - padding, left));
      setPosition({ top, left });
    }
  }, [open, align]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-white/90 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition"
        aria-label="Menu thao tác"
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-52 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-[9999]"
            style={{ top: position.top, left: position.left }}
          >
          {items.map((item) => {
            if ("type" in item && item.type === "divider") {
              return <div key={item.key} className="my-1 border-t border-slate-200 dark:border-slate-700" />;
            }
            const action = item as { key: string; label: string; icon?: React.ReactNode; onClick: () => void; variant?: "default" | "destructive" };
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
                className={`w-full px-3 py-2.5 text-sm flex items-center gap-2.5 transition ${
                  action.variant === "destructive"
                    ? "hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
          </div>,
          document.body
        )}
    </div>
  );
}
