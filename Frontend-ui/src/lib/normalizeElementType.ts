import type { EditorElementType, EditorSection, ToolCategoryData } from "@/types/editor";

/**
 * Chuẩn hóa type phần tử (API / dữ liệu cũ / lỗi chữ hoa) để khớp switch trong FabricCanvas & defaults trong store.
 */
export function normalizeElementType(raw: string | undefined | null): EditorElementType {
  let t = (raw ?? "text").trim().toLowerCase();
  if (!t) t = "text";
  if (t === "product-list") return "collection-list";
  return t as EditorElementType;
}

/** Gán type chuẩn cho mọi phần tử khi load JSON (hỗ trợ `Type` PascalCase từ một số API). */
export function normalizeSectionsElementTypes(sections: EditorSection[]): EditorSection[] {
  return sections.map((s) => ({
    ...s,
    elements: (s.elements ?? []).map((e) => {
      const raw = (e as { type?: string; Type?: string }).type ?? (e as { Type?: string }).Type;
      // sectionId có thể trả về dạng PascalCase từ API .NET → chuẩn hóa về camelCase
      const ee = e as { sectionId?: number; SectionId?: number };
      const resolvedSectionId = Number(ee.sectionId ?? ee.SectionId ?? s.id ?? 0);
      return { ...e, type: normalizeElementType(typeof raw === "string" ? raw : undefined), sectionId: resolvedSectionId };
    }),
  }));
}

/** Chuẩn hóa elementType từ API editor-tools (alias cũ / lỗi gõ). */
export function normalizeToolCategories(cats: ToolCategoryData[]): ToolCategoryData[] {
  return cats.map((c) => ({
    ...c,
    items: c.items.map((i) => ({
      ...i,
      elementType: normalizeElementType(i.elementType) as string,
    })),
  }));
}
