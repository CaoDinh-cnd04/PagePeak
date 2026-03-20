/** Icon data for IconPickerPanel - social symbols, icon codes, arrows, patterns */

export type IconCategory = "socials" | "icons" | "arrows" | "pattern";

export type IconItem = {
  id: string;
  name: string;
  category: IconCategory;
  char: string;
  color?: string;
};

export const ICON_CATEGORIES: { id: IconCategory; label: string }[] = [
  { id: "socials", label: "SOCIALS" },
  { id: "icons", label: "ICONS" },
  { id: "arrows", label: "ARROWS" },
  { id: "pattern", label: "PATTERN" },
];

export const ICON_DATA: IconItem[] = [
  // SOCIALS - brand colors
  { id: "facebook", name: "Facebook", category: "socials", char: "f", color: "#1877f2" },
  { id: "instagram", name: "Instagram", category: "socials", char: "📷", color: "#e4405f" },
  { id: "line", name: "Line", category: "socials", char: "L", color: "#00b900" },
  { id: "linkedin", name: "LinkedIn", category: "socials", char: "in", color: "#0a66c2" },
  { id: "messenger", name: "Messenger", category: "socials", char: "💬", color: "#0084ff" },
  { id: "pinterest", name: "Pinterest", category: "socials", char: "P", color: "#bd081c" },
  { id: "skype", name: "Skype", category: "socials", char: "S", color: "#00aff0" },
  { id: "slack", name: "Slack", category: "socials", char: "#", color: "#4a154b" },
  { id: "snapchat", name: "Snapchat", category: "socials", char: "👻", color: "#fffc00" },
  { id: "spotify", name: "Spotify", category: "socials", char: "♪", color: "#1db954" },
  { id: "telegram", name: "Telegram", category: "socials", char: "✈", color: "#26a5e4" },
  { id: "tiktok", name: "TikTok", category: "socials", char: "♪", color: "#000000" },
  { id: "twitter", name: "X (Twitter)", category: "socials", char: "𝕏", color: "#000000" },
  { id: "viber", name: "Viber", category: "socials", char: "V", color: "#7360f2" },
  { id: "vimeo", name: "Vimeo", category: "socials", char: "V", color: "#1ab7ea" },
  { id: "wechat", name: "WeChat", category: "socials", char: "💬", color: "#09b83e" },
  { id: "weibo", name: "Weibo", category: "socials", char: "微", color: "#e6162d" },
  { id: "whatsapp", name: "WhatsApp", category: "socials", char: "✓", color: "#25d366" },
  { id: "youtube", name: "YouTube", category: "socials", char: "▶", color: "#ff0000" },
  { id: "zalo", name: "Zalo", category: "socials", char: "Z", color: "#0068ff" },
  // ICONS - generic
  { id: "star", name: "Ngôi sao", category: "icons", char: "★", color: "#f59e0b" },
  { id: "star-outline", name: "Sao viền", category: "icons", char: "☆", color: "#64748b" },
  { id: "heart", name: "Trái tim", category: "icons", char: "❤", color: "#ef4444" },
  { id: "search", name: "Tìm kiếm", category: "icons", char: "🔍", color: "#64748b" },
  { id: "mail", name: "Thư", category: "icons", char: "✉", color: "#64748b" },
  { id: "user", name: "Người dùng", category: "icons", char: "👤", color: "#64748b" },
  { id: "film", name: "Phim", category: "icons", char: "🎬", color: "#64748b" },
  { id: "grid-2", name: "Lưới 2x2", category: "icons", char: "⊞", color: "#64748b" },
  { id: "grid-3", name: "Lưới 3x3", category: "icons", char: "▦", color: "#64748b" },
  { id: "list", name: "Danh sách", category: "icons", char: "☰", color: "#64748b" },
  { id: "check", name: "Dấu tick", category: "icons", char: "✓", color: "#16a34a" },
  { id: "x", name: "Đóng", category: "icons", char: "✕", color: "#64748b" },
  { id: "zoom-in", name: "Phóng to", category: "icons", char: "⊕", color: "#64748b" },
  { id: "zoom-out", name: "Thu nhỏ", category: "icons", char: "⊖", color: "#64748b" },
  { id: "power", name: "Nguồn", category: "icons", char: "⏻", color: "#64748b" },
  { id: "bar-chart", name: "Biểu đồ", category: "icons", char: "▬", color: "#64748b" },
  { id: "settings", name: "Cài đặt", category: "icons", char: "⚙", color: "#64748b" },
  { id: "trash", name: "Xóa", category: "icons", char: "🗑", color: "#ef4444" },
  { id: "home", name: "Trang chủ", category: "icons", char: "⌂", color: "#64748b" },
  { id: "wine", name: "Ly rượu", category: "icons", char: "🍷", color: "#64748b" },
  { id: "music", name: "Âm nhạc", category: "icons", char: "♪", color: "#64748b" },
  { id: "info", name: "Thông tin", category: "icons", char: "ℹ", color: "#3b82f6" },
  { id: "warning", name: "Cảnh báo", category: "icons", char: "⚠", color: "#eab308" },
  // ARROWS
  { id: "arrow-right", name: "Mũi tên phải", category: "arrows", char: "→", color: "#64748b" },
  { id: "arrow-left", name: "Mũi tên trái", category: "arrows", char: "←", color: "#64748b" },
  { id: "arrow-up", name: "Mũi tên lên", category: "arrows", char: "↑", color: "#64748b" },
  { id: "arrow-down", name: "Mũi tên xuống", category: "arrows", char: "↓", color: "#64748b" },
  { id: "arrow-ne", name: "Mũi tên chéo", category: "arrows", char: "↗", color: "#64748b" },
  { id: "arrow-nw", name: "Mũi tên chéo", category: "arrows", char: "↖", color: "#64748b" },
  { id: "arrow-se", name: "Mũi tên chéo", category: "arrows", char: "↘", color: "#64748b" },
  { id: "arrow-sw", name: "Mũi tên chéo", category: "arrows", char: "↙", color: "#64748b" },
  { id: "chevron-right", name: "Chevron phải", category: "arrows", char: "›", color: "#64748b" },
  { id: "chevron-left", name: "Chevron trái", category: "arrows", char: "‹", color: "#64748b" },
  { id: "chevron-up", name: "Chevron lên", category: "arrows", char: "˄", color: "#64748b" },
  { id: "chevron-down", name: "Chevron xuống", category: "arrows", char: "˅", color: "#64748b" },
  // PATTERN
  { id: "circle", name: "Hình tròn", category: "pattern", char: "●", color: "#64748b" },
  { id: "square", name: "Hình vuông", category: "pattern", char: "■", color: "#64748b" },
  { id: "triangle", name: "Tam giác", category: "pattern", char: "▲", color: "#64748b" },
  { id: "diamond", name: "Kim cương", category: "pattern", char: "◆", color: "#64748b" },
  { id: "dot", name: "Chấm tròn", category: "pattern", char: "•", color: "#64748b" },
  { id: "line-h", name: "Đường ngang", category: "pattern", char: "─", color: "#64748b" },
  { id: "line-v", name: "Đường dọc", category: "pattern", char: "│", color: "#64748b" },
  { id: "plus", name: "Dấu cộng", category: "pattern", char: "+", color: "#64748b" },
  { id: "minus", name: "Dấu trừ", category: "pattern", char: "−", color: "#64748b" },
];

export function getIconById(id: string): IconItem | undefined {
  return ICON_DATA.find((i) => i.id === id);
}

export function getIconsByCategory(category: IconCategory): IconItem[] {
  return ICON_DATA.filter((i) => i.category === category);
}

export function searchIcons(query: string): IconItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_DATA;
  return ICON_DATA.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.char.toLowerCase().includes(q)
  );
}
