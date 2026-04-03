/** Minh họa kiểu LadiPage: modal tạo domain + bảng danh sách */
export function DomainsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="12" width="384" height="236" rx="12" fill="currentColor" className="text-slate-100 dark:text-slate-800/80" />
      <rect
        x="24"
        y="28"
        width="168"
        height="132"
        rx="8"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-white dark:text-slate-900 stroke-slate-200 dark:stroke-slate-700"
      />
      <text x="36" y="52" className="fill-slate-500 dark:fill-slate-400" style={{ fontSize: 10, fontWeight: 600 }}>
        Tạo tên miền
      </text>
      <rect
        x="36"
        y="62"
        width="144"
        height="22"
        rx="4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        className="text-slate-50 dark:text-slate-800 stroke-slate-200 dark:stroke-slate-600"
      />
      <text x="44" y="77" className="fill-slate-400" style={{ fontSize: 8 }}>
        Nền tảng
      </text>
      <rect
        x="36"
        y="92"
        width="144"
        height="22"
        rx="4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        className="text-slate-50 dark:text-slate-800 stroke-slate-200 dark:stroke-slate-600"
      />
      <text x="44" y="107" className="fill-slate-400" style={{ fontSize: 8 }}>
        Tên miền
      </text>
      <rect x="36" y="124" width="72" height="24" rx="6" fill="currentColor" className="text-primary-500" />
      <text x="54" y="140" fill="white" style={{ fontSize: 9, fontWeight: 600 }}>
        Tạo
      </text>
      <rect
        x="208"
        y="28"
        width="168"
        height="196"
        rx="8"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-white dark:text-slate-900 stroke-slate-200 dark:stroke-slate-700"
      />
      <text x="220" y="52" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: 10, fontWeight: 600 }}>
        Danh sách
      </text>
      <line x1="220" y1="62" x2="368" y2="62" stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
      <text x="228" y="80" className="fill-slate-400" style={{ fontSize: 8 }}>
        Tên miền
      </text>
      <text x="300" y="80" className="fill-slate-400" style={{ fontSize: 8 }}>
        Trạng thái
      </text>
      <rect x="220" y="88" width="136" height="28" rx="4" fill="currentColor" className="text-slate-50 dark:text-slate-800/90" />
      <text x="228" y="105" className="fill-slate-700 dark:fill-slate-200" style={{ fontSize: 9 }}>
        landingpage.com.vn
      </text>
      <circle cx="318" cy="102" r="4" fill="#22c55e" />
      <rect x="220" y="124" width="136" height="28" rx="4" fill="currentColor" className="text-slate-50 dark:text-slate-800/90" />
      <text x="228" y="141" className="fill-slate-700 dark:fill-slate-200" style={{ fontSize: 9 }}>
        shop.brand.vn
      </text>
      <circle cx="318" cy="138" r="4" fill="#22c55e" />
      <rect x="220" y="160" width="136" height="28" rx="4" fill="currentColor" className="text-slate-50 dark:text-slate-800/90" />
      <text x="228" y="177" className="fill-slate-700 dark:fill-slate-200" style={{ fontSize: 9 }}>
        promo.site.com
      </text>
      <circle cx="318" cy="174" r="4" fill="#eab308" />
    </svg>
  );
}
