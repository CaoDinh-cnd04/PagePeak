import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-primary-600 font-medium mb-4">
              Hàng nghìn khách hàng tin tưởng và đồng hành cùng PagePeak
            </p>
            <h2 className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-6 max-w-3xl mx-auto">
              Thúc đẩy tăng trưởng khách hàng, doanh thu và tối ưu vận hành cho nhà kinh doanh
            </h2>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-8">
              Nền tảng toàn diện cho Marketing & Sales
            </h1>
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-primary-600 text-white text-lg font-medium hover:bg-primary-700 transition shadow-lg"
            >
              Bắt đầu miễn phí ngay
            </Link>
          </div>
        </section>

        {/* Giới thiệu nền tảng */}
        <section id="san-pham" className="py-16 bg-white dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4">
              Một nền tảng vận hành kinh doanh xuyên suốt
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-center max-w-3xl mx-auto mb-12">
              Từ thu hút khách hàng, bán hàng đến vận hành nội bộ — PagePeak giúp doanh nghiệp quản lý trọn vẹn trên một hệ thống duy nhất.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-xl border border-slate-200 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tiếp thị & Bán hàng</h3>
                <p className="text-slate-600 text-sm">
                  Landing Page tối ưu chuyển đổi, trang bán hàng tích hợp thanh toán và Automation nuôi dưỡng lead tự động.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-slate-200 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Quản lý khách hàng</h3>
                <p className="text-slate-600 text-sm">
                  Quản lý khách hàng tập trung, chăm sóc tự động xuyên suốt hành trình và theo dõi doanh thu theo thời gian thực.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-slate-200 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Vận hành tinh gọn</h3>
                <p className="text-slate-600 text-sm">
                  Quản lý công việc theo phòng ban, chuẩn hóa & tự động hóa quy trình và theo dõi hiệu suất vận hành.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sản phẩm chính */}
        <section id="giai-phap" className="py-16 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-12">
              Giải pháp toàn diện cho hành trình tăng trưởng
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Landing Page & Website</h3>
                <ul className="text-slate-600 dark:text-slate-300 text-sm space-y-2 mb-4">
                  <li>• Thiết kế đẹp, kéo thả nhanh, tối ưu mọi thiết bị</li>
                  <li>• Tải trang nhanh, chuẩn SEO</li>
                  <li>• Hàng trăm mẫu Landing Page sẵn sàng</li>
                </ul>
                <Link href="/register" className="text-primary-600 font-medium text-sm hover:underline">
                  Dùng thử miễn phí →
                </Link>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Trang bán hàng trực tuyến</h3>
                <ul className="text-slate-600 dark:text-slate-300 text-sm space-y-2 mb-4">
                  <li>• Đa dạng loại sản phẩm: Vật lý, Sản phẩm số</li>
                  <li>• Đa phương thức thanh toán và vận chuyển</li>
                  <li>• Tạo khuyến mại linh hoạt theo chiến dịch</li>
                </ul>
                <Link href="/register" className="text-primary-600 font-medium text-sm hover:underline">
                  Dùng thử miễn phí →
                </Link>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">CRM & Quản lý khách hàng</h3>
                <ul className="text-slate-600 dark:text-slate-300 text-sm space-y-2 mb-4">
                  <li>• Đồng bộ hành trình khách hàng 360°</li>
                  <li>• Quản lý pipeline bán hàng trực quan</li>
                  <li>• Tự động hóa tác vụ trong quy trình bán hàng</li>
                </ul>
                <Link href="/register" className="text-primary-600 font-medium text-sm hover:underline">
                  Dùng thử miễn phí →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bảng giá - placeholder */}
        <section id="bang-gia" className="py-16 bg-white dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Bảng giá</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-8">
              Chọn gói phù hợp với quy mô và nhu cầu của bạn. Bắt đầu miễn phí, nâng cấp khi cần.
            </p>
            <Link href="/register" className="text-primary-600 font-medium hover:underline">
              Xem bảng giá và đăng ký →
            </Link>
          </div>
        </section>

        {/* Tài nguyên - placeholder */}
        <section id="tai-nguyen" className="py-16 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Tài nguyên</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              Tài liệu hướng dẫn, blog, case study và khoá học để bạn tận dụng tối đa PagePeak.
            </p>
          </div>
        </section>

        {/* Thống kê */}
        <section className="py-16 bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-12">
              Tại sao nên chọn PagePeak?
            </h2>
            <p className="text-center text-primary-100 mb-12 max-w-2xl mx-auto">
              Nền tảng Landing Page hàng đầu, tiên phong Marketing Automation và vận hành Marketing & Sales toàn diện.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-bold">770,000+</p>
                <p className="text-primary-100 text-sm mt-1">Khách hàng sử dụng</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold">5.5M+</p>
                <p className="text-primary-100 text-sm mt-1">Landing page xuất bản</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold">3.2M+</p>
                <p className="text-primary-100 text-sm mt-1">Kịch bản nuôi dưỡng tự động</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold">1.3M+</p>
                <p className="text-primary-100 text-sm mt-1">Trang bán hàng khởi tạo</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA cuối / Liên hệ */}
        <section id="lien-he" className="py-20 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Tăng trưởng khách hàng và doanh thu bền vững cùng PagePeak
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Hợp nhất các tính năng, tiện ích và tài nguyên cần thiết cho hoạt động Tiếp thị - Bán hàng và Vận hành tinh gọn!
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-primary-600 text-white text-lg font-medium hover:bg-primary-700 transition"
            >
              Bắt đầu với tài khoản miễn phí
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
