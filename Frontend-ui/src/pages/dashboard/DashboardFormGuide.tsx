import { Link } from "react-router-dom";
import {
  ChevronLeft,
  FileText,
  Link2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Settings2,
  Webhook,
  Mail,
  MousePointerClick,
  PlusCircle,
  Eye,
  Save,
} from "lucide-react";

function GoogleFormsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="8" fill="#6741D9" />
      <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
      <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="27" width="11" height="2.2" rx="1.1" fill="#6741D9" />
    </svg>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#5e35b1] text-white text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-[#5e35b1]">{icon}</span>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{children}</h2>
    </div>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "tip" | "warn";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200",
    warn: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
  };
  const icons = {
    info: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
    tip: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
    warn: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[type]}`}>
      {icons[type]}
      <span>{children}</span>
    </div>
  );
}

export function DashboardFormGuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* Back */}
      <div>
        <Link
          to="/dashboard/forms"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#5e35b1] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại Cấu hình Form
        </Link>
      </div>

      {/* Page header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#5e35b1]/10 text-[#5e35b1] px-3 py-1 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          Hướng dẫn sử dụng
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Hướng dẫn Cấu hình Form
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
          Hướng dẫn chi tiết hai cách thu thập dữ liệu khách hàng từ landing page: tự tạo trường
          hoặc liên kết Google Form.
        </p>
      </div>

      {/* TOC */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Nội dung
        </p>
        <ol className="space-y-1.5 text-sm">
          <li>
            <a href="#overview" className="flex items-center gap-2 text-[#5e35b1] hover:underline font-medium">
              <span className="text-slate-400 text-xs w-4">1.</span> Tổng quan — Chọn cách nào?
            </a>
          </li>
          <li>
            <a href="#custom" className="flex items-center gap-2 text-[#5e35b1] hover:underline font-medium">
              <span className="text-slate-400 text-xs w-4">2.</span> Cách 1: Tự tạo cấu hình trường
            </a>
          </li>
          <li>
            <a href="#google" className="flex items-center gap-2 text-[#5e35b1] hover:underline font-medium">
              <span className="text-slate-400 text-xs w-4">3.</span> Cách 2: Liên kết Google Form
            </a>
          </li>
          <li>
            <a href="#advanced" className="flex items-center gap-2 text-[#5e35b1] hover:underline font-medium">
              <span className="text-slate-400 text-xs w-4">4.</span> Cài đặt nâng cao (Webhook & Email)
            </a>
          </li>
          <li>
            <a href="#faq" className="flex items-center gap-2 text-[#5e35b1] hover:underline font-medium">
              <span className="text-slate-400 text-xs w-4">5.</span> Câu hỏi thường gặp
            </a>
          </li>
        </ol>
      </div>

      {/* ── 1. Tổng quan ── */}
      <section id="overview" className="scroll-mt-8 space-y-4">
        <SectionTitle icon={<BookOpen className="w-5 h-5" />}>
          1. Tổng quan — Chọn cách nào?
        </SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Hệ thống hỗ trợ hai cách thu thập dữ liệu khách hàng qua form trên landing page. Mỗi
          cách phù hợp với nhu cầu khác nhau:
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-[#5e35b1]/20 bg-[#5e35b1]/3 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#5e35b1]" />
              <span className="font-bold text-slate-900 dark:text-slate-100">Tự tạo cấu hình</span>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              {[
                "Kiểm soát hoàn toàn các trường dữ liệu",
                "Dữ liệu lưu vào Data Leads của hệ thống",
                "Nhận thông báo email & webhook",
                "Không cần tài khoản Google",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5e35b1] shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#6741D9]/20 bg-[#6741D9]/3 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GoogleFormsIcon size={20} />
              <span className="font-bold text-slate-900 dark:text-slate-100">Liên kết Google Form</span>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              {[
                "Tái sử dụng Google Form đã có sẵn",
                "Dữ liệu lưu thẳng vào Google Sheets",
                "Không cần cấu hình backend",
                "Phù hợp team đang dùng Google Workspace",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#6741D9] shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── 2. Tự tạo cấu hình ── */}
      <section id="custom" className="scroll-mt-8 space-y-5">
        <SectionTitle icon={<FileText className="w-5 h-5" />}>
          2. Cách 1: Tự tạo cấu hình trường
        </SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Phương pháp này cho phép bạn định nghĩa chính xác các trường nhập liệu mà khách hàng
          sẽ điền. Dữ liệu được lưu trực tiếp vào{" "}
          <Link to="/dashboard/data-leads" className="text-[#5e35b1] underline">
            Data Leads
          </Link>{" "}
          của hệ thống.
        </p>

        <div className="space-y-4">
          {/* Bước 1 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={1} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#5e35b1]" />
                Nhấn &quot;Tạo cấu hình mới&quot; → chọn &quot;Tự tạo cấu hình&quot;
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Trên trang Cấu hình Form, nhấn nút <strong>Tạo cấu hình mới</strong> ở góc phải
                trên. Cửa sổ chọn kiểu sẽ hiện ra — chọn <strong>Tự tạo cấu hình</strong>.
              </p>
            </div>
          </div>

          {/* Bước 2 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={2} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#5e35b1]" />
                Đặt tên cho cấu hình
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nhập tên dễ nhớ ở ô <strong>Tên cấu hình form</strong> (ví dụ:{" "}
                <em>&quot;Form đăng ký tư vấn&quot;</em>,{" "}
                <em>&quot;Form nhận báo giá&quot;</em>…). Tên này chỉ hiển thị trong hệ thống
                quản trị, không hiện với khách hàng.
              </p>
            </div>
          </div>

          {/* Bước 3 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={3} />
            <div className="space-y-2 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#5e35b1]" />
                Thêm các trường nhập liệu
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Trong mục <strong>Trường dữ liệu</strong>, nhấn vào một trong các nút loại trường
                để thêm:
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: "Một dòng", color: "text-blue-700 bg-blue-50 border-blue-200" },
                  { label: "Email", color: "text-violet-700 bg-violet-50 border-violet-200" },
                  { label: "Điện thoại", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { label: "Nhiều dòng", color: "text-orange-700 bg-orange-50 border-orange-200" },
                  { label: "Dropdown", color: "text-amber-700 bg-amber-50 border-amber-200" },
                  { label: "Checkbox", color: "text-teal-700 bg-teal-50 border-teal-200" },
                ].map((t) => (
                  <span
                    key={t.label}
                    className={`px-2.5 py-1 rounded-lg border font-medium ${t.color}`}
                  >
                    + {t.label}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nhấn vào từng trường trong danh sách bên trái để chỉnh sửa{" "}
                <strong>Nhãn hiển thị</strong>, <strong>Placeholder</strong>, và bật{" "}
                <strong>Bắt buộc nhập</strong> nếu cần.
              </p>
            </div>
          </div>

          {/* Bước 4 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={4} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#5e35b1]" />
                Kiểm tra &quot;Xem trước&quot;
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Phần <strong>Xem trước</strong> bên phải hiển thị form sẽ trông như thế nào
                trên landing page. Bạn có thể kéo thả sắp xếp lại thứ tự trường bằng nút
                ▲ ▼ hoặc xóa trường không cần thiết.
              </p>
            </div>
          </div>

          {/* Bước 5 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={5} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Save className="w-4 h-4 text-[#5e35b1]" />
                Lưu và gắn vào landing page
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nhấn <strong>Lưu cấu hình</strong>. Sau đó vào trình soạn thảo landing page,
                chọn phần tử <strong>Form</strong>, ở thanh thuộc tính bên phải chọn cấu hình
                vừa tạo từ danh sách.
              </p>
            </div>
          </div>
        </div>

        <Callout type="tip">
          <span>
            <strong>Mẹo:</strong> Tên field (name) được dùng làm key trong dữ liệu gửi về. Đặt
            tên ngắn gọn, không dấu, không khoảng trắng (ví dụ: <code>ho_ten</code>,{" "}
            <code>email</code>, <code>so_dien_thoai</code>).
          </span>
        </Callout>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── 3. Liên kết Google Form ── */}
      <section id="google" className="scroll-mt-8 space-y-5">
        <SectionTitle icon={<GoogleFormsIcon size={22} />}>
          3. Cách 2: Liên kết Google Form
        </SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Nếu bạn đã có Google Form sẵn, hệ thống cho phép đồng bộ và nhúng trực tiếp vào
          landing page mà không cần tạo lại các trường.
        </p>

        {/* Chuẩn bị */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Cần chuẩn bị trước
          </p>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">•</span>
              Tài khoản Google và quyền chỉnh sửa Google Form.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">•</span>
              Google Form phải được thiết lập ở chế độ{" "}
              <strong>Không yêu cầu đăng nhập</strong> (Responses → không chọn "Limit to 1
              response").
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">•</span>
              Lấy URL submit của form:{" "}
              <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                https://docs.google.com/forms/d/e/FORM_ID/formResponse
              </code>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          {/* Bước 1 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={1} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#6741D9]" />
                Lấy URL của Google Form
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mở Google Form của bạn. Nhấn vào nút <strong>Gửi</strong> (Send) ở góc phải
                trên → chọn biểu tượng <strong>liên kết</strong> (🔗). Copy toàn bộ URL.
              </p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                https://docs.google.com/forms/d/e/<span className="text-[#6741D9]">1FAIpQL...</span>/viewform
              </div>
            </div>
          </div>

          {/* Bước 2 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={2} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#6741D9]" />
                Tạo cấu hình liên kết
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Trên trang Cấu hình Form, nhấn <strong>Tạo cấu hình mới</strong> → chọn{" "}
                <strong>Liên kết Google Form</strong>. Hoặc nhấn thẳng vào nút{" "}
                <strong>Liên kết Google Form</strong> màu tím trong thanh tiêu đề.
              </p>
            </div>
          </div>

          {/* Bước 3 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={3} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Điền thông tin và đồng bộ
              </p>
              <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#6741D9] font-bold shrink-0">①</span>
                  <span>
                    <strong>Tên cấu hình form:</strong> đặt tên dễ nhớ (ví dụ: "Form đăng ký — GG").
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6741D9] font-bold shrink-0">②</span>
                  <span>
                    <strong>Tên tài khoản liên kết:</strong> nhập tên tài khoản Google hoặc alias
                    bạn muốn gắn nhãn (dùng để quản lý, không ảnh hưởng kỹ thuật).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6741D9] font-bold shrink-0">③</span>
                  <span>
                    <strong>API URL:</strong> dán URL Google Form vừa copy. Nhấn{" "}
                    <strong>Đồng bộ</strong> để hệ thống kết nối.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bước 4 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={4} />
            <div className="space-y-2 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Cấu hình mapping trường
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mỗi hàng là một trường dữ liệu. Cột trái là tên trường trên landing page,
                cột phải là trường tương ứng trên Google Form (entry ID).
              </p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                    Tên trường landing page
                  </span>
                  <span className="text-slate-300">↔</span>
                  <span className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">
                    entry.XXXXXXXXX (Google Form)
                  </span>
                </div>
                <p className="text-slate-400 dark:text-slate-500">
                  Để lấy entry ID: mở Google Form → nhấp chuột phải vào trường → Inspect →
                  tìm thuộc tính <code>name=&quot;entry.XXXXXXX&quot;</code>
                </p>
              </div>
            </div>
          </div>

          {/* Bước 5 */}
          <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <StepBadge n={5} />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Save className="w-4 h-4 text-[#6741D9]" />
                Lưu lại và gắn vào landing page
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nhấn <strong>Lưu lại</strong>. Card form sẽ hiển thị badge{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#6741D9]/10 text-[#6741D9] text-xs font-medium">
                  Google Forms
                </span>{" "}
                và số trường đã mapping. Vào editor landing page → chọn phần tử Form → chọn
                cấu hình này ở thanh thuộc tính.
              </p>
            </div>
          </div>
        </div>

        <Callout type="info">
          Dữ liệu khi submit sẽ được gửi thẳng đến Google Sheets gắn với Google Form của bạn.
          Hệ thống không lưu lại dữ liệu này vào Data Leads.
        </Callout>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── 4. Cài đặt nâng cao ── */}
      <section id="advanced" className="scroll-mt-8 space-y-5">
        <SectionTitle icon={<Settings2 className="w-5 h-5" />}>
          4. Cài đặt nâng cao
        </SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Các tính năng này chỉ áp dụng cho phương pháp <strong>Tự tạo cấu hình</strong>.
          Mở mục <strong>Cài đặt nâng cao</strong> trong cửa sổ tạo/chỉnh sửa form để thấy.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
              <Webhook className="w-4 h-4" />
              Webhook URL
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mỗi khi có lead mới, hệ thống sẽ gửi POST request với dữ liệu form đến URL này.
              Tích hợp dễ dàng với Zapier, Make (Integromat), n8n, hoặc backend tự xây.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dùng nút <strong>Thử webhook</strong> trên card để kiểm tra kết nối.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
              <Mail className="w-4 h-4" />
              Email thông báo
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bật tuỳ chọn này để nhận email mỗi khi có lead mới gửi form. Email gửi đến
              địa chỉ của chủ workspace.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Yêu cầu cấu hình SMTP trên server (<code>Email:Smtp*</code>).
            </p>
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── 5. FAQ ── */}
      <section id="faq" className="scroll-mt-8 space-y-4">
        <SectionTitle icon={<AlertCircle className="w-5 h-5" />}>
          5. Câu hỏi thường gặp
        </SectionTitle>

        {[
          {
            q: "Một landing page có thể dùng nhiều cấu hình form không?",
            a: "Mỗi phần tử Form trên landing page chỉ được gắn một cấu hình tại một thời điểm. Tuy nhiên, bạn có thể tạo nhiều phần tử Form trên cùng một trang, mỗi phần tử dùng cấu hình riêng.",
          },
          {
            q: "Xóa cấu hình form có mất dữ liệu Data Leads không?",
            a: "Không. Dữ liệu Data Leads đã thu thập được lưu độc lập. Xóa cấu hình form chỉ ảnh hưởng đến việc form trên editor không còn tham chiếu — bạn cần chọn lại cấu hình mới cho phần tử đó.",
          },
          {
            q: "Tôi có thể đổi từ 'Tự tạo' sang 'Google Form' sau khi đã tạo không?",
            a: "Có. Mở cấu hình và nhấn nút 'Liên kết Google Form' trên card. Cấu hình sẽ được cập nhật sang dạng Google Form. Tuy nhiên dữ liệu cũ trong Data Leads vẫn giữ nguyên.",
          },
          {
            q: "Google Form không hiển thị trên landing page?",
            a: "Kiểm tra: (1) URL Google Form đúng định dạng viewform, (2) Form ở chế độ công khai (không yêu cầu đăng nhập), (3) Trình duyệt không chặn iframe từ Google. Thử mở URL trực tiếp để xác nhận form hoạt động.",
          },
          {
            q: "Entry ID của Google Form là gì và lấy ở đâu?",
            a: "Entry ID là mã định danh của từng trường trong Google Form, có dạng entry.XXXXXXXXX. Để lấy: mở Google Form trên trình duyệt, nhấp chuột phải vào ô nhập → Inspect Element → tìm thuộc tính name trong thẻ input/textarea.",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="text-[#5e35b1] font-bold text-sm shrink-0 mt-0.5">Q.</span>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.q}</p>
            </div>
            <div className="px-4 pb-4 flex items-start gap-3">
              <span className="text-slate-400 font-bold text-sm shrink-0 mt-0.5">A.</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-[#5e35b1]/8 to-[#6741D9]/5 border border-[#5e35b1]/15 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100">Sẵn sàng tạo form đầu tiên?</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quay lại trang Cấu hình Form và bắt đầu thu thập lead ngay hôm nay.
          </p>
        </div>
        <Link
          to="/dashboard/forms"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5e35b1] hover:bg-[#4e2d9e] text-white text-sm font-semibold transition shrink-0"
        >
          <MousePointerClick className="w-4 h-4" />
          Tạo cấu hình ngay
        </Link>
      </div>
    </div>
  );
}
