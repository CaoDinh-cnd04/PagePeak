import type { ReactNode } from "react";
import {
  Globe,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  Calendar,
  Building2,
  Heart,
  UtensilsCrossed,
  Cpu,
  Wrench,
  Filter,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Store,
  Compass,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, ReactNode> = {
  "Tất cả": <Globe className="w-4 h-4" />,
  "Thương mại điện tử": <ShoppingCart className="w-4 h-4" />,
  "Dịch vụ": <Briefcase className="w-4 h-4" />,
  "Giáo dục": <GraduationCap className="w-4 h-4" />,
  "Sự kiện": <Calendar className="w-4 h-4" />,
  "Bất động sản": <Building2 className="w-4 h-4" />,
  "Sức khỏe": <Heart className="w-4 h-4" />,
  "Nhà hàng": <UtensilsCrossed className="w-4 h-4" />,
  "Công nghệ": <Cpu className="w-4 h-4" />,
  "Tiện ích": <Wrench className="w-4 h-4" />,
};

export const DESIGN_TYPES = [
  { value: "", label: "Tất cả" },
  { value: "responsive", label: "Responsive" },
  { value: "popup", label: "Popup" },
];

export const SORT_OPTIONS = [
  { value: "popular", label: "Phổ biến nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "name", label: "Tên A–Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const MAIN_TABS = [
  { id: "all", label: "Giao diện mẫu", icon: <LayoutGrid className="w-4 h-4 shrink-0" /> },
  { id: "featured", label: "Mẫu thiết kế nổi bật", icon: <Sparkles className="w-4 h-4 shrink-0" /> },
  { id: "trending", label: "Phổ biến nhất", icon: <TrendingUp className="w-4 h-4 shrink-0" /> },
] as const;

/** Tab phụ (placeholder — có thể nối route sau) */
export const EXTRA_TABS = [
  { id: "store", label: "Cửa hàng giao diện mẫu", icon: <Store className="w-4 h-4 shrink-0" />, disabled: true },
  { id: "services", label: "Dịch vụ thiết kế", icon: <Compass className="w-4 h-4 shrink-0" />, disabled: true },
] as const;

export { Filter };
