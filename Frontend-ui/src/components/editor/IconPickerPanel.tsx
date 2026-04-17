/**
 * IconPickerPanel — sử dụng Iconify API (https://iconify.design)
 * Miễn phí, không cần auth, 200,000+ icon từ 150+ bộ icon.
 * CORS đã được Iconify kích hoạt sẵn → gọi thẳng từ frontend.
 *
 * Format icon key: "prefix:name" (vd: "mdi:home", "logos:facebook")
 * SVG URL: https://api.iconify.design/{prefix}/{name}.svg?color=...
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

const ICONIFY_API = "https://api.iconify.design";

export function iconifyUrl(key: string, color?: string, size = 32): string {
  const [prefix, ...rest] = key.split(":");
  const name = rest.join(":");
  const params = new URLSearchParams();
  if (color) params.set("color", color);
  params.set("width", String(size));
  params.set("height", String(size));
  return `${ICONIFY_API}/${prefix}/${name}.svg?${params}`;
}

// ─── Danh sách icon tuyển chọn theo tab ─────────────────────────────────

const SOCIAL_ICONS = [
  "logos:facebook", "logos:instagram", "logos:tiktok", "logos:youtube",
  "logos:twitter", "logos:x", "logos:linkedin-icon", "logos:telegram",
  "logos:whatsapp-icon", "logos:messenger", "logos:snapchat", "logos:spotify",
  "logos:pinterest", "logos:skype", "logos:slack", "logos:line",
  "logos:viber", "logos:wechat", "logos:github-icon", "logos:google-icon",
  "logos:apple", "logos:google-play-icon", "logos:twitch", "logos:discord-icon",
  "logos:reddit-icon", "logos:dribbble-icon", "logos:behance-icon",
  "logos:figma", "logos:shopify", "logos:wordpress-icon",
];

const UI_ICONS = [
  "mdi:home", "mdi:star", "mdi:heart", "mdi:magnify", "mdi:email-outline",
  "mdi:phone", "mdi:account-circle", "mdi:cart", "mdi:check-circle",
  "mdi:close-circle", "mdi:bell-outline", "mdi:lock-outline", "mdi:key-variant",
  "mdi:information-outline", "mdi:alert-circle-outline", "mdi:gift-outline",
  "mdi:fire", "mdi:lightning-bolt", "mdi:shield-check", "mdi:trophy-outline",
  "mdi:crown", "mdi:diamond-stone", "mdi:thumb-up-outline", "mdi:camera-outline",
  "mdi:image-outline", "mdi:video-outline", "mdi:music-note", "mdi:map-marker-outline",
  "mdi:clock-outline", "mdi:calendar-outline", "mdi:cog-outline", "mdi:pencil-outline",
  "mdi:delete-outline", "mdi:download-outline", "mdi:upload-outline", "mdi:share-variant",
  "mdi:link-variant", "mdi:open-in-new", "mdi:flag-outline", "mdi:bookmark-outline",
  "mdi:tag-outline", "mdi:filter-outline", "mdi:sort", "mdi:view-grid-outline",
  "mdi:format-list-bulleted", "mdi:chart-bar", "mdi:chart-pie", "mdi:trending-up",
];

const ARROW_ICONS = [
  "mdi:arrow-right", "mdi:arrow-left", "mdi:arrow-up", "mdi:arrow-down",
  "mdi:arrow-right-circle", "mdi:arrow-left-circle", "mdi:arrow-up-circle", "mdi:arrow-down-circle",
  "mdi:arrow-right-bold", "mdi:arrow-left-bold", "mdi:arrow-top-right", "mdi:arrow-bottom-right",
  "mdi:chevron-right", "mdi:chevron-left", "mdi:chevron-up", "mdi:chevron-down",
  "mdi:chevron-double-right", "mdi:chevron-double-left",
  "mdi:play", "mdi:skip-next", "mdi:skip-previous",
  "mdi:arrow-expand", "mdi:arrow-collapse", "mdi:swap-horizontal", "mdi:swap-vertical",
  "mdi:rotate-right", "mdi:refresh", "mdi:undo", "mdi:redo",
  "mdi:unfold-more-horizontal", "mdi:unfold-less-horizontal",
];

const DECO_ICONS = [
  "mdi:star-four-points", "mdi:fleur-de-lis", "mdi:infinity", "mdi:asterisk",
  "mdi:circle-outline", "mdi:square-outline", "mdi:triangle-outline", "mdi:hexagon-outline",
  "mdi:octagram", "mdi:rhombus-outline", "mdi:checkbox-blank-circle-outline",
  "mdi:vector-square", "mdi:vector-triangle", "mdi:vector-circle",
  "emojione:red-heart", "emojione:star", "emojione:fire", "emojione:sparkles",
  "emojione:party-popper", "emojione:trophy", "emojione:crown",
  "emojione:gem-stone", "emojione:lightning", "emojione:100-points-symbol",
  "emojione:check-mark-button", "emojione:cross-mark", "emojione:exclamation-mark",
  "emojione:warning-sign", "emojione:leaf-fluttering-in-wind",
];

const TABS = [
  { id: "social", label: "Xã hội", icons: SOCIAL_ICONS },
  { id: "ui", label: "Giao diện", icons: UI_ICONS },
  { id: "arrows", label: "Mũi tên", icons: ARROW_ICONS },
  { id: "deco", label: "Trang trí", icons: DECO_ICONS },
  { id: "search", label: "🔍 Tìm kiếm", icons: [] },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── IconImg — render 1 icon từ Iconify CDN ──────────────────────────────

function IconImg({ iconKey, size = 28 }: { iconKey: string; size?: number }) {
  const [err, setErr] = useState(false);
  const [prefix, ...rest] = iconKey.split(":");
  const name = rest.join(":");
  if (!prefix || !name) return <span className="text-slate-300 text-xs">?</span>;
  const src = `${ICONIFY_API}/${prefix}/${name}.svg?width=${size}&height=${size}`;
  if (err) return <span className="text-slate-400 text-xs text-center leading-tight">{name.slice(0, 4)}</span>;
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className="block"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function IconPickerPanel({
  onSelect,
  onClose,
  onBack,
}: {
  onSelect: (iconKey: string) => void;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<TabId>("social");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    searchRef.current?.abort();
    searchRef.current = new AbortController();
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${ICONIFY_API}/search?query=${encodeURIComponent(q)}&limit=64`,
        { signal: searchRef.current.signal }
      );
      const data = await res.json() as { icons?: string[] };
      setSearchResults(data.icons ?? []);
    } catch {
      // aborted or error — giữ kết quả cũ
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "search") void doSearch(search);
  }, [tab, search, doSearch]);

  const currentIcons = tab === "search"
    ? searchResults
    : TABS.find((t) => t.id === tab)?.icons ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header với tab */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-2 py-1 text-[10px] font-medium rounded transition ${
              tab === t.id
                ? "bg-[#1e2d7d] text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar (luôn hiện ở tab Search, hoặc ẩn ở tab khác) */}
      {tab === "search" && (
        <div className="p-2 border-b border-slate-100 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
            className="flex gap-1"
          >
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm icon (vd: home, arrow, heart...)"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  // Debounce search khi gõ
                  const v = e.target.value;
                  const timer = setTimeout(() => setSearch(v), 400);
                  return () => clearTimeout(timer);
                }}
                className="w-full pl-6 pr-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-[#1e2d7d]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-2 py-1.5 bg-[#1e2d7d] text-white text-[10px] rounded hover:bg-[#162558] shrink-0"
            >
              Tìm
            </button>
          </form>
          <p className="text-[9px] text-slate-400 mt-1 px-0.5">
            Powered by <a href="https://iconify.design" target="_blank" rel="noreferrer" className="underline">Iconify</a> — 200,000+ icon miễn phí
          </p>
        </div>
      )}

      {/* Icon grid */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {tab === "search" && searchLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[11px]">Đang tìm kiếm...</span>
          </div>
        ) : tab === "search" && search && searchResults.length === 0 ? (
          <p className="text-center text-[11px] text-slate-400 py-8">
            Không tìm thấy icon cho &ldquo;{search}&rdquo;
          </p>
        ) : tab === "search" && !search ? (
          <p className="text-center text-[11px] text-slate-400 py-6">
            Gõ từ khóa để tìm icon từ 200,000+ biểu tượng
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {currentIcons.map((iconKey) => (
              <button
                key={iconKey}
                type="button"
                title={iconKey}
                onClick={() => { onSelect(iconKey); onClose?.(); }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-transparent hover:border-[#1e2d7d] hover:bg-indigo-50 transition gap-0.5"
              >
                <IconImg iconKey={iconKey} size={24} />
                <span className="text-[8px] text-slate-400 truncate w-full text-center leading-tight">
                  {iconKey.split(":")[1]?.slice(0, 8) ?? iconKey.slice(0, 8)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-slate-100 shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-slate-400">
          {tab !== "search" ? `${currentIcons.length} icon` : searchResults.length > 0 ? `${searchResults.length} kết quả` : ""}
        </span>
        {onBack && (
          <button type="button" onClick={onBack} className="text-[10px] text-slate-500 hover:text-slate-700">
            ← Quay lại
          </button>
        )}
      </div>
    </div>
  );
}
