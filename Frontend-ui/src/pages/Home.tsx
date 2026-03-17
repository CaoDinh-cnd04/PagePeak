import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PricingSection } from "@/components/home/PricingSection";

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
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
              to="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-primary-600 text-white text-lg font-medium hover:bg-primary-700 transition shadow-lg"
            >
              Bắt đầu miễn phí ngay
            </Link>
          </div>
        </section>

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

        <section id="giai-phap" className="py-16 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-12">
              Giải pháp toàn diện cho hành trình tăng trưởng
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Landing Page & Website", items: ["Thiết kế đẹp, kéo thả nhanh, tối ưu mọi thiết bị", "Tải trang nhanh, chuẩn SEO", "Hàng trăm mẫu Landing Page sẵn sàng"] },
                { title: "Trang bán hàng trực tuyến", items: ["Đa dạng loại sản phẩm: Vật lý, Sản phẩm số", "Đa phương thức thanh toán và vận chuyển", "Tạo khuyến mại linh hoạt theo chiến dịch"] },
                { title: "CRM & Quản lý khách hàng", items: ["Đồng bộ hành trình khách hàng 360°", "Quản lý pipeline bán hàng trực quan", "Tự động hóa tác vụ trong quy trình bán hàng"] },
              ].map((s) => (
                <div key={s.title} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">{s.title}</h3>
                  <ul className="text-slate-600 dark:text-slate-300 text-sm space-y-2 mb-4">
                    {s.items.map((i) => (
                      <li key={i}>• {i}</li>
                    ))}
                  </ul>
                  <Link to="/register" className="text-primary-600 font-medium text-sm hover:underline">
                    Dùng thử miễn phí →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        <section id="tai-nguyen" className="py-16 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4">Tài nguyên</h2>
            <p className="text-slate-600 dark:text-slate-300 text-center max-w-xl mx-auto mb-12">
              Tài liệu hướng dẫn, blog, case study và khoá học để bạn tận dụng tối đa PagePeak.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "📖", title: "Tài liệu hướng dẫn", desc: "Hướng dẫn sử dụng chi tiết từ cơ bản đến nâng cao.", color: "indigo" },
                { icon: "📝", title: "Blog", desc: "Bài viết chia sẻ kinh nghiệm, thủ thuật và xu hướng mới.", color: "emerald" },
                { icon: "🏆", title: "Case Study", desc: "Câu chuyện thành công từ khách hàng sử dụng PagePeak.", color: "amber" },
                { icon: "🎓", title: "Khóa học", desc: "Khóa học miễn phí giúp bạn làm chủ PagePeak nhanh chóng.", color: "violet" },
              ].map((r) => (
                <div key={r.title} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition`}>
                  <div className={`w-12 h-12 rounded-xl bg-${r.color}-50 dark:bg-${r.color}-500/10 flex items-center justify-center text-2xl mb-4`}>
                    {r.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{r.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{r.desc}</p>
                  <Link to="/dashboard/templates" className={`text-${r.color}-600 dark:text-${r.color}-400 text-sm font-medium hover:underline`}>Xem ngay →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-12">Tại sao nên chọn PagePeak?</h2>
            <p className="text-center text-primary-100 mb-12 max-w-2xl mx-auto">
              Nền tảng Landing Page hàng đầu, tiên phong Marketing Automation và vận hành Marketing & Sales toàn diện.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div><p className="text-3xl sm:text-4xl font-bold">770,000+</p><p className="text-primary-100 text-sm mt-1">Khách hàng sử dụng</p></div>
              <div><p className="text-3xl sm:text-4xl font-bold">5.5M+</p><p className="text-primary-100 text-sm mt-1">Landing page xuất bản</p></div>
              <div><p className="text-3xl sm:text-4xl font-bold">3.2M+</p><p className="text-primary-100 text-sm mt-1">Kịch bản nuôi dưỡng tự động</p></div>
              <div><p className="text-3xl sm:text-4xl font-bold">1.3M+</p><p className="text-primary-100 text-sm mt-1">Trang bán hàng khởi tạo</p></div>
            </div>
          </div>
        </section>

        <section id="lien-he" className="py-20 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Tăng trưởng khách hàng và doanh thu bền vững cùng PagePeak
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Hợp nhất các tính năng, tiện ích và tài nguyên cần thiết cho hoạt động Tiếp thị - Bán hàng và Vận hành tinh gọn!
            </p>
            <Link
              to="/register"
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
