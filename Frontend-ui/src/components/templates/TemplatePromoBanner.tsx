import { Sparkles } from "lucide-react";

type Props = {
  templateCount: number;
  categoryCount: number;
};

export function TemplatePromoBanner({ templateCount, categoryCount }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
      <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-500 rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-primary-900/10">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold">PagePeak Template Store</h2>
            <p className="text-white/80 text-sm">Ưu đãi ra mắt: Tất cả template miễn phí!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[100px]">
            <div className="text-xs text-white/70">Template miễn phí</div>
            <div className="text-xl font-bold">{templateCount}+</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[100px]">
            <div className="text-xs text-white/70">Danh mục</div>
            <div className="text-xl font-bold">{categoryCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
