import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-white mb-4">Khám phá</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#faq" className="hover:text-white transition">Câu hỏi thường gặp</Link></li>
              <li><Link href="/#huong-dan" className="hover:text-white transition">Tài liệu hướng dẫn</Link></li>
              <li><Link href="/#blog" className="hover:text-white transition">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Giải pháp & Dịch vụ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#landing-page" className="hover:text-white transition">Landing Page</Link></li>
              <li><Link href="/#website" className="hover:text-white transition">Website Builder</Link></li>
              <li><Link href="/#ecommerce" className="hover:text-white transition">Ecommerce</Link></li>
              <li><Link href="/#automation" className="hover:text-white transition">Automation</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Công ty</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#ve-chung-toi" className="hover:text-white transition">Về chúng tôi</Link></li>
              <li><Link href="/#lien-he" className="hover:text-white transition">Liên hệ</Link></li>
              <li><Link href="/#tuyen-dung" className="hover:text-white transition">Tuyển dụng</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:hotro@pagepeak.vn" className="hover:text-white transition">Email: hotro@pagepeak.vn</a></li>
              <li><span>Hotline: 0972 220 777</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">©{currentYear} All rights reserved PagePeak</p>
          <div className="flex gap-6 text-sm">
            <Link href="/#dieu-khoan" className="hover:text-white transition">Điều khoản sử dụng</Link>
            <Link href="/#bao-mat" className="hover:text-white transition">Chính sách bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
