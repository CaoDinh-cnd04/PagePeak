import type { Canvas, Line } from "fabric";
import * as fabric from "fabric";

const SNAP_THRESHOLD = 5;
const GUIDE_COLOR = "#ef4444";

type GuideLine = Line & { _isGuide?: boolean };

export function setupSnapGuides(
  canvas: Canvas,
  snapEnabled: () => boolean,
  gridSize: () => number,
) {
  const guideLines: GuideLine[] = [];

  function clearGuides() {
    guideLines.forEach((line) => canvas.remove(line));
    guideLines.length = 0;
  }

  function createGuideLine(x1: number, y1: number, x2: number, y2: number): GuideLine {
    const line = new fabric.Line([x1, y1, x2, y2], {
      stroke: GUIDE_COLOR,
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    }) as GuideLine;
    line._isGuide = true;
    return line;
  }

  let rafId: number | null = null;
  let pendingEvent: { target: fabric.FabricObject } | null = null;

  function runSnapLogic() {
    rafId = null;
    const e = pendingEvent;
    pendingEvent = null;
    if (!e || !snapEnabled()) return;

    const target = e.target;
    if (!target) return;

    clearGuides();

    const grid = gridSize();
    const tLeft = target.left ?? 0;
    const tTop = target.top ?? 0;
    const tWidth = (target.width ?? 0) * (target.scaleX ?? 1);
    const tHeight = (target.height ?? 0) * (target.scaleY ?? 1);

    const tCenterX = tLeft + tWidth / 2;
    const tCenterY = tTop + tHeight / 2;
    const tRight = tLeft + tWidth;
    const tBottom = tTop + tHeight;

    let snappedX = tLeft;
    let snappedY = tTop;
    let didSnapX = false;
    let didSnapY = false;

    if (grid > 0) {
      const gridX = Math.round(tLeft / grid) * grid;
      const gridY = Math.round(tTop / grid) * grid;
      if (Math.abs(tLeft - gridX) < SNAP_THRESHOLD) {
        snappedX = gridX;
        didSnapX = true;
      }
      if (Math.abs(tTop - gridY) < SNAP_THRESHOLD) {
        snappedY = gridY;
        didSnapY = true;
      }
    }

    const canvasWidth = canvas.getWidth() / (canvas.getZoom() || 1);
    const canvasHeight = canvas.getHeight() / (canvas.getZoom() || 1);

    const centerX = canvasWidth / 2;
    if (Math.abs(tCenterX - centerX) < SNAP_THRESHOLD) {
      snappedX = centerX - tWidth / 2;
      didSnapX = true;
      guideLines.push(createGuideLine(centerX, 0, centerX, canvasHeight));
    }

    const centerY = canvasHeight / 2;
    if (Math.abs(tCenterY - centerY) < SNAP_THRESHOLD) {
      snappedY = centerY - tHeight / 2;
      didSnapY = true;
      guideLines.push(createGuideLine(0, centerY, canvasWidth, centerY));
    }

    const objects = canvas.getObjects().filter(
      (o) => o !== target && !(o as GuideLine)._isGuide
    );

    for (const obj of objects) {
      const oLeft = obj.left ?? 0;
      const oTop = obj.top ?? 0;
      const oWidth = (obj.width ?? 0) * (obj.scaleX ?? 1);
      const oHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);
      const oCenterX = oLeft + oWidth / 2;
      const oCenterY = oTop + oHeight / 2;
      const oRight = oLeft + oWidth;
      const oBottom = oTop + oHeight;

      if (!didSnapX) {
        if (Math.abs(tLeft - oLeft) < SNAP_THRESHOLD) {
          snappedX = oLeft;
          didSnapX = true;
          const y1 = Math.min(tTop, oTop);
          const y2 = Math.max(tBottom, oBottom);
          guideLines.push(createGuideLine(oLeft, y1, oLeft, y2));
        } else if (Math.abs(tRight - oRight) < SNAP_THRESHOLD) {
          snappedX = oRight - tWidth;
          didSnapX = true;
          const y1 = Math.min(tTop, oTop);
          const y2 = Math.max(tBottom, oBottom);
          guideLines.push(createGuideLine(oRight, y1, oRight, y2));
        } else if (Math.abs(tCenterX - oCenterX) < SNAP_THRESHOLD) {
          snappedX = oCenterX - tWidth / 2;
          didSnapX = true;
          const y1 = Math.min(tTop, oTop);
          const y2 = Math.max(tBottom, oBottom);
          guideLines.push(createGuideLine(oCenterX, y1, oCenterX, y2));
        } else if (Math.abs(tLeft - oRight) < SNAP_THRESHOLD) {
          snappedX = oRight;
          didSnapX = true;
        } else if (Math.abs(tRight - oLeft) < SNAP_THRESHOLD) {
          snappedX = oLeft - tWidth;
          didSnapX = true;
        }
      }

      if (!didSnapY) {
        if (Math.abs(tTop - oTop) < SNAP_THRESHOLD) {
          snappedY = oTop;
          didSnapY = true;
          const x1 = Math.min(tLeft, oLeft);
          const x2 = Math.max(tRight, oRight);
          guideLines.push(createGuideLine(x1, oTop, x2, oTop));
        } else if (Math.abs(tBottom - oBottom) < SNAP_THRESHOLD) {
          snappedY = oBottom - tHeight;
          didSnapY = true;
          const x1 = Math.min(tLeft, oLeft);
          const x2 = Math.max(tRight, oRight);
          guideLines.push(createGuideLine(x1, oBottom, x2, oBottom));
        } else if (Math.abs(tCenterY - oCenterY) < SNAP_THRESHOLD) {
          snappedY = oCenterY - tHeight / 2;
          didSnapY = true;
          const x1 = Math.min(tLeft, oLeft);
          const x2 = Math.max(tRight, oRight);
          guideLines.push(createGuideLine(x1, oCenterY, x2, oCenterY));
        } else if (Math.abs(tTop - oBottom) < SNAP_THRESHOLD) {
          snappedY = oBottom;
          didSnapY = true;
        } else if (Math.abs(tBottom - oTop) < SNAP_THRESHOLD) {
          snappedY = oTop - tHeight;
          didSnapY = true;
        }
      }

      if (didSnapX && didSnapY) break;
    }

    if (guideLines.length > 0) {
      canvas.add(...guideLines);
    }

    if (didSnapX) target.set("left", snappedX);
    if (didSnapY) target.set("top", snappedY);
  }

  canvas.on("object:moving", (e) => {
    if (!snapEnabled()) return;
    const target = e.target;
    if (!target) return;

    pendingEvent = { target };
    if (rafId == null) {
      rafId = requestAnimationFrame(runSnapLogic);
    }
  });

  canvas.on("object:modified", clearGuides);
  canvas.on("mouse:up", clearGuides);

  return { clearGuides };
}
