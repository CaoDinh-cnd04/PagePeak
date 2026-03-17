import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <img
              src="/logo.jpg"
              alt="PagePeak"
              className="h-9 w-9 object-contain rounded"
              style={{ width: "2.25rem", height: "2.25rem" }}
            />
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="text-slate-900 dark:text-slate-100">Page</span>
              <span className="text-primary-600">Peak</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/#san-pham"
              className="text-sm font-semibold text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500/25 transition"
            >
              Sản phẩm
            </Link>
            <Link
              to="/#giai-phap"
              className="text-sm font-semibold text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500/25 transition"
            >
              Giải pháp
            </Link>
            <Link
              to="/#bang-gia"
              className="text-sm font-semibold text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500/25 transition"
            >
              Bảng giá
            </Link>
            <Link
              to="/#tai-nguyen"
              className="text-sm font-semibold text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500/25 transition"
            >
              Tài nguyên
            </Link>
            <Link
              to="/#lien-he"
              className="text-sm font-semibold text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500/25 transition"
            >
              Đặt lịch tư vấn
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 transition"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
