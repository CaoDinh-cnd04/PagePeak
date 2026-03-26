import { Button } from "@/components/ui/Button";
import { ClipboardCheck, ExternalLink } from "lucide-react";

type Props = {
  onCreate: () => void;
  /** Link hướng dẫn (docs) */
  guideUrl?: string;
};

/** Empty state kiểu LadiPage — card 2 cột: copy + minh họa */
export function FormConfigEmptyState({ onCreate, guideUrl = "https://docs.pagepeak.com" }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center p-8 lg:p-12">
        <div className="min-w-0 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5e35b1]/10 text-[#5e35b1] dark:text-[#c4b5fd] px-3 py-1 text-xs font-semibold">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Cấu hình Form
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Cấu hình Form
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
            Tạo bộ trường dữ liệu dùng chung cho landing page: thêm, sắp xếp và tùy chỉnh nhãn, kiểu nhập, bắt buộc hay không.
            Sau đó gắn cấu hình vào phần tử Form trên trình soạn thảo.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <Button
              type="button"
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-2.5 text-sm font-semibold shadow-sm"
              onClick={onCreate}
            >
              Tạo cấu hình ngay
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hoặc{" "}
              <a
                href={guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Xem hướng dẫn
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <FormConfigIllustration />
        </div>
      </div>
    </div>
  );
}

function FormConfigIllustration() {
  return (
    <div className="relative w-full max-w-[320px] aspect-[4/3] select-none" aria-hidden>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-800 dark:to-slate-900 shadow-inner" />
      <div className="absolute top-4 left-4 right-8 bottom-12 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200/80 dark:border-slate-700 p-3 space-y-2">
        <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600" />
        <div className="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600" />
        <div className="h-16 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600" />
        <div className="h-9 rounded-lg bg-[#2563eb]/90 w-24 mt-1" />
      </div>
      <div className="absolute top-10 right-2 w-[45%] rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-700 p-2 space-y-1.5 opacity-95">
        <div className="flex gap-1">
          <span className="h-6 flex-1 rounded bg-violet-100 dark:bg-violet-900/40" />
          <span className="h-6 w-8 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-5 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-5 rounded bg-slate-100 dark:bg-slate-800 w-4/5" />
      </div>
    </div>
  );
}
