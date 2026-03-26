import type { UtilityEffectsSettings } from "@/types/editor";

/**
 * Chạy hiệu ứng tuyết / hoa / pháo hoa trên canvas (editor overlay hoặc bất kỳ container nào).
 * Trả về hàm dọn dẹp (hủy rAF, resize listener, interval).
 */
export function startUtilityFxAnimation(
  canvas: HTMLCanvasElement,
  getSize: () => { width: number; height: number },
  fx: UtilityEffectsSettings,
  /** Theo dõi kích thước (vùng canvas editor) không chỉ cửa sổ */
  resizeRoot?: HTMLElement | null,
): () => void {
  const u = fx ?? {};
  if (!u.snow && !u.cherryBlossom && !u.fireworks) {
    return () => {};
  }

  const snow = !!u.snow;
  const cherry = !!u.cherryBlossom;
  const fw = !!u.fireworks;

  const ctxRaw = canvas.getContext("2d");
  if (!ctxRaw) return () => {};
  const ctx = ctxRaw;

  let W = 0;
  let H = 0;
  const parts: Array<
    | { k: "s"; x: number; y: number; vy: number; r: number }
    | { k: "c"; x: number; y: number; vy: number; r: number; rot: number }
  > = [];
  const sparks: Array<{ x: number; y: number; life: number }> = [];

  function resize() {
    const { width, height } = getSize();
    W = canvas.width = Math.max(1, Math.floor(width));
    H = canvas.height = Math.max(1, Math.floor(height));
  }

  resize();

  let i: number;
  let t: (typeof parts)[number];
  if (snow) for (i = 0; i < 56; i++) parts.push({ k: "s", x: Math.random() * W, y: Math.random() * H, vy: 0.6 + Math.random() * 1.4, r: 0.6 + Math.random() * 1.8 });
  if (cherry) for (i = 0; i < 28; i++) parts.push({ k: "c", x: Math.random() * W, y: -Math.random() * H, vy: 0.4 + Math.random() * 0.9, r: 2 + Math.random() * 3, rot: Math.random() * 6.28 });

  let raf = 0;
  let sparkTimer: ReturnType<typeof setInterval> | null = null;
  if (fw) {
    sparkTimer = setInterval(() => {
      if (sparks.length < 10) sparks.push({ x: Math.random() * W, y: Math.random() * H * 0.55, life: 0 });
    }, 850);
  }

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  let ro: ResizeObserver | null = null;
  if (resizeRoot && typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => resize());
    ro.observe(resizeRoot);
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (i = 0; i < parts.length; i++) {
      t = parts[i];
      if (t.k === "s") {
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        t.y += t.vy;
        t.x += Math.sin(t.y * 0.012) * 0.6;
        if (t.y > H + 8) {
          t.y = -8;
          t.x = Math.random() * W;
        }
      } else if (t.k === "c") {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.fillStyle = "rgba(255,183,197,0.55)";
        ctx.scale(1, 0.42);
        ctx.beginPath();
        ctx.arc(0, 0, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        t.y += t.vy;
        t.x += Math.sin(t.y * 0.018) * 1.8;
        t.rot += 0.018;
        if (t.y > H + 8) {
          t.y = -8;
          t.x = Math.random() * W;
        }
      }
    }
    if (fw) {
      for (i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        const a = 1 - s.life / 50;
        if (a <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,210,80,${a * 0.9})`;
        ctx.lineWidth = 2;
        for (let k = 0; k < 10; k++) {
          const ang = k * 0.628 + s.life * 0.08;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + Math.cos(ang) * s.life * 2.2, s.y + Math.sin(ang) * s.life * 2.2);
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    ro?.disconnect();
    if (sparkTimer) clearInterval(sparkTimer);
  };
}
