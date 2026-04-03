/** Tag / custom field draft lưu localStorage theo workspace (chờ API máy chủ). */

export type OrderTagDraft = { id: string; name: string; color: string };
export type OrderCustomFieldDraft = { id: string; label: string; type: "text" | "number" | "select" };

function tagsKey(workspaceId: number) {
  return `ladipage_order_tags_${workspaceId}`;
}
function fieldsKey(workspaceId: number) {
  return `ladipage_order_custom_fields_${workspaceId}`;
}

export function loadOrderTags(workspaceId: number): OrderTagDraft[] {
  try {
    const raw = localStorage.getItem(tagsKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is OrderTagDraft =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as OrderTagDraft).id === "string" &&
        typeof (x as OrderTagDraft).name === "string" &&
        typeof (x as OrderTagDraft).color === "string",
    );
  } catch {
    return [];
  }
}

export function saveOrderTags(workspaceId: number, tags: OrderTagDraft[]) {
  localStorage.setItem(tagsKey(workspaceId), JSON.stringify(tags));
}

export function loadOrderCustomFields(workspaceId: number): OrderCustomFieldDraft[] {
  try {
    const raw = localStorage.getItem(fieldsKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is OrderCustomFieldDraft =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as OrderCustomFieldDraft).id === "string" &&
        typeof (x as OrderCustomFieldDraft).label === "string" &&
        ["text", "number", "select"].includes((x as OrderCustomFieldDraft).type),
    );
  } catch {
    return [];
  }
}

export function saveOrderCustomFields(workspaceId: number, fields: OrderCustomFieldDraft[]) {
  localStorage.setItem(fieldsKey(workspaceId), JSON.stringify(fields));
}
