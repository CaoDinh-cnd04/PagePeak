/** Minh họa kiểu LadiPage: thẻ đơn + túi mua sắm */
export function OrdersIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="16" width="304" height="188" rx="14" fill="currentColor" className="text-indigo-50 dark:text-indigo-950/40" />
      <rect x="32" y="44" width="120" height="88" rx="8" fill="white" className="dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-600" strokeWidth="1.5" />
      <rect x="44" y="58" width="72" height="8" rx="2" className="fill-slate-200 dark:fill-slate-700" />
      <rect x="44" y="72" width="56" height="6" rx="2" className="fill-slate-100 dark:fill-slate-800" />
      <rect x="44" y="86" width="88" height="6" rx="2" className="fill-slate-100 dark:fill-slate-800" />
      <circle cx="88" cy="118" r="14" className="fill-[#5e35b1]/20" />
      <path d="M82 118l4 4 8-10" stroke="#5e35b1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="168" y="52" width="120" height="100" rx="10" className="fill-white dark:fill-slate-900 stroke-[#5e35b1]/30" strokeWidth="1.5" />
      <path
        d="M210 72h36c6 0 10 4 10 10v48c0 6-4 10-10 10h-36c-6 0-10-4-10-10V82c0-6 4-10 10-10z"
        className="stroke-[#5e35b1]/50"
        strokeWidth="2"
        fill="none"
      />
      <path d="M200 88h56M200 100h40" stroke="currentColor" className="text-slate-300 dark:text-slate-600" strokeWidth="2" strokeLinecap="round" />
      <circle cx="228" cy="128" r="16" className="fill-[#5e35b1]/15" />
      <path
        d="M220 128l4 4 10-12"
        stroke="#5e35b1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
