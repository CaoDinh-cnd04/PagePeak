import type { Canvas as FabricCanvas } from "fabric";

export function exportCanvasToPng(canvas: FabricCanvas, filename = "page.png") {
  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 2,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
