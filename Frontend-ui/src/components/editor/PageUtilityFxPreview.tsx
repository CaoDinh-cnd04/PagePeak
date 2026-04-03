import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor/editorStore";
import { startUtilityFxAnimation } from "@/lib/editor/utilityFxAnimation";

/**
 * Lớp xem trước hiệu ứng tiện ích trên vùng canvas (pointer-events: none, z-index dưới thanh công cụ).
 */
export function PageUtilityFxPreview() {
  const utilityEffects = useEditorStore((s) => s.pageSettings.utilityEffects);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const snow = !!utilityEffects?.snow;
  const cherry = !!utilityEffects?.cherryBlossom;
  const fireworks = !!utilityEffects?.fireworks;
  const active = snow || cherry || fireworks;

  useEffect(() => {
    if (!active || !wrapRef.current || !canvasRef.current) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const getSize = () => ({ width: wrap.clientWidth, height: wrap.clientHeight });
    const stop = startUtilityFxAnimation(canvas, getSize, { snow, cherryBlossom: cherry, fireworks }, wrap);
    return () => stop();
  }, [active, snow, cherry, fireworks]);

  if (!active) return null;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
