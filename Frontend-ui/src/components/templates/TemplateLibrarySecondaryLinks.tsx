import { Link } from "react-router-dom";
import { Compass, PlayCircle, BookOpen, Heart } from "lucide-react";

type Props = {
  onExploreMarketplace: () => void;
};

export function TemplateLibrarySecondaryLinks({ onExploreMarketplace }: Props) {
  return (
    <div className="bg-slate-900/80 border-b border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400" aria-label="Liên kết nhanh">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 hover:text-primary-300 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Hướng dẫn nhanh
          </Link>
          <span className="hidden sm:inline text-slate-600">|</span>
          <Link
            to="/dashboard/media"
            className="inline-flex items-center gap-1 hover:text-primary-300 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Thư viện media
          </Link>
          <span className="hidden sm:inline text-slate-600">|</span>
          <Link
            to="/dashboard/pages"
            className="inline-flex items-center gap-1 hover:text-primary-300 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            Trang của tôi
          </Link>
        </nav>
        <button
          type="button"
          onClick={onExploreMarketplace}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-white text-xs font-semibold px-4 py-2 shadow-sm shadow-primary-900/30 transition-colors shrink-0"
        >
          <Compass className="w-4 h-4" />
          Khám phá Marketplace
        </button>
      </div>
    </div>
  );
}
