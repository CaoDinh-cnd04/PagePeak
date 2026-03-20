/** Line preset data for LinePickerPanel - styles, colors, thickness */

export type LineStyle = "solid" | "dashed" | "dotted" | "double";

export type LinePreset = {
  id: string;
  name: string;
  style: LineStyle;
  color: string;
  thickness: number;
  dashArray?: number[]; // e.g. [8, 4] for dashed
};

export const LINE_PRESETS: LinePreset[] = [
  { id: "solid-m-black", name: "Nét liền đen vừa", style: "solid", color: "#000000", thickness: 2 },
  { id: "dashed-thick-black", name: "Nét đứt đen đậm", style: "dashed", color: "#000000", thickness: 4, dashArray: [8, 4] },
  { id: "dotted-black", name: "Nét chấm đen", style: "dotted", color: "#000000", thickness: 2, dashArray: [2, 4] },
  { id: "double-black", name: "Đường kép đen", style: "double", color: "#000000", thickness: 2 },
  { id: "solid-xthick-black", name: "Nét liền đen rất đậm", style: "solid", color: "#000000", thickness: 6 },
  { id: "solid-thick-gray", name: "Nét liền xám đậm", style: "solid", color: "#94a3b8", thickness: 4 },
  { id: "solid-thin-black", name: "Nét liền đen mảnh", style: "solid", color: "#000000", thickness: 1 },
  { id: "dashed-thin-black", name: "Nét đứt đen mảnh", style: "dashed", color: "#000000", thickness: 1, dashArray: [6, 3] },
  { id: "solid-thin-gray", name: "Nét liền xám mảnh", style: "solid", color: "#64748b", thickness: 1 },
  { id: "solid-mthick-black", name: "Nét liền đen vừa đậm", style: "solid", color: "#000000", thickness: 3 },
  { id: "solid-thick-black", name: "Nét liền đen đậm", style: "solid", color: "#000000", thickness: 4 },
  { id: "solid-xthick-black2", name: "Nét liền đen rất đậm 2", style: "solid", color: "#000000", thickness: 5 },
  { id: "dotted-blue", name: "Nét chấm xanh", style: "dotted", color: "#2563eb", thickness: 3, dashArray: [3, 4] },
  { id: "dashed-green", name: "Nét đứt xanh lá", style: "dashed", color: "#16a34a", thickness: 4, dashArray: [10, 5] },
  { id: "dashed-orange", name: "Nét đứt cam", style: "dashed", color: "#ea580c", thickness: 2, dashArray: [6, 3] },
  { id: "dotted-orange", name: "Nét chấm cam", style: "dotted", color: "#ea580c", thickness: 2, dashArray: [2, 3] },
  { id: "double-orange", name: "Đường kép cam", style: "double", color: "#ea580c", thickness: 2 },
];

export function getLinePresetById(id: string): LinePreset | undefined {
  return LINE_PRESETS.find((p) => p.id === id);
}

export function getStrokeDashArray(style: LineStyle, dashArray?: number[]): number[] | undefined {
  if (dashArray && dashArray.length > 0) return dashArray;
  if (style === "dashed") return [8, 4];
  if (style === "dotted") return [2, 4];
  return undefined;
}
