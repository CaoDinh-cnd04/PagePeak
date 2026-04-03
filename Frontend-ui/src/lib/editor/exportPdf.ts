import type { Canvas as FabricCanvas } from "fabric";
import { jsPDF } from "jspdf";

export function exportCanvasToPdf(canvas: FabricCanvas, filename = "page.pdf") {
  const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  const orientation = cw > ch ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [cw, ch],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, cw, ch);
  pdf.save(filename);
}

export function exportCanvasToPdfMultiPage(
  canvas: FabricCanvas,
  sectionHeights: number[],
  pageWidth: number,
  filename = "page.pdf",
) {
  const multiplier = 2;
  const fullDataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier });

  const img = new Image();
  img.src = fullDataUrl;

  img.onload = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [pageWidth, sectionHeights[0] || 800] });
    let yOffset = 0;

    sectionHeights.forEach((height, i) => {
      if (i > 0) pdf.addPage([pageWidth, height]);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = pageWidth * multiplier;
      tempCanvas.height = height * multiplier;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(
        img,
        0, yOffset * multiplier,
        pageWidth * multiplier, height * multiplier,
        0, 0,
        pageWidth * multiplier, height * multiplier,
      );

      const sectionDataUrl = tempCanvas.toDataURL("image/png");
      pdf.addImage(sectionDataUrl, "PNG", 0, 0, pageWidth, height);
      yOffset += height;
    });

    pdf.save(filename);
  };
}
