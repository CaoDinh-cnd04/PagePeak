using LadiPage.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Infrastructure.Data;

/// <summary>
/// Seed dữ liệu ban đầu vào database (code-first).
/// Tất cả dữ liệu từ frontend (formData.ts, popupTemplateCatalog.ts, vnAddressData.ts)
/// đều được chuyển vào đây để lưu vào SQL Server.
/// </summary>
public static class DbSeeder
{
    // ─── Field templates (JSON) ────────────────────────────────────────────

    private static readonly string ContactFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone"},
         {"id":"message","name":"message","label":"Để lại lời nhắn","placeholder":"Để lại lời nhắn cho chúng tôi","type":"textarea"}]
        """;

    private static readonly string ContactShortFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone","required":true}]
        """;

    private static readonly string EmailOnlyFields = """
        [{"id":"email","name":"email","label":"Email","placeholder":"Nhập địa chỉ email của bạn","type":"email","required":true}]
        """;

    private static readonly string SurveyFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone"},
         {"id":"interest","name":"interest","label":"Lĩnh vực quan tâm","placeholder":"Chọn lĩnh vực","type":"select","options":["Sản phẩm A","Sản phẩm B","Tư vấn thêm"]},
         {"id":"message","name":"message","label":"Ghi chú thêm","placeholder":"Bạn muốn chúng tôi hỗ trợ điều gì?","type":"textarea"}]
        """;

    private static readonly string NameEmailFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên đầy đủ","type":"text","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email của bạn","type":"email","required":true}]
        """;

    private static readonly string RegistrationFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email","required":true}]
        """;

    private static readonly string RegistrationCourseFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email"},
         {"id":"city","name":"city","label":"Thành phố","placeholder":"Hà Nội, TP.HCM...","type":"text"}]
        """;

    private static readonly string WebinarFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"email","name":"email","label":"Email nhận link tham dự","placeholder":"Email nhận link tham dự","type":"email","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone"}]
        """;

    private static readonly string MembershipFields = """
        [{"id":"name","name":"name","label":"Họ và tên đầy đủ","placeholder":"Họ và tên đầy đủ","type":"text","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email","required":true},
         {"id":"phone","name":"phone","label":"Điện thoại","placeholder":"Điện thoại","type":"phone","required":true},
         {"id":"dob","name":"dob","label":"Ngày sinh","placeholder":"Ngày sinh","type":"date"}]
        """;

    private static readonly string LoginFields = """
        [{"id":"accessCode","name":"accessCode","label":"Mã truy cập","placeholder":"Mã truy cập","type":"text","required":true}]
        """;

    private static readonly string LoginFullFields = """
        [{"id":"email","name":"email","label":"Email / Tên đăng nhập","placeholder":"Email hoặc tên đăng nhập","type":"email","required":true},
         {"id":"password","name":"password","label":"Mật khẩu","placeholder":"Mật khẩu","type":"text","required":true}]
        """;

    private static readonly string OtpFields = """
        [{"id":"otp","name":"otp","label":"Mã OTP","placeholder":"Nhập mã OTP","type":"text","required":true}]
        """;

    private static readonly string CheckoutFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email"}]
        """;

    private static readonly string CheckoutFullFields = """
        [{"id":"name","name":"name","label":"Họ và tên","placeholder":"Họ và tên","type":"text","required":true},
         {"id":"phone","name":"phone","label":"Số điện thoại","placeholder":"Số điện thoại","type":"phone","required":true},
         {"id":"email","name":"email","label":"Email","placeholder":"Email","type":"email"},
         {"id":"address","name":"address","label":"Địa chỉ giao hàng","placeholder":"Số nhà, đường, phường/xã","type":"textarea"}]
        """;

    // ─── Public seed methods ───────────────────────────────────────────────

    public static async Task SeedFormPresetsAsync(AppDbContext db)
    {
        if (await db.FormPresetTemplates.AnyAsync()) return;

        var presets = new List<FormPresetTemplate>
        {
            // ── Form (contact) ────────────────────────────────────────────
            new() { PresetId="contact-outlined", Name="Form viền mỏng", FormType="contact", TabName="Form", Title="Liên hệ", ButtonText="Đặt ngay", FieldsJson=ContactFields, InputStyle="outlined", Width=400, Height=360, ButtonColor="#1e293b", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=4, Order=1 },
            new() { PresetId="contact-filled", Name="Form nền xám", FormType="contact", TabName="Form", Title="Liên hệ", ButtonText="Đặt ngay", FieldsJson=ContactFields, InputStyle="filled", Width=400, Height=360, ButtonColor="#334155", ButtonTextColor="#ffffff", BackgroundColor="#f8fafc", FormBorderRadius=12, InputRadius=6, Order=2 },
            new() { PresetId="contact-underlined", Name="Form gạch chân", FormType="contact", TabName="Form", Title="Liên hệ", ButtonText="Đặt ngay", FieldsJson=ContactFields, InputStyle="underlined", Width=400, Height=360, ButtonColor="#0f172a", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=0, InputRadius=0, Order=3 },
            new() { PresetId="contact-2col", Name="Form 2 cột", FormType="contact", TabName="Form", Title="Liên hệ với chúng tôi", ButtonText="Liên hệ ngay", FieldsJson=ContactFields, InputStyle="underlined", Width=500, Height=340, ButtonColor="#0f172a", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=0, Order=4 },
            new() { PresetId="contact-themed", Name="Form xanh lá", FormType="contact", TabName="Form", Title="Nhận liên hệ từ chúng tôi", ButtonText="Liên hệ chúng tôi", FieldsJson=ContactFields, InputStyle="filled", Width=420, Height=370, ButtonColor="#16a34a", ButtonTextColor="#ffffff", BackgroundColor="#f0fdf4", FormBorderRadius=12, InputRadius=6, AccentColor="#16a34a", Order=5 },
            new() { PresetId="contact-purple", Name="Form tím gradient", FormType="contact", TabName="Form", Title="Đăng ký tư vấn", ButtonText="Đăng ký ngay", FieldsJson=ContactShortFields, InputStyle="outlined", Width=380, Height=220, ButtonColor="#7c3aed", ButtonTextColor="#ffffff", BackgroundColor="#faf5ff", FormBorderRadius=16, InputRadius=8, AccentColor="#7c3aed", Order=6 },
            new() { PresetId="contact-blue", Name="Form xanh dương", FormType="contact", TabName="Form", Title="Liên hệ với chúng tôi", ButtonText="Gửi tin nhắn", FieldsJson=ContactFields, InputStyle="filled", Width=420, Height=370, ButtonColor="#2563eb", ButtonTextColor="#ffffff", BackgroundColor="#eff6ff", FormBorderRadius=12, InputRadius=6, AccentColor="#2563eb", Order=7 },
            new() { PresetId="contact-orange", Name="Form cam nổi bật", FormType="contact", TabName="Form", Title="Nhận ưu đãi ngay", ButtonText="NHẬN NGAY", FieldsJson=ContactShortFields, InputStyle="outlined", Width=380, Height=220, ButtonColor="#ea580c", ButtonTextColor="#ffffff", BackgroundColor="#fff7ed", FormBorderRadius=8, InputRadius=4, AccentColor="#ea580c", Order=8 },
            new() { PresetId="contact-dark", Name="Form tối", FormType="contact", TabName="Form", Title="Liên hệ", ButtonText="Gửi ngay", FieldsJson=ContactShortFields, InputStyle="filled", Width=380, Height=220, ButtonColor="#6366f1", ButtonTextColor="#ffffff", BackgroundColor="#0f172a", FormBorderRadius=12, InputRadius=6, TitleColor="#f8fafc", AccentColor="#6366f1", Order=9 },
            new() { PresetId="contact-minimal", Name="Form tối giản", FormType="contact", TabName="Form", Title="", ButtonText="Liên hệ ngay", FieldsJson=ContactShortFields, InputStyle="underlined", Width=360, Height=190, ButtonColor="#dc2626", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=0, InputRadius=0, AccentColor="#dc2626", Order=10 },
            new() { PresetId="contact-newsletter", Name="Form newsletter", FormType="contact", TabName="Form", Title="Nhận tin tức mới nhất", ButtonText="Đăng ký ngay", FieldsJson=EmailOnlyFields, InputStyle="outlined", Width=460, Height=165, ButtonColor="#0f172a", ButtonTextColor="#ffffff", BackgroundColor="#f8fafc", FormBorderRadius=12, InputRadius=24, AccentColor="#0f172a", Order=11 },
            new() { PresetId="contact-survey", Name="Form khảo sát", FormType="contact", TabName="Form", Title="Khảo sát nhanh", ButtonText="Gửi khảo sát", FieldsJson=SurveyFields, InputStyle="filled", Width=420, Height=390, ButtonColor="#0284c7", ButtonTextColor="#ffffff", BackgroundColor="#f0f9ff", FormBorderRadius=12, InputRadius=6, TitleColor="#0369a1", AccentColor="#0284c7", Order=12 },
            new() { PresetId="contact-gradient-blue", Name="Form gradient xanh", FormType="contact", TabName="Form", Title="Tư vấn miễn phí", ButtonText="Nhận tư vấn ngay", FieldsJson=NameEmailFields, InputStyle="outlined", Width=400, Height=215, ButtonColor="#1d4ed8", ButtonTextColor="#ffffff", BackgroundColor="#dbeafe", FormBorderRadius=16, InputRadius=8, TitleColor="#1e3a8a", AccentColor="#3b82f6", Order=13 },
            new() { PresetId="contact-card-shadow", Name="Form thẻ nổi", FormType="contact", TabName="Form", Title="Liên hệ với chúng tôi", ButtonText="Gửi tin nhắn", FieldsJson=ContactFields, InputStyle="outlined", Width=440, Height=375, ButtonColor="#6366f1", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=20, InputRadius=10, AccentColor="#6366f1", Order=14 },
            new() { PresetId="contact-pink", Name="Form hồng pastel", FormType="contact", TabName="Form", Title="Đặt lịch tư vấn làm đẹp", ButtonText="Đặt lịch ngay", FieldsJson=ContactShortFields, InputStyle="filled", Width=380, Height=230, ButtonColor="#db2777", ButtonTextColor="#ffffff", BackgroundColor="#fdf2f8", FormBorderRadius=16, InputRadius=8, TitleColor="#9d174d", AccentColor="#ec4899", Order=15 },
            new() { PresetId="contact-left-accent", Name="Form viền trái", FormType="contact", TabName="Form", Title="Nhận báo giá", ButtonText="Yêu cầu báo giá", FieldsJson=ContactFields, InputStyle="underlined", Width=400, Height=360, ButtonColor="#0f766e", ButtonTextColor="#ffffff", BackgroundColor="#f0fdfa", FormBorderRadius=8, InputRadius=0, TitleColor="#134e4a", AccentColor="#14b8a6", Order=16 },

            // ── Form checkout ─────────────────────────────────────────────
            new() { PresetId="checkout-filled", Name="Checkout nền", FormType="checkout", TabName="Form checkout", Title="Đặt hàng", ButtonText="Mua ngay", FieldsJson=CheckoutFields, InputStyle="filled", Width=420, Height=275, ButtonColor="#dc2626", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=4, Order=20 },
            new() { PresetId="checkout-outlined", Name="Checkout viền", FormType="checkout", TabName="Form checkout", Title="Đặt hàng", ButtonText="Mua ngay", FieldsJson=CheckoutFields, InputStyle="outlined", Width=420, Height=275, ButtonColor="#16a34a", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=4, Order=21 },
            new() { PresetId="checkout-purple", Name="Đặt hàng tím", FormType="checkout", TabName="Form checkout", Title="Đặt hàng ngay với chúng tôi", ButtonText="Mua ngay", FieldsJson=CheckoutFields, InputStyle="outlined", Width=420, Height=290, ButtonColor="#7c3aed", ButtonTextColor="#ffffff", BackgroundColor="#faf5ff", FormBorderRadius=12, InputRadius=6, AccentColor="#7c3aed", Order=22 },
            new() { PresetId="checkout-cream", Name="Đặt hàng kem", FormType="checkout", TabName="Form checkout", Title="Đặt hàng sản phẩm với giá tốt nhất", ButtonText="MUA NGAY", FieldsJson=CheckoutFields, InputStyle="underlined", Width=420, Height=295, ButtonColor="#92400e", ButtonTextColor="#ffffff", BackgroundColor="#fffbeb", FormBorderRadius=8, InputRadius=0, AccentColor="#d97706", Order=23 },
            new() { PresetId="checkout-full", Name="Checkout đầy đủ", FormType="checkout", TabName="Form checkout", Title="Thông tin đặt hàng", ButtonText="Đặt hàng", FieldsJson=CheckoutFullFields, InputStyle="outlined", Width=440, Height=380, ButtonColor="#0f172a", ButtonTextColor="#ffffff", BackgroundColor="#f8fafc", FormBorderRadius=8, InputRadius=4, Order=24 },
            new() { PresetId="checkout-red", Name="Flash sale đỏ", FormType="checkout", TabName="Form checkout", Title="ĐẶT HÀNG FLASH SALE", ButtonText="ĐẶT HÀNG NGAY", FieldsJson=CheckoutFields, InputStyle="filled", Width=420, Height=290, ButtonColor="#b91c1c", ButtonTextColor="#ffffff", BackgroundColor="#fff1f2", FormBorderRadius=4, InputRadius=4, TitleColor="#b91c1c", AccentColor="#b91c1c", Order=25 },
            new() { PresetId="checkout-dark", Name="Checkout tối", FormType="checkout", TabName="Form checkout", Title="Thông tin đặt hàng", ButtonText="Xác nhận đặt hàng", FieldsJson=CheckoutFields, InputStyle="filled", Width=420, Height=290, ButtonColor="#f59e0b", ButtonTextColor="#000000", BackgroundColor="#1e293b", FormBorderRadius=12, InputRadius=6, TitleColor="#f8fafc", AccentColor="#f59e0b", Order=26 },
            new() { PresetId="checkout-mint", Name="Checkout xanh mint", FormType="checkout", TabName="Form checkout", Title="Hoàn tất đơn hàng", ButtonText="Đặt hàng ngay", FieldsJson=CheckoutFields, InputStyle="filled", Width=420, Height=280, ButtonColor="#059669", ButtonTextColor="#ffffff", BackgroundColor="#ecfdf5", FormBorderRadius=12, InputRadius=8, TitleColor="#065f46", AccentColor="#10b981", Order=27 },
            new() { PresetId="checkout-clean", Name="Checkout trắng sạch", FormType="checkout", TabName="Form checkout", Title="Thông tin giao hàng", ButtonText="Xác nhận đặt hàng", FieldsJson=CheckoutFullFields, InputStyle="outlined", Width=440, Height=380, ButtonColor="#111827", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=4, InputRadius=4, TitleColor="#111827", Order=28 },
            new() { PresetId="checkout-flash-gradient", Name="Flash Sale hồng đỏ", FormType="checkout", TabName="Form checkout", Title="⚡ ĐẶT HÀNG NGAY - SALE 50%", ButtonText="MUA NGAY TRƯỚC KHI HẾT", FieldsJson=CheckoutFields, InputStyle="filled", Width=440, Height=300, ButtonColor="#e11d48", ButtonTextColor="#ffffff", BackgroundColor="#fff1f2", FormBorderRadius=8, InputRadius=4, TitleColor="#9f1239", AccentColor="#f43f5e", Order=29 },

            // ── Form đăng ký ──────────────────────────────────────────────
            new() { PresetId="reg-outlined", Name="Đăng ký viền", FormType="registration", TabName="Form Đăng ký", Title="Đăng ký nhận tư vấn", ButtonText="Đăng ký ngay", FieldsJson=RegistrationFields, InputStyle="outlined", Width=400, Height=275, ButtonColor="#2563eb", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=4, Order=30 },
            new() { PresetId="reg-course", Name="Đăng ký khoá học", FormType="registration", TabName="Form Đăng ký", Title="Đăng ký học thử MIỄN PHÍ", ButtonText="Đăng ký học thử", FieldsJson=RegistrationCourseFields, InputStyle="filled", Width=400, Height=325, ButtonColor="#7c3aed", ButtonTextColor="#ffffff", BackgroundColor="#faf5ff", FormBorderRadius=12, InputRadius=6, TitleColor="#5b21b6", AccentColor="#7c3aed", Order=31 },
            new() { PresetId="reg-event", Name="Đăng ký sự kiện", FormType="registration", TabName="Form Đăng ký", Title="Đăng ký tham dự", ButtonText="Xác nhận đăng ký", FieldsJson=RegistrationFields, InputStyle="underlined", Width=420, Height=275, ButtonColor="#0891b2", ButtonTextColor="#ffffff", BackgroundColor="#ecfeff", FormBorderRadius=8, InputRadius=0, TitleColor="#0e7490", AccentColor="#0891b2", Order=32 },
            new() { PresetId="reg-dark", Name="Đăng ký tối", FormType="registration", TabName="Form Đăng ký", Title="Nhận ưu đãi đặc biệt", ButtonText="ĐĂNG KÝ NGAY", FieldsJson=RegistrationFields, InputStyle="filled", Width=400, Height=280, ButtonColor="#f97316", ButtonTextColor="#ffffff", BackgroundColor="#0f172a", FormBorderRadius=12, InputRadius=6, TitleColor="#fbbf24", AccentColor="#f97316", Order=33 },
            new() { PresetId="reg-webinar", Name="Đăng ký webinar", FormType="registration", TabName="Form Đăng ký", Title="Đăng ký tham dự Webinar", ButtonText="Giữ chỗ ngay", FieldsJson=WebinarFields, InputStyle="outlined", Width=420, Height=285, ButtonColor="#0891b2", ButtonTextColor="#ffffff", BackgroundColor="#ecfeff", FormBorderRadius=14, InputRadius=6, TitleColor="#0e7490", AccentColor="#06b6d4", Order=34 },
            new() { PresetId="reg-membership", Name="Đăng ký thành viên", FormType="registration", TabName="Form Đăng ký", Title="Đăng ký thành viên Premium", ButtonText="Trở thành thành viên", FieldsJson=MembershipFields, InputStyle="filled", Width=420, Height=330, ButtonColor="#7c3aed", ButtonTextColor="#ffffff", BackgroundColor="#faf5ff", FormBorderRadius=16, InputRadius=8, TitleColor="#5b21b6", AccentColor="#8b5cf6", Order=35 },

            // ── Form Login ────────────────────────────────────────────────
            new() { PresetId="login-outlined", Name="Login viền", FormType="login", TabName="Form Login", Title="", ButtonText="Đăng nhập", FieldsJson=LoginFields, InputStyle="outlined", Width=440, Height=64, ButtonColor="#1e293b", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=8, InputRadius=4, Order=40 },
            new() { PresetId="login-filled", Name="Login nền", FormType="login", TabName="Form Login", Title="", ButtonText="Đăng nhập", FieldsJson=LoginFields, InputStyle="filled", Width=440, Height=64, ButtonColor="#334155", ButtonTextColor="#ffffff", BackgroundColor="#f1f5f9", FormBorderRadius=12, InputRadius=6, Order=41 },
            new() { PresetId="login-full", Name="Login đầy đủ", FormType="login", TabName="Form Login", Title="Đăng nhập", ButtonText="Đăng nhập", FieldsJson=LoginFullFields, InputStyle="outlined", Width=400, Height=230, ButtonColor="#2563eb", ButtonTextColor="#ffffff", BackgroundColor="#ffffff", FormBorderRadius=12, InputRadius=6, TitleColor="#1e40af", AccentColor="#2563eb", Order=42 },
            new() { PresetId="login-purple", Name="Login tím", FormType="login", TabName="Form Login", Title="Chào mừng trở lại", ButtonText="Vào ngay", FieldsJson=LoginFields, InputStyle="outlined", Width=440, Height=100, ButtonColor="#7c3aed", ButtonTextColor="#ffffff", BackgroundColor="#faf5ff", FormBorderRadius=16, InputRadius=8, TitleColor="#5b21b6", AccentColor="#7c3aed", Order=43 },
            new() { PresetId="login-dark", Name="Login tối", FormType="login", TabName="Form Login", Title="Đăng nhập hệ thống", ButtonText="Đăng nhập", FieldsJson=LoginFullFields, InputStyle="filled", Width=420, Height=250, ButtonColor="#6366f1", ButtonTextColor="#ffffff", BackgroundColor="#0f172a", FormBorderRadius=14, InputRadius=6, TitleColor="#f8fafc", AccentColor="#818cf8", Order=44 },

            // ── Form OTP ──────────────────────────────────────────────────
            new() { PresetId="otp-blue", Name="OTP xanh dương", FormType="otp", TabName="Form OTP", Title="Nhập mã OTP", ButtonText="Xác nhận", FieldsJson=OtpFields, InputStyle="outlined", Width=360, Height=160, ButtonColor="#2563eb", ButtonTextColor="#ffffff", BackgroundColor="#eff6ff", FormBorderRadius=12, InputRadius=8, TitleColor="#1e40af", AccentColor="#3b82f6", Order=50 },
            new() { PresetId="otp-dark", Name="OTP tối", FormType="otp", TabName="Form OTP", Title="Xác thực OTP", ButtonText="Xác nhận", FieldsJson=OtpFields, InputStyle="filled", Width=360, Height=155, ButtonColor="#6366f1", ButtonTextColor="#ffffff", BackgroundColor="#0f172a", FormBorderRadius=12, InputRadius=6, TitleColor="#e2e8f0", AccentColor="#818cf8", Order=51 },
            new() { PresetId="otp-green", Name="OTP xanh lá", FormType="otp", TabName="Form OTP", Title="Nhập mã xác thực", ButtonText="Xác nhận ngay", FieldsJson=OtpFields, InputStyle="outlined", Width=360, Height=160, ButtonColor="#16a34a", ButtonTextColor="#ffffff", BackgroundColor="#f0fdf4", FormBorderRadius=8, InputRadius=4, TitleColor="#15803d", AccentColor="#22c55e", Order=52 },
        };

        db.FormPresetTemplates.AddRange(presets);
        await db.SaveChangesAsync();
    }

    public static async Task SeedPopupTemplatesAsync(AppDbContext db)
    {
        // Force reseed: remove old templates and replace with new rich ones
        var existing = await db.PopupTemplates.ToListAsync();
        if (existing.Count >= 14) return; // already seeded with new data

        if (existing.Count > 0) { db.PopupTemplates.RemoveRange(existing); await db.SaveChangesAsync(); }

        static string PopContent(string title, string body, string templateId, string category,
            string? btnText = null, string? btnUrl = null, bool showBtn = false, string? layout = null, string? imageEmoji = null)
            => System.Text.Json.JsonSerializer.Serialize(new
            {
                title, body, templateId, category,
                btnText = btnText ?? "Tìm hiểu thêm",
                btnUrl = btnUrl ?? "#",
                showBtn,
                layout = layout ?? "flat",
                imageEmoji,
                animation = "fade",
                closeOnOverlay = true,
                trigger = "click",
                triggerDelay = 0,
            });

        static string Styles(object styles) => System.Text.Json.JsonSerializer.Serialize(styles);

        var templates = new List<PopupTemplate>
        {
            // ── Nhóm: Khuyến mãi ────────────────────────────────────────
            new() { TemplateId="promo-dark", Name="Khuyến mãi — Nền tối", Category="promotion", Width=500, Height=280, Order=1, IsActive=true,
                ContentJson=PopContent("🔥 Flash Sale 50%", "Chỉ trong hôm nay! Giảm ngay 50% toàn bộ sản phẩm. Nhập mã FLASH50 khi thanh toán.", "promo-dark", "promotion", "Mua ngay", "#", true, "flat", "🎁"),
                StylesJson=Styles(new { backgroundColor="#0f172a", borderRadius=16, boxShadow="0 20px 60px rgba(15,23,42,0.25)", popupFlat=1, headerTextColor="#fbbf24", bodyTextColor="#cbd5e1", btnColor="#fbbf24", btnTextColor="#0f172a", btnRadius=8 }) },

            new() { TemplateId="promo-gradient", Name="Khuyến mãi — Gradient", Category="promotion", Width=500, Height=260, Order=2, IsActive=true,
                ContentJson=PopContent("🎉 Ưu đãi độc quyền", "Giảm 30% đơn hàng đầu tiên. Nhập mã WELCOME30 — hết hạn 24/12.", "promo-gradient", "promotion", "Lấy mã ngay", "#", true, "flat", "🛍️"),
                StylesJson=Styles(new { backgroundColor="#7c3aed", borderRadius=16, boxShadow="0 20px 60px rgba(124,58,237,0.3)", popupFlat=1, headerTextColor="#fef9c3", bodyTextColor="#ede9fe", btnColor="#fef08a", btnTextColor="#4c1d95", btnRadius=99 }) },

            new() { TemplateId="promo-light", Name="Khuyến mãi — Sáng", Category="promotion", Width=480, Height=240, Order=3, IsActive=true,
                ContentJson=PopContent("Ưu đãi giới hạn", "Giảm 20% cho đơn hàng từ 300K. Áp dụng đến hết ngày 31/12.", "promo-light", "promotion", "Mua sắm ngay", "#", true, "flat"),
                StylesJson=Styles(new { backgroundColor="#fffbeb", borderRadius=12, boxShadow="0 12px 40px rgba(251,191,36,0.2)", popupFlat=1, headerTextColor="#92400e", bodyTextColor="#78350f", btnColor="#f59e0b", btnTextColor="#ffffff", btnRadius=8 }) },

            // ── Nhóm: Đăng ký ───────────────────────────────────────────
            new() { TemplateId="subscribe-modern", Name="Đăng ký nhận tin — Hiện đại", Category="subscribe", Width=480, Height=300, Order=4, IsActive=true,
                ContentJson=PopContent("📧 Nhận ưu đãi độc quyền", "Đăng ký email để nhận:\n✓ Mã giảm 15% đơn đầu tiên\n✓ Thông tin bộ sưu tập mới nhất\n✓ Ưu đãi thành viên thân thiết", "subscribe-modern", "subscribe", "Đăng ký ngay", "#", true, "header"),
                StylesJson=Styles(new { backgroundColor="#ffffff", borderRadius=16, headerBackgroundColor="#1e2d7d", headerTextColor="#ffffff", bodyTextColor="#334155", btnColor="#1e2d7d", btnTextColor="#ffffff", btnRadius=8 }) },

            new() { TemplateId="subscribe-dark", Name="Đăng ký nhận tin — Tối", Category="subscribe", Width=520, Height=260, Order=5, IsActive=true,
                ContentJson=PopContent("Đừng bỏ lỡ tin tức mới", "Chúng tôi luôn cập nhật những xu hướng mới nhất. Đăng ký ngay để không bỏ lỡ!", "subscribe-dark", "subscribe", "Đăng ký miễn phí", "#", true, "flat", "📬"),
                StylesJson=Styles(new { backgroundColor="#0f172a", borderRadius=14, popupFlat=1, headerTextColor="#e2e8f0", bodyTextColor="#94a3b8", btnColor="#6366f1", btnTextColor="#ffffff", btnRadius=8 }) },

            // ── Nhóm: Thông báo ──────────────────────────────────────────
            new() { TemplateId="announce-info", Name="Thông báo — Thông tin", Category="notification", Width=460, Height=240, Order=6, IsActive=true,
                ContentJson=PopContent("📢 Thông báo quan trọng", "Hệ thống sẽ bảo trì vào 22:00 ngày 15/12. Vui lòng hoàn tất giao dịch trước thời điểm này.", "announce-info", "notification", "Đã hiểu", "#", true, "header"),
                StylesJson=Styles(new { backgroundColor="#ffffff", borderRadius=12, headerBackgroundColor="#2563eb", headerTextColor="#ffffff", bodyTextColor="#334155", btnColor="#2563eb", btnTextColor="#ffffff", btnRadius=6 }) },

            new() { TemplateId="announce-warning", Name="Thông báo — Cảnh báo", Category="notification", Width=460, Height=230, Order=7, IsActive=true,
                ContentJson=PopContent("⚠️ Lưu ý quan trọng", "Tài khoản của bạn sắp hết hạn. Gia hạn ngay để không bị gián đoạn dịch vụ.", "announce-warning", "notification", "Gia hạn ngay", "#", true, "flat", "⚠️"),
                StylesJson=Styles(new { backgroundColor="#fffbeb", borderRadius=12, popupFlat=1, headerTextColor="#92400e", bodyTextColor="#78350f", btnColor="#f59e0b", btnTextColor="#ffffff", btnRadius=8 }) },

            new() { TemplateId="announce-success", Name="Thông báo — Thành công", Category="notification", Width=440, Height=220, Order=8, IsActive=true,
                ContentJson=PopContent("✅ Đặt hàng thành công!", "Đơn hàng #12345 đã được xác nhận. Chúng tôi sẽ giao hàng trong 2–3 ngày làm việc.", "announce-success", "notification", "Xem đơn hàng", "#", true, "flat", "🎉"),
                StylesJson=Styles(new { backgroundColor="#ecfdf5", borderRadius=12, popupFlat=1, headerTextColor="#065f46", bodyTextColor="#047857", btnColor="#16a34a", btnTextColor="#ffffff", btnRadius=8 }) },

            // ── Nhóm: Liên hệ ───────────────────────────────────────────
            new() { TemplateId="contact-simple", Name="Liên hệ — Đơn giản", Category="contact", Width=460, Height=260, Order=9, IsActive=true,
                ContentJson=PopContent("Liên hệ với chúng tôi", "Hotline: 0909 xxx xxx\nEmail: info@company.vn\nGiờ làm việc: 8:00 – 17:00, T2–T7", "contact-simple", "contact", "Gọi ngay", "tel:0909123456", true, "header"),
                StylesJson=Styles(new { backgroundColor="#ffffff", borderRadius=12, headerBackgroundColor="#0f172a", headerTextColor="#ffffff", bodyTextColor="#475569", btnColor="#0f172a", btnTextColor="#ffffff", btnRadius=8 }) },

            new() { TemplateId="contact-chat", Name="Hỗ trợ — Chat nhanh", Category="contact", Width=380, Height=240, Order=10, IsActive=true,
                ContentJson=PopContent("💬 Cần hỗ trợ?", "Đội ngũ tư vấn sẵn sàng 24/7. Nhắn tin cho chúng tôi qua Zalo hoặc Messenger!", "contact-chat", "contact", "Chat ngay", "#", true, "flat", "🤝"),
                StylesJson=Styles(new { backgroundColor="#f0fdf4", borderRadius=14, popupFlat=1, headerTextColor="#14532d", bodyTextColor="#166534", btnColor="#16a34a", btnTextColor="#ffffff", btnRadius=99 }) },

            // ── Nhóm: Sự kiện / Lucky ────────────────────────────────────
            new() { TemplateId="event-webinar", Name="Sự kiện — Webinar", Category="event", Width=500, Height=300, Order=11, IsActive=true,
                ContentJson=PopContent("🎤 Webinar miễn phí!", "Tham gia buổi chia sẻ về Marketing 4.0 vào 20/12/2024 lúc 20:00.\n100 suất đăng ký — Còn 23 chỗ!", "event-webinar", "event", "Đăng ký tham dự", "#", true, "flat", "📅"),
                StylesJson=Styles(new { backgroundColor="#1e1b4b", borderRadius=16, popupFlat=1, headerTextColor="#c7d2fe", bodyTextColor="#a5b4fc", btnColor="#6366f1", btnTextColor="#ffffff", btnRadius=8 }) },

            new() { TemplateId="lucky-spin", Name="Vòng quay may mắn", Category="event", Width=440, Height=320, Order=12, IsActive=true,
                ContentJson=PopContent("🎡 Quay ngay — Nhận quà!", "Mỗi tài khoản 1 lượt quay miễn phí mỗi ngày.\nGiải thưởng: Voucher 50K, 100K, 200K và iPhone!", "lucky-spin", "event", "Quay ngay!", "#", true, "flat", "🎰"),
                StylesJson=Styles(new { backgroundColor="#4c1d95", borderRadius=16, popupFlat=1, headerTextColor="#fef08a", bodyTextColor="#e9d5ff", btnColor="#fbbf24", btnTextColor="#1f2937", btnRadius=99 }) },

            // ── Nhóm: Upsell ─────────────────────────────────────────────
            new() { TemplateId="upsell-product", Name="Upsell — Sản phẩm liên quan", Category="upsell", Width=500, Height=280, Order=13, IsActive=true,
                ContentJson=PopContent("🛍️ Bạn có thể thích...", "Kết hợp với Túi da cao cấp để hoàn thiện phong cách!\nThêm vào giỏ và tiết kiệm 15% ngay hôm nay.", "upsell-product", "upsell", "Thêm vào giỏ", "#", true, "header"),
                StylesJson=Styles(new { backgroundColor="#ffffff", borderRadius=12, headerBackgroundColor="#f97316", headerTextColor="#ffffff", bodyTextColor="#334155", btnColor="#f97316", btnTextColor="#ffffff", btnRadius=8 }) },

            new() { TemplateId="exit-intent", Name="Exit Intent — Giữ chân khách", Category="upsell", Width=500, Height=280, Order=14, IsActive=true,
                ContentJson=PopContent("Khoan đã! Bạn có muốn...", "Nhận ngay mã giảm giá 10% trước khi rời trang. Chỉ 1 lần sử dụng, không cần điều kiện tối thiểu.", "exit-intent", "upsell", "Nhận mã giảm giá", "#", true, "flat", "🎁"),
                StylesJson=Styles(new { backgroundColor="#fff7ed", borderRadius=14, popupFlat=1, headerTextColor="#9a3412", bodyTextColor="#7c2d12", btnColor="#ea580c", btnTextColor="#ffffff", btnRadius=8 }) },
        };

        db.PopupTemplates.AddRange(templates);
        await db.SaveChangesAsync();
    }

    public static async Task SeedLoginFeatureSlidesAsync(AppDbContext db)
    {
        if (await db.LoginFeatureSlides.AnyAsync()) return;

        db.LoginFeatureSlides.AddRange(
            new LoginFeatureSlide { SlideId = "1", Title = "Kéo thả xây dựng Landing Page", Description = "Builder trực quan, không cần code. Kéo thả block, tùy chỉnh nội dung và giao diện trong vài phút.", Icon = "drag", Order = 1 },
            new LoginFeatureSlide { SlideId = "2", Title = "Hàng trăm template sẵn có", Description = "Chọn từ thư viện template chuyên nghiệp theo ngành, sự kiện và mục tiêu campaign.", Icon = "template", Order = 2 },
            new LoginFeatureSlide { SlideId = "3", Title = "Publish & custom domain", Description = "Xuất bản ngay, hosting miễn phí. Gắn domain riêng để tăng uy tín thương hiệu.", Icon = "publish", Order = 3 },
            new LoginFeatureSlide { SlideId = "4", Title = "Thu thập lead thông minh", Description = "Form và popup thu thập lead tự động, đồng bộ với CRM và công cụ marketing.", Icon = "lead", Order = 4 },
            new LoginFeatureSlide { SlideId = "5", Title = "Analytics & conversion", Description = "Theo dõi traffic, tỷ lệ chuyển đổi và hành vi khách truy cập trên từng trang.", Icon = "analytics", Order = 5 },
            new LoginFeatureSlide { SlideId = "6", Title = "SEO & hiệu năng tối ưu", Description = "Tối ưu tốc độ tải, meta tag và cấu trúc trang để landing page thân thiện với công cụ tìm kiếm.", Icon = "seo", Order = 6 }
        );
        await db.SaveChangesAsync();
    }

    public static async Task SeedEditorIconsAsync(AppDbContext db)
    {
        if (await db.EditorIcons.AnyAsync()) return;

        var icons = new List<EditorIcon>
        {
            // SOCIALS
            new() { IconId="facebook", Name="Facebook", Category="socials", Char="f", Color="#1877f2", Order=1 },
            new() { IconId="instagram", Name="Instagram", Category="socials", Char="📷", Color="#e4405f", Order=2 },
            new() { IconId="line", Name="Line", Category="socials", Char="L", Color="#00b900", Order=3 },
            new() { IconId="linkedin", Name="LinkedIn", Category="socials", Char="in", Color="#0a66c2", Order=4 },
            new() { IconId="messenger", Name="Messenger", Category="socials", Char="💬", Color="#0084ff", Order=5 },
            new() { IconId="pinterest", Name="Pinterest", Category="socials", Char="P", Color="#bd081c", Order=6 },
            new() { IconId="skype", Name="Skype", Category="socials", Char="S", Color="#00aff0", Order=7 },
            new() { IconId="slack", Name="Slack", Category="socials", Char="#", Color="#4a154b", Order=8 },
            new() { IconId="snapchat", Name="Snapchat", Category="socials", Char="👻", Color="#fffc00", Order=9 },
            new() { IconId="spotify", Name="Spotify", Category="socials", Char="♪", Color="#1db954", Order=10 },
            new() { IconId="telegram", Name="Telegram", Category="socials", Char="✈", Color="#26a5e4", Order=11 },
            new() { IconId="tiktok", Name="TikTok", Category="socials", Char="♪", Color="#000000", Order=12 },
            new() { IconId="twitter", Name="X (Twitter)", Category="socials", Char="𝕏", Color="#000000", Order=13 },
            new() { IconId="viber", Name="Viber", Category="socials", Char="V", Color="#7360f2", Order=14 },
            new() { IconId="vimeo", Name="Vimeo", Category="socials", Char="V", Color="#1ab7ea", Order=15 },
            new() { IconId="wechat", Name="WeChat", Category="socials", Char="💬", Color="#09b83e", Order=16 },
            new() { IconId="weibo", Name="Weibo", Category="socials", Char="微", Color="#e6162d", Order=17 },
            new() { IconId="whatsapp", Name="WhatsApp", Category="socials", Char="✓", Color="#25d366", Order=18 },
            new() { IconId="youtube", Name="YouTube", Category="socials", Char="▶", Color="#ff0000", Order=19 },
            new() { IconId="zalo", Name="Zalo", Category="socials", Char="Z", Color="#0068ff", Order=20 },
            // ICONS
            new() { IconId="star", Name="Ngôi sao", Category="icons", Char="★", Color="#f59e0b", Order=30 },
            new() { IconId="star-outline", Name="Sao viền", Category="icons", Char="☆", Color="#64748b", Order=31 },
            new() { IconId="heart", Name="Trái tim", Category="icons", Char="❤", Color="#ef4444", Order=32 },
            new() { IconId="search", Name="Tìm kiếm", Category="icons", Char="🔍", Color="#64748b", Order=33 },
            new() { IconId="mail", Name="Thư", Category="icons", Char="✉", Color="#64748b", Order=34 },
            new() { IconId="user", Name="Người dùng", Category="icons", Char="👤", Color="#64748b", Order=35 },
            new() { IconId="film", Name="Phim", Category="icons", Char="🎬", Color="#64748b", Order=36 },
            new() { IconId="grid-2", Name="Lưới 2x2", Category="icons", Char="⊞", Color="#64748b", Order=37 },
            new() { IconId="check", Name="Tích xanh", Category="icons", Char="✓", Color="#22c55e", Order=38 },
            new() { IconId="check-circle", Name="Vòng tích", Category="icons", Char="✅", Color="#22c55e", Order=39 },
            new() { IconId="close", Name="Đóng", Category="icons", Char="✕", Color="#ef4444", Order=40 },
            new() { IconId="phone", Name="Điện thoại", Category="icons", Char="📞", Color="#64748b", Order=41 },
            new() { IconId="location", Name="Vị trí", Category="icons", Char="📍", Color="#ef4444", Order=42 },
            new() { IconId="clock", Name="Đồng hồ", Category="icons", Char="🕐", Color="#64748b", Order=43 },
            new() { IconId="cart", Name="Giỏ hàng", Category="icons", Char="🛒", Color="#64748b", Order=44 },
            new() { IconId="gift", Name="Quà tặng", Category="icons", Char="🎁", Color="#a855f7", Order=45 },
            new() { IconId="fire", Name="Lửa", Category="icons", Char="🔥", Color="#f97316", Order=46 },
            new() { IconId="lightning", Name="Sấm sét", Category="icons", Char="⚡", Color="#eab308", Order=47 },
            new() { IconId="shield", Name="Khiên", Category="icons", Char="🛡", Color="#3b82f6", Order=48 },
            new() { IconId="trophy", Name="Cúp", Category="icons", Char="🏆", Color="#f59e0b", Order=49 },
            new() { IconId="diamond", Name="Kim cương", Category="icons", Char="💎", Color="#06b6d4", Order=50 },
            new() { IconId="crown", Name="Vương miện", Category="icons", Char="👑", Color="#f59e0b", Order=51 },
            new() { IconId="bell", Name="Chuông", Category="icons", Char="🔔", Color="#f59e0b", Order=52 },
            new() { IconId="lock", Name="Khóa", Category="icons", Char="🔒", Color="#64748b", Order=53 },
            new() { IconId="key", Name="Chìa khóa", Category="icons", Char="🔑", Color="#f59e0b", Order=54 },
            new() { IconId="info", Name="Thông tin", Category="icons", Char="ℹ", Color="#3b82f6", Order=55 },
            new() { IconId="warning", Name="Cảnh báo", Category="icons", Char="⚠", Color="#eab308", Order=56 },
            // ARROWS
            new() { IconId="arrow-right", Name="Mũi tên phải", Category="arrows", Char="→", Color="#64748b", Order=60 },
            new() { IconId="arrow-left", Name="Mũi tên trái", Category="arrows", Char="←", Color="#64748b", Order=61 },
            new() { IconId="arrow-up", Name="Mũi tên lên", Category="arrows", Char="↑", Color="#64748b", Order=62 },
            new() { IconId="arrow-down", Name="Mũi tên xuống", Category="arrows", Char="↓", Color="#64748b", Order=63 },
            new() { IconId="arrow-right-fat", Name="Mũi tên to phải", Category="arrows", Char="➡", Color="#64748b", Order=64 },
            new() { IconId="arrow-left-fat", Name="Mũi tên to trái", Category="arrows", Char="⬅", Color="#64748b", Order=65 },
            new() { IconId="arrow-up-fat", Name="Mũi tên to lên", Category="arrows", Char="⬆", Color="#64748b", Order=66 },
            new() { IconId="arrow-down-fat", Name="Mũi tên to xuống", Category="arrows", Char="⬇", Color="#64748b", Order=67 },
            new() { IconId="double-arrow-right", Name="Mũi tên kép phải", Category="arrows", Char="»", Color="#64748b", Order=68 },
            new() { IconId="double-arrow-left", Name="Mũi tên kép trái", Category="arrows", Char="«", Color="#64748b", Order=69 },
            new() { IconId="arrow-curved", Name="Mũi tên cong", Category="arrows", Char="↪", Color="#64748b", Order=70 },
            new() { IconId="chevron-right", Name="Chevron phải", Category="arrows", Char="›", Color="#64748b", Order=71 },
            new() { IconId="chevron-left", Name="Chevron trái", Category="arrows", Char="‹", Color="#64748b", Order=72 },
            // PATTERN
            new() { IconId="dot", Name="Chấm", Category="pattern", Char="•", Color="#64748b", Order=80 },
            new() { IconId="dash", Name="Gạch ngang", Category="pattern", Char="—", Color="#64748b", Order=81 },
            new() { IconId="asterisk", Name="Dấu sao", Category="pattern", Char="*", Color="#64748b", Order=82 },
            new() { IconId="hash", Name="Dấu thăng", Category="pattern", Char="#", Color="#64748b", Order=83 },
            new() { IconId="wave", Name="Sóng", Category="pattern", Char="~", Color="#64748b", Order=84 },
            new() { IconId="plus", Name="Dấu cộng", Category="pattern", Char="+", Color="#64748b", Order=85 },
            new() { IconId="cross", Name="Dấu nhân", Category="pattern", Char="×", Color="#64748b", Order=86 },
            new() { IconId="flower", Name="Hoa", Category="pattern", Char="✿", Color="#ec4899", Order=87 },
            new() { IconId="leaf", Name="Lá cây", Category="pattern", Char="❧", Color="#22c55e", Order=88 },
        };

        db.EditorIcons.AddRange(icons);
        await db.SaveChangesAsync();
    }

    public static async Task SeedSampleVideosAsync(AppDbContext db)
    {
        if (await db.SampleVideos.AnyAsync()) return;

        db.SampleVideos.AddRange(
            new SampleVideo { Name = "Faded - Alan Walker", Url = "https://www.youtube.com/watch?v=60ItHLz5WEA", EmbedUrl = "https://www.youtube.com/embed/60ItHLz5WEA", ThumbnailUrl = "https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg", Source = "youtube", Order = 1 },
            new SampleVideo { Name = "Shape of You - Ed Sheeran", Url = "https://www.youtube.com/watch?v=JGwWNGJdvx8", EmbedUrl = "https://www.youtube.com/embed/JGwWNGJdvx8", ThumbnailUrl = "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg", Source = "youtube", Order = 2 },
            new SampleVideo { Name = "Despacito - Luis Fonsi", Url = "https://www.youtube.com/watch?v=kJQP7kiw5Fk", EmbedUrl = "https://www.youtube.com/embed/kJQP7kiw5Fk", ThumbnailUrl = "https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg", Source = "youtube", Order = 3 },
            new SampleVideo { Name = "See You Again - Wiz Khalifa", Url = "https://www.youtube.com/watch?v=RgKAFK5djSk", EmbedUrl = "https://www.youtube.com/embed/RgKAFK5djSk", ThumbnailUrl = "https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg", Source = "youtube", Order = 4 },
            new SampleVideo { Name = "Roar - Katy Perry", Url = "https://www.youtube.com/watch?v=CevxZvSJLk8", EmbedUrl = "https://www.youtube.com/embed/CevxZvSJLk8", ThumbnailUrl = "https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg", Source = "youtube", Order = 5 },
            new SampleVideo { Name = "Gangnam Style - PSY", Url = "https://www.youtube.com/watch?v=9bZkp7q19f0", EmbedUrl = "https://www.youtube.com/embed/9bZkp7q19f0", ThumbnailUrl = "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg", Source = "youtube", Order = 6 },
            new SampleVideo { Name = "First YouTube Video", Url = "https://www.youtube.com/watch?v=jNQXAC9IVRw", EmbedUrl = "https://www.youtube.com/embed/jNQXAC9IVRw", ThumbnailUrl = "https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg", Source = "youtube", Order = 7 },
            new SampleVideo { Name = "Never Gonna Give You Up", Url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ", EmbedUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ", ThumbnailUrl = "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", Source = "youtube", Order = 8 }
        );
        await db.SaveChangesAsync();
    }

    public static async Task SeedLinePresetsAsync(AppDbContext db)
    {
        if (await db.LinePresets.AnyAsync()) return;

        var presets = new List<LinePresetDb>
        {
            // Tab: line
            new() { PresetId="solid-m-black", Name="Nét liền đen vừa", Style="solid", Color="#000000", Thickness=2, Tab="line", Order=1 },
            new() { PresetId="dashed-thick-black", Name="Nét đứt đen đậm", Style="dashed", Color="#000000", Thickness=4, DashArrayJson="[8,4]", Tab="line", Order=2 },
            new() { PresetId="dotted-black", Name="Nét chấm đen", Style="dotted", Color="#000000", Thickness=2, DashArrayJson="[2,4]", Tab="line", Order=3 },
            new() { PresetId="double-black", Name="Đường kép đen", Style="double", Color="#000000", Thickness=2, Tab="line", Order=4 },
            new() { PresetId="solid-xthick-black", Name="Nét liền đen rất đậm", Style="solid", Color="#000000", Thickness=6, Tab="line", Order=5 },
            new() { PresetId="solid-thick-gray", Name="Nét liền xám đậm", Style="solid", Color="#94a3b8", Thickness=4, Tab="line", Order=6 },
            new() { PresetId="solid-thin-black", Name="Nét liền đen mảnh", Style="solid", Color="#000000", Thickness=1, Tab="line", Order=7 },
            new() { PresetId="dashed-thin-black", Name="Nét đứt đen mảnh", Style="dashed", Color="#000000", Thickness=1, DashArrayJson="[6,3]", Tab="line", Order=8 },
            new() { PresetId="solid-thin-gray", Name="Nét liền xám mảnh", Style="solid", Color="#64748b", Thickness=1, Tab="line", Order=9 },
            new() { PresetId="solid-mthick-black", Name="Nét liền đen vừa đậm", Style="solid", Color="#000000", Thickness=3, Tab="line", Order=10 },
            new() { PresetId="solid-thick-black", Name="Nét liền đen đậm", Style="solid", Color="#000000", Thickness=4, Tab="line", Order=11 },
            new() { PresetId="dotted-blue", Name="Nét chấm xanh", Style="dotted", Color="#2563eb", Thickness=3, DashArrayJson="[3,4]", Tab="line", Order=12 },
            new() { PresetId="dashed-green", Name="Nét đứt xanh lá", Style="dashed", Color="#16a34a", Thickness=4, DashArrayJson="[10,5]", Tab="line", Order=13 },
            new() { PresetId="dashed-orange", Name="Nét đứt cam", Style="dashed", Color="#ea580c", Thickness=2, DashArrayJson="[6,3]", Tab="line", Order=14 },
            new() { PresetId="dotted-orange", Name="Nét chấm cam", Style="dotted", Color="#ea580c", Thickness=2, DashArrayJson="[2,3]", Tab="line", Order=15 },
            new() { PresetId="double-orange", Name="Đường kép cam", Style="double", Color="#ea580c", Thickness=2, Tab="line", Order=16 },
            new() { PresetId="solid-blue", Name="Nét liền xanh", Style="solid", Color="#3b82f6", Thickness=2, Tab="line", Order=17 },
            new() { PresetId="solid-red", Name="Nét liền đỏ", Style="solid", Color="#ef4444", Thickness=2, Tab="line", Order=18 },
            new() { PresetId="solid-green", Name="Nét liền xanh lá", Style="solid", Color="#22c55e", Thickness=2, Tab="line", Order=19 },
            new() { PresetId="solid-purple", Name="Nét liền tím", Style="solid", Color="#a855f7", Thickness=2, Tab="line", Order=20 },
            // Tab: pen (for future use)
            new() { PresetId="pen-thin-black", Name="Bút mảnh đen", Style="solid", Color="#000000", Thickness=1, Tab="pen", Order=1 },
            new() { PresetId="pen-medium-black", Name="Bút vừa đen", Style="solid", Color="#000000", Thickness=3, Tab="pen", Order=2 },
            new() { PresetId="pen-thick-black", Name="Bút đậm đen", Style="solid", Color="#000000", Thickness=5, Tab="pen", Order=3 },
            new() { PresetId="pen-thin-red", Name="Bút mảnh đỏ", Style="solid", Color="#ef4444", Thickness=1, Tab="pen", Order=4 },
            new() { PresetId="pen-thin-blue", Name="Bút mảnh xanh", Style="solid", Color="#3b82f6", Thickness=1, Tab="pen", Order=5 },
        };

        db.LinePresets.AddRange(presets);
        await db.SaveChangesAsync();
    }

    public static async Task SeedStockImagesAsync(AppDbContext db)
    {
        if (await db.StockImages.AnyAsync()) return;

        db.StockImages.AddRange(
            new StockImage { Url = "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop", Name = "Văn phòng", Category = "business", Width = 800, Height = 600, Source = "unsplash", Order = 1 },
            new StockImage { Url = "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop", Name = "Họp nhóm", Category = "business", Width = 800, Height = 600, Source = "unsplash", Order = 2 },
            new StockImage { Url = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", Name = "Phân tích dữ liệu", Category = "business", Width = 800, Height = 600, Source = "unsplash", Order = 3 },
            new StockImage { Url = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop", Name = "Núi tuyết", Category = "nature", Width = 800, Height = 600, Source = "unsplash", Order = 4 },
            new StockImage { Url = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop", Name = "Rừng xanh", Category = "nature", Width = 800, Height = 600, Source = "unsplash", Order = 5 },
            new StockImage { Url = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop", Name = "Công nghệ", Category = "technology", Width = 800, Height = 600, Source = "unsplash", Order = 6 },
            new StockImage { Url = "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=600&fit=crop", Name = "Thiết bị điện tử", Category = "technology", Width = 800, Height = 600, Source = "unsplash", Order = 7 },
            new StockImage { Url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop", Name = "Chân dung nam", Category = "people", Width = 800, Height = 600, Source = "unsplash", Order = 8 },
            new StockImage { Url = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop", Name = "Chân dung nữ", Category = "people", Width = 800, Height = 600, Source = "unsplash", Order = 9 },
            new StockImage { Url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop", Name = "Ẩm thực", Category = "food", Width = 800, Height = 600, Source = "unsplash", Order = 10 },
            new StockImage { Url = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop", Name = "Pizza", Category = "food", Width = 800, Height = 600, Source = "unsplash", Order = 11 },
            new StockImage { Url = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop", Name = "Thời trang", Category = "fashion", Width = 800, Height = 600, Source = "unsplash", Order = 12 },
            new StockImage { Url = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop", Name = "Đám cưới", Category = "events", Width = 800, Height = 600, Source = "unsplash", Order = 13 },
            new StockImage { Url = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop", Name = "Hội nghị", Category = "events", Width = 800, Height = 600, Source = "unsplash", Order = 14 },
            new StockImage { Url = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop", Name = "Học online", Category = "education", Width = 800, Height = 600, Source = "unsplash", Order = 15 }
        );
        await db.SaveChangesAsync();
    }

    public static async Task SeedVnAddressAsync(AppDbContext db)
    {
        if (await db.Provinces.AnyAsync()) return;

        // Dữ liệu 63 tỉnh thành với quận/huyện và phường/xã đại diện
        // (có thể mở rộng hoặc import từ file CSV/JSON sau)
        var data = new[]
        {
            new { Name="Hà Nội", Districts=new[]
            {
                new { Name="Quận Ba Đình", Wards=new[]{"Phường Điện Biên","Phường Trúc Bạch","Phường Phúc Xá","Phường Cống Vị","Phường Liễu Giai","Phường Nguyễn Trung Trực","Phường Quán Thánh","Phường Ngọc Hà","Phường Đội Cấn","Phường Thành Công","Phường Kim Mã","Phường Giảng Võ","Phường Vĩnh Phúc"} },
                new { Name="Quận Hoàn Kiếm", Wards=new[]{"Phường Phúc Tân","Phường Đồng Xuân","Phường Hàng Mã","Phường Hàng Buồm","Phường Hàng Đào","Phường Hàng Bồ","Phường Cửa Đông","Phường Lý Thái Tổ","Phường Hàng Bạc","Phường Hàng Gai","Phường Chương Dương","Phường Hàng Trống","Phường Cửa Nam","Phường Hàng Bông","Phường Tràng Tiền","Phường Trần Hưng Đạo","Phường Phan Chu Trinh","Phường Hàng Bài"} },
                new { Name="Quận Tây Hồ", Wards=new[]{"Phường Phú Thượng","Phường Nhật Tân","Phường Tứ Liên","Phường Quảng An","Phường Xuân La","Phường Yên Phụ","Phường Bưởi","Phường Thụy Khuê"} },
                new { Name="Quận Bắc Từ Liêm", Wards=new[]{"Phường Thượng Cát","Phường Liên Mạc","Phường Đông Ngạc","Phường Đức Thắng","Phường Thụy Phương","Phường Tây Tựu","Phường Xuân Đỉnh","Phường Xuân Tảo","Phường Minh Khai","Phường Cổ Nhuế 1","Phường Cổ Nhuế 2","Phường Phú Diễn","Phường Phúc Diễn"} },
                new { Name="Quận Cầu Giấy", Wards=new[]{"Phường Nghĩa Đô","Phường Nghĩa Tân","Phường Mai Dịch","Phường Dịch Vọng","Phường Dịch Vọng Hậu","Phường Quan Hoa","Phường Yên Hoà","Phường Trung Hoà"} },
                new { Name="Quận Đống Đa", Wards=new[]{"Phường Cát Linh","Phường Văn Miếu","Phường Quốc Tử Giám","Phường Láng Thượng","Phường Ô Chợ Dừa","Phường Văn Chương","Phường Hàng Bột","Phường Láng Hạ","Phường Khâm Thiên","Phường Thổ Quan","Phường Nam Đồng","Phường Trung Phụng","Phường Khương Thượng","Phường Ngã Tư Sở","Phường Thịnh Quang","Phường Trung Liệt","Phường Phương Liên","Phường Trung Tự","Phường Kim Liên","Phường Phương Mai","Phường Đống Đa"} },
            } },
            new { Name="TP. Hồ Chí Minh", Districts=new[]
            {
                new { Name="Quận 1", Wards=new[]{"Phường Bến Nghé","Phường Bến Thành","Phường Cầu Kho","Phường Cầu Ông Lãnh","Phường Cô Giang","Phường Đa Kao","Phường Nguyễn Cư Trinh","Phường Nguyễn Thái Bình","Phường Phạm Ngũ Lão","Phường Tân Định"} },
                new { Name="Quận 3", Wards=new[]{"Phường 1","Phường 2","Phường 3","Phường 4","Phường 5","Phường 6","Phường 7","Phường 8","Phường 9","Phường 10","Phường 11","Phường 12","Phường 13","Phường 14"} },
                new { Name="Quận 7", Wards=new[]{"Phường Tân Thuận Đông","Phường Tân Thuận Tây","Phường Tân Kiểng","Phường Tân Hưng","Phường Bình Thuận","Phường Tân Quy","Phường Phú Thuận","Phường Tân Phú","Phường Tân Phong","Phường Phú Mỹ"} },
                new { Name="Quận Bình Thạnh", Wards=new[]{"Phường 1","Phường 2","Phường 3","Phường 5","Phường 6","Phường 7","Phường 11","Phường 12","Phường 13","Phường 14","Phường 15","Phường 17","Phường 19","Phường 21","Phường 22","Phường 24","Phường 25","Phường 26","Phường 27","Phường 28"} },
                new { Name="Quận Tân Bình", Wards=new[]{"Phường 1","Phường 2","Phường 3","Phường 4","Phường 5","Phường 6","Phường 7","Phường 8","Phường 9","Phường 10","Phường 11","Phường 12","Phường 13","Phường 14","Phường 15"} },
                new { Name="Thành phố Thủ Đức", Wards=new[]{"Phường An Khánh","Phường An Lợi Đông","Phường An Phú","Phường Bình Chiểu","Phường Bình Thọ","Phường Bình Trưng Đông","Phường Bình Trưng Tây","Phường Cát Lái","Phường Hiệp Bình Chánh","Phường Hiệp Bình Phước","Phường Hiệp Phú","Phường Linh Chiểu","Phường Linh Đông","Phường Linh Tây","Phường Linh Trung","Phường Linh Xuân","Phường Long Bình","Phường Long Phước","Phường Long Thạnh Mỹ","Phường Long Trường","Phường Phú Hữu","Phường Phước Bình","Phường Phước Long A","Phường Phước Long B","Phường Tam Bình","Phường Tam Phú","Phường Tân Phú","Phường Thảo Điền","Phường Thủ Thiêm","Phường Trường Thạnh"} },
            } },
            new { Name="Đà Nẵng", Districts=new[]
            {
                new { Name="Quận Hải Châu", Wards=new[]{"Phường Hải Châu 1","Phường Hải Châu 2","Phường Thạch Thang","Phường Thanh Bình","Phường Thuận Phước","Phường Bình Hiên","Phường Bình Thuận","Phường Hòa Thuận Tây","Phường Hòa Thuận Đông","Phường Nam Dương","Phường Phước Ninh"} },
                new { Name="Quận Thanh Khê", Wards=new[]{"Phường Tam Thuận","Phường Thanh Khê Tây","Phường Thanh Khê Đông","Phường Xuân Hà","Phường Tân Chính","Phường Chính Gián","Phường Vĩnh Trung","Phường Thạc Gián","Phường An Khê","Phường Hòa Khê"} },
                new { Name="Quận Sơn Trà", Wards=new[]{"Phường Thọ Quang","Phường Nại Hiên Đông","Phường Mân Thái","Phường An Hải Bắc","Phường Phước Mỹ","Phường An Hải Tây","Phường An Hải Đông"} },
            } },
            new { Name="Hải Phòng", Districts=new[]
            {
                new { Name="Quận Hồng Bàng", Wards=new[]{"Phường Quán Toan","Phường Hùng Vương","Phường Sở Dầu","Phường Thượng Lý","Phường Hoàng Văn Thụ","Phường Minh Khai","Phường Trại Cau","Phường Phan Bội Châu","Phường Trần Phú"} },
                new { Name="Quận Ngô Quyền", Wards=new[]{"Phường Máy Chai","Phường Máy Tơ","Phường Vạn Mỹ","Phường Cầu Tre","Phường Lạch Tray","Phường Đằng Giang","Phường Gia Viên","Phường Đông Khê","Phường Cầu Đất","Phường Lê Lợi","Phường Đằng Lâm","Phường Thượng Lý","Phường Đông Hải 1","Phường Đông Hải 2","Phường Đông Hải"} },
            } },
            new { Name="Cần Thơ", Districts=new[]
            {
                new { Name="Quận Ninh Kiều", Wards=new[]{"Phường Cái Khế","Phường An Hòa","Phường Thới Bình","Phường An Nghiệp","Phường An Cư","Phường Tân An","Phường An Phú","Phường Xuân Khánh","Phường Hưng Lợi","Phường An Khánh","Phường An Bình"} },
                new { Name="Quận Bình Thủy", Wards=new[]{"Phường Long Hòa","Phường Long Tuyền","Phường Thới An Đông","Phường An Thới","Phường Bình Thủy","Phường Trà Nóc","Phường Trà An"} },
            } },
            new { Name="Bình Dương", Districts=new[]
            {
                new { Name="Thành phố Thủ Dầu Một", Wards=new[]{"Phường Hiệp Thành","Phường Phú Thọ","Phường Phú Cường","Phường Phú Hòa","Phường Phú Lợi","Phường Phú Mỹ","Phường Chánh Nghĩa","Phường Tương Bình Hiệp","Phường Chánh Mỹ","Phường Định Hoà","Phường Hoà Phú","Phường Phú Tân"} },
                new { Name="Thành phố Dĩ An", Wards=new[]{"Phường Dĩ An","Phường Tân Bình","Phường Tân Đông Hiệp","Phường Bình An","Phường Bình Thắng","Phường Đông Hòa","Phường An Bình"} },
            } },
            new { Name="Đồng Nai", Districts=new[]
            {
                new { Name="Thành phố Biên Hòa", Wards=new[]{"Phường Trảng Dài","Phường Tân Phong","Phường Tân Biên","Phường Hố Nai","Phường Tân Hòa","Phường Tân Hiệp","Phường Bửu Hòa","Phường Long Bình Tân","Phường Tân Vạn","Phường Tân Mai","Phường Thống Nhất","Phường Trung Dũng","Phường Tam Hiệp","Phường Long Bình","Phường Quang Vinh","Phường Tân Tiến","Phường Thanh Bình","Phường Bình Đa","Phường An Bình","Phường Bửu Long","Phường Tân Phước","Phường An Hòa","Phường Hòa Bình","Phường Quyết Thắng","Phường Thanh Bình"} },
            } },
            new { Name="Khánh Hòa", Districts=new[]
            {
                new { Name="Thành phố Nha Trang", Wards=new[]{"Phường Vĩnh Hải","Phường Vĩnh Phước","Phường Ngọc Hiệp","Phường Vĩnh Thọ","Phường Xương Huân","Phường Vạn Thắng","Phường Vạn Thạnh","Phường Phương Sài","Phường Phương Sơn","Phường Phước Hải","Phường Phước Tân","Phường Lộc Thọ","Phường Phước Tiến","Phường Tân Lập","Phường Phước Hòa","Phường Vĩnh Nguyên","Phường Phước Long","Phường Vĩnh Trường"} },
            } },
            new { Name="Nghệ An", Districts=new[]
            {
                new { Name="Thành phố Vinh", Wards=new[]{"Phường Đông Vĩnh","Phường Hà Huy Tập","Phường Lê Lợi","Phường Quang Trung","Phường Đội Cung","Phường Hưng Bình","Phường Hưng Phúc","Phường Hưng Dũng","Phường Cửa Nam","Phường Quán Bàu","Phường Bến Thủy","Phường Trường Thi","Phường Hà Huy Tập","Phường Vinh Tân","Phường Hưng Chính","Phường Nghi Phú"} },
            } },
            new { Name="Thừa Thiên Huế", Districts=new[]
            {
                new { Name="Thành phố Huế", Wards=new[]{"Phường Phú Thuận","Phường Phú Bình","Phường Tây Lộc","Phường Thuận Lộc","Phường Phú Hiệp","Phường Phú Hậu","Phường Thuận Hòa","Phường Thuận Thành","Phường Phú Hòa","Phường Phú Cát","Phường Kim Long","Phường Vĩ Dạ","Phường Phường Đúc","Phường Vĩnh Ninh","Phường Phú Hội","Phường Phú Nhuận","Phường Xuân Phú","Phường Trường An","Phường Phước Vĩnh","Phường An Cựu","Phường Hương Sơ","Phường Thủy Biều","Phường Hương Long","Phường Thủy Xuân","Phường An Đông","Phường An Tây"} },
            } },
            new { Name="Lâm Đồng", Districts=new[]
            {
                new { Name="Thành phố Đà Lạt", Wards=new[]{"Phường 1","Phường 2","Phường 3","Phường 4","Phường 5","Phường 6","Phường 7","Phường 8","Phường 9","Phường 10","Phường 11","Phường 12"} },
            } },
            new { Name="Kiên Giang", Districts=new[]
            {
                new { Name="Thành phố Rạch Giá", Wards=new[]{"Phường Vĩnh Thanh Vân","Phường Vĩnh Thanh","Phường Vĩnh Quang","Phường Vĩnh Hiệp","Phường Vĩnh Bảo","Phường Vĩnh Lạc","Phường An Hòa","Phường An Bình","Phường Rạch Sỏi","Phường Vĩnh Mỹ","Phường Vĩnh Thông"} },
            } },
            new { Name="An Giang", Districts=new[]
            {
                new { Name="Thành phố Long Xuyên", Wards=new[]{"Phường Mỹ Bình","Phường Mỹ Long","Phường Đông Xuyên","Phường Mỹ Xuyên","Phường Bình Đức","Phường Bình Khánh","Phường Mỹ Phước","Phường Mỹ Quý","Phường Mỹ Thới","Phường Mỹ Thạnh","Phường Mỹ Hòa"} },
            } },
        };

        int provinceOrder = 1;
        int districtOrder = 1;
        int wardOrder = 1;

        foreach (var p in data)
        {
            var province = new Province { Name = p.Name, Order = provinceOrder++ };
            db.Provinces.Add(province);
            await db.SaveChangesAsync();

            districtOrder = 1;
            foreach (var d in p.Districts)
            {
                var district = new District { ProvinceId = province.Id, Name = d.Name, Order = districtOrder++ };
                db.Districts.Add(district);
                await db.SaveChangesAsync();

                wardOrder = 1;
                foreach (var w in d.Wards)
                {
                    db.Wards.Add(new Ward { DistrictId = district.Id, Name = w, Order = wardOrder++ });
                }
                await db.SaveChangesAsync();
            }
        }
    }

    // ─── Page Templates (từ thư mục pages mẫu/) ────────────────────────────

    /// <summary>
    /// Seed / đồng bộ toàn bộ template từ "pages mẫu/" vào DB.
    /// Nếu DB đã có templates cũ (khác ID catalog) → xóa rồi seed lại.
    /// </summary>
    public static async Task SeedPageTemplatesAsync(AppDbContext db)
    {
        // Kiểm tra bằng tên template đầu tiên — nếu đã có thì bỏ qua
        const int expectedCount = 37;
        var existingCount = await db.Templates.CountAsync();
        if (existingCount >= expectedCount) return;

        // Xóa toàn bộ templates cũ để seed lại sạch
        if (existingCount > 0)
        {
            var existing = await db.Templates.ToListAsync();
            db.Templates.RemoveRange(existing);
            await db.SaveChangesAsync();
        }

        static string IframeJson(string src)
        {
            var contentObj = new { subType = "iframe", iframeSrc = src };
            var contentJson = System.Text.Json.JsonSerializer.Serialize(contentObj);
            var doc = new
            {
                sections = new[]
                {
                    new
                    {
                        id = 1, pageId = 0, order = 1, height = 900,
                        visible = true, isLocked = false, name = "Template",
                        backgroundColor = (string?)null, backgroundImageUrl = (string?)null,
                        elements = new[]
                        {
                            new
                            {
                                id = 1, sectionId = 1, type = "html-code", order = 1,
                                x = 0, y = 0, width = 960, height = 900, zIndex = 1,
                                rotation = 0, opacity = 1.0, isLocked = false, isHidden = false,
                                content = contentJson,
                                styles = new { fullScreen = true },
                            },
                        },
                    },
                },
            };
            return System.Text.Json.JsonSerializer.Serialize(doc);
        }

        var now = DateTime.UtcNow;
        var templates = new List<Template>
        {
            // ── MobApp ──────────────────────────────────────────────────
            new() { Name="MobApp — Landing Page Ứng Dụng", Category="Công nghệ",
                Description="Landing page giới thiệu ứng dụng mobile với hero, tính năng nổi bật, screenshots và nút tải app.",
                DesignType="responsive", IsFeatured=true, UsageCount=420, JsonContent=IframeJson("/templates/mobapp-master/index.html"), CreatedAt=now },

            // ── Tasty ───────────────────────────────────────────────────
            new() { Name="Tasty — Trang Chủ Nhà Hàng", Category="Nhà hàng",
                Description="Trang chủ nhà hàng với hero banner, menu nổi bật, câu chuyện thương hiệu và khu đặt bàn.",
                DesignType="responsive", IsFeatured=true, UsageCount=380, JsonContent=IframeJson("/templates/tasty-master/index.html"), CreatedAt=now },
            new() { Name="Tasty — Thực Đơn", Category="Nhà hàng",
                Description="Trang thực đơn phân loại theo danh mục, hiển thị ảnh món ăn và giá hấp dẫn.",
                DesignType="responsive", UsageCount=210, JsonContent=IframeJson("/templates/tasty-master/menu.html"), CreatedAt=now },
            new() { Name="Tasty — Đặt Bàn", Category="Nhà hàng",
                Description="Trang đặt bàn trực tuyến với form ngày giờ, số khách và xác nhận tự động.",
                DesignType="responsive", UsageCount=175, JsonContent=IframeJson("/templates/tasty-master/reservation.html"), CreatedAt=now },
            new() { Name="Tasty — Gallery Món Ăn", Category="Nhà hàng",
                Description="Trang gallery trình bày ảnh món ăn và không gian nhà hàng theo dạng lưới đẹp.",
                DesignType="responsive", UsageCount=142, JsonContent=IframeJson("/templates/tasty-master/gallery.html"), CreatedAt=now },
            new() { Name="Tasty — Giới Thiệu", Category="Nhà hàng",
                Description="Trang about us: câu chuyện thương hiệu, đội ngũ đầu bếp và triết lý ẩm thực.",
                DesignType="responsive", UsageCount=118, JsonContent=IframeJson("/templates/tasty-master/about.html"), CreatedAt=now },
            new() { Name="Tasty — Liên Hệ", Category="Nhà hàng",
                Description="Trang liên hệ với bản đồ, địa chỉ, giờ mở cửa và form gửi tin nhắn.",
                DesignType="responsive", UsageCount=96, JsonContent=IframeJson("/templates/tasty-master/contact.html"), CreatedAt=now },

            // ── Titan Landing / Agency / Finance ────────────────────────
            new() { Name="Titan — Agency Landing", Category="Agency",
                Description="Landing page agency hiện đại, multi-section với hero fullscreen, dịch vụ, portfolio và form liên hệ.",
                DesignType="responsive", IsFeatured=true, UsageCount=510, JsonContent=IframeJson("/templates/live/index_agency.html"), CreatedAt=now },
            new() { Name="Titan — Finance Landing", Category="Tài chính",
                Description="Landing page tài chính / fintech chuyên nghiệp với bảng giá, thống kê và testimonial.",
                DesignType="responsive", IsFeatured=true, UsageCount=340, JsonContent=IframeJson("/templates/live/index_finance.html"), CreatedAt=now },
            new() { Name="Titan — Multipurpose Landing", Category="Landing Page",
                Description="Landing page đa năng: hero nổi bật, tính năng sản phẩm, bảng giá và CTA mạnh.",
                DesignType="responsive", IsFeatured=true, UsageCount=620, JsonContent=IframeJson("/templates/live/index_landing.html"), CreatedAt=now },
            new() { Name="Titan — Classic Flexslider", Category="Landing Page",
                Description="Landing page với slider cuộn mượt, giới thiệu sản phẩm theo phong cách cổ điển.",
                DesignType="responsive", UsageCount=185, JsonContent=IframeJson("/templates/live/index_mp_classic_flexslider.html"), CreatedAt=now },
            new() { Name="Titan — Classic Gradient Overlay", Category="Landing Page",
                Description="Landing page hero toàn màn hình với gradient overlay ấn tượng và nội dung tập trung.",
                DesignType="responsive", UsageCount=198, JsonContent=IframeJson("/templates/live/index_mp_classic_gradient_overlay.html"), CreatedAt=now },
            new() { Name="Titan — Classic Static", Category="Landing Page",
                Description="Landing page hero tĩnh, tối giản, phù hợp sản phẩm đơn giản cần thông điệp rõ ràng.",
                DesignType="responsive", UsageCount=154, JsonContent=IframeJson("/templates/live/index_mp_classic_static.html"), CreatedAt=now },
            new() { Name="Titan — Classic Text Rotator", Category="Landing Page",
                Description="Landing page với tiêu đề xoay động, thu hút sự chú ý và truyền tải nhiều thông điệp.",
                DesignType="responsive", UsageCount=167, JsonContent=IframeJson("/templates/live/index_mp_classic_text_rotator.html"), CreatedAt=now },

            // ── About Us ────────────────────────────────────────────────
            new() { Name="Titan — About Us v1", Category="Dịch vụ",
                Description="Trang giới thiệu công ty phong cách tối giản: sứ mệnh, đội ngũ và các số liệu nổi bật.",
                DesignType="responsive", UsageCount=132, JsonContent=IframeJson("/templates/live/about1.html"), CreatedAt=now },
            new() { Name="Titan — About Us v2", Category="Dịch vụ",
                Description="Trang about với timeline lịch sử phát triển, ảnh đội ngũ và giá trị cốt lõi.",
                DesignType="responsive", UsageCount=118, JsonContent=IframeJson("/templates/live/about2.html"), CreatedAt=now },
            new() { Name="Titan — About Us v3", Category="Dịch vụ",
                Description="Trang giới thiệu sáng tạo với video background, thành tựu và câu chuyện thương hiệu.",
                DesignType="responsive", UsageCount=109, JsonContent=IframeJson("/templates/live/about3.html"), CreatedAt=now },
            new() { Name="Titan — About Us v4", Category="Dịch vụ",
                Description="Trang about với layout 2 cột ngang, ảnh lớn và copy ngắn gọn súc tích.",
                DesignType="responsive", UsageCount=97, JsonContent=IframeJson("/templates/live/about4.html"), CreatedAt=now },
            new() { Name="Titan — About Us v5", Category="Dịch vụ",
                Description="Trang about phong cách bold: số liệu khổng lồ, testimonial và CTA tuyển dụng.",
                DesignType="responsive", UsageCount=88, JsonContent=IframeJson("/templates/live/about5.html"), CreatedAt=now },

            // ── Contact ─────────────────────────────────────────────────
            new() { Name="Titan — Contact v1", Category="Liên hệ",
                Description="Trang liên hệ đơn giản với form, địa chỉ, số điện thoại và bản đồ Google Maps.",
                DesignType="responsive", UsageCount=145, JsonContent=IframeJson("/templates/live/contact1.html"), CreatedAt=now },
            new() { Name="Titan — Contact v2", Category="Liên hệ",
                Description="Trang liên hệ với hero section, nhiều phương thức liên hệ và FAQ tích hợp.",
                DesignType="responsive", UsageCount=128, JsonContent=IframeJson("/templates/live/contact2.html"), CreatedAt=now },
            new() { Name="Titan — Contact v3", Category="Liên hệ",
                Description="Trang liên hệ đầy đủ: bản đồ toàn màn hình, form nổi và thông tin chi nhánh.",
                DesignType="responsive", UsageCount=113, JsonContent=IframeJson("/templates/live/contact3.html"), CreatedAt=now },

            // ── Blog Grid ───────────────────────────────────────────────
            new() { Name="Titan — Blog Lưới 2 Cột", Category="Blog",
                Description="Trang blog dạng lưới 2 cột rộng, tập trung ảnh thumbnail lớn và tiêu đề nổi bật.",
                DesignType="responsive", UsageCount=210, JsonContent=IframeJson("/templates/live/blog_grid_col_2.html"), CreatedAt=now },
            new() { Name="Titan — Blog Lưới 3 Cột", Category="Blog",
                Description="Trang blog dạng lưới 3 cột, cân bằng giữa số lượng bài và khả năng đọc.",
                DesignType="responsive", IsFeatured=true, UsageCount=289, JsonContent=IframeJson("/templates/live/blog_grid_col_3.html"), CreatedAt=now },
            new() { Name="Titan — Blog Lưới 4 Cột", Category="Blog",
                Description="Trang blog dạng lưới 4 cột dày đặc, tối ưu cho nhiều nội dung và sidebar.",
                DesignType="responsive", UsageCount=178, JsonContent=IframeJson("/templates/live/blog_grid_col_4.html"), CreatedAt=now },
            new() { Name="Titan — Blog Masonry 2 Cột", Category="Blog",
                Description="Blog dạng masonry 2 cột, bài viết cao thấp xen kẽ tạo layout sinh động.",
                DesignType="responsive", UsageCount=156, JsonContent=IframeJson("/templates/live/blog_grid_masonry_col_2.html"), CreatedAt=now },
            new() { Name="Titan — Blog Masonry 3 Cột", Category="Blog",
                Description="Blog dạng masonry 3 cột — định dạng Pinterest, mỗi bài có chiều cao khác nhau.",
                DesignType="responsive", UsageCount=201, JsonContent=IframeJson("/templates/live/blog_grid_masonry_col_3.html"), CreatedAt=now },
            new() { Name="Titan — Blog Masonry 4 Cột", Category="Blog",
                Description="Blog masonry 4 cột dày đặc, tạo ra một tường nội dung phong phú và cuốn hút.",
                DesignType="responsive", UsageCount=142, JsonContent=IframeJson("/templates/live/blog_grid_masonry_col_4.html"), CreatedAt=now },
            new() { Name="Titan — Blog Single (Sidebar Trái)", Category="Blog",
                Description="Trang bài viết chi tiết với sidebar trái: danh mục, bài liên quan và widget tìm kiếm.",
                DesignType="responsive", UsageCount=134, JsonContent=IframeJson("/templates/live/blog_single_left_sidebar.html"), CreatedAt=now },
            new() { Name="Titan — Blog Single (Sidebar Phải)", Category="Blog",
                Description="Trang bài viết chi tiết với sidebar phải: tag cloud, bài mới nhất và quảng cáo.",
                DesignType="responsive", UsageCount=147, JsonContent=IframeJson("/templates/live/blog_single_right_sidebar.html"), CreatedAt=now },
            new() { Name="Titan — Blog Standard (Sidebar Trái)", Category="Blog",
                Description="Blog danh sách chuẩn với sidebar trái, mỗi bài hiển thị ảnh + đoạn trích.",
                DesignType="responsive", UsageCount=119, JsonContent=IframeJson("/templates/live/blog_standard_left_sidebar.html"), CreatedAt=now },
            new() { Name="Titan — Blog Standard (Sidebar Phải)", Category="Blog",
                Description="Blog danh sách chuẩn với sidebar phải, bố cục truyền thống dễ đọc và quen thuộc.",
                DesignType="responsive", UsageCount=127, JsonContent=IframeJson("/templates/live/blog_standard_right_sidebar.html"), CreatedAt=now },

            // ── Gallery ─────────────────────────────────────────────────
            new() { Name="Titan — Gallery 2 Cột", Category="Gallery",
                Description="Trang gallery ảnh 2 cột lớn, phù hợp portfolio sáng tạo hoặc triển lãm nhiếp ảnh.",
                DesignType="responsive", UsageCount=158, JsonContent=IframeJson("/templates/live/gallery_col_2.html"), CreatedAt=now },
            new() { Name="Titan — Gallery 3 Cột", Category="Gallery",
                Description="Gallery 3 cột cân đối, hiển thị nhiều ảnh với hover effect và lightbox.",
                DesignType="responsive", IsFeatured=true, UsageCount=234, JsonContent=IframeJson("/templates/live/gallery_col_3.html"), CreatedAt=now },
            new() { Name="Titan — Gallery 4 Cột", Category="Gallery",
                Description="Gallery 4 cột dày đặc, tối ưu cho portfolio lớn và thư viện ảnh nhiều mục.",
                DesignType="responsive", UsageCount=189, JsonContent=IframeJson("/templates/live/gallery_col_4.html"), CreatedAt=now },
            new() { Name="Titan — Gallery 6 Cột", Category="Gallery",
                Description="Gallery 6 cột miniature, tạo mosaic ảnh đẹp mắt cho website thời trang hay thiết kế.",
                DesignType="responsive", UsageCount=143, JsonContent=IframeJson("/templates/live/gallery_col_6.html"), CreatedAt=now },

            // ── FAQ ─────────────────────────────────────────────────────
            new() { Name="Titan — FAQ / Câu Hỏi Thường Gặp", Category="Dịch vụ",
                Description="Trang FAQ với accordion expand/collapse, thanh tìm kiếm và phân loại câu hỏi theo chủ đề.",
                DesignType="responsive", UsageCount=196, JsonContent=IframeJson("/templates/live/faq.html"), CreatedAt=now },
        };

        db.Templates.AddRange(templates);
        await db.SaveChangesAsync();
    }

    // ─── Editor JSON Templates ─────────────────────────────────────────────
    // Templates sử dụng JSON editor thực sự (có thể chỉnh sửa từng phần tử)

    public static async Task SeedEditorTemplatesAsync(AppDbContext db)
    {
        const string Marker = "[editor]";
        var existingEditor = await db.Templates.CountAsync(t => t.Name.StartsWith(Marker));
        if (existingEditor >= 15) return;

        if (existingEditor > 0)
        {
            var old = await db.Templates.Where(t => t.Name.StartsWith(Marker)).ToListAsync();
            db.Templates.RemoveRange(old);
            await db.SaveChangesAsync();
        }

        // ── Builder helpers ──────────────────────────────────────────────────
        static string Ej(params object[] sections) =>
            System.Text.Json.JsonSerializer.Serialize(new { sections });

        static object Sec(int id, int ord, int h, string name, string? bg, params object[] els) =>
            new { id, pageId = 0, order = ord, height = h, visible = true, isLocked = false,
                  name, backgroundColor = bg, backgroundImageUrl = (string?)null, elements = els };

        static object El(int id, int sec, string type, int ord, int x, int y, int w, int h,
                         string content, object styles) =>
            new { id, sectionId = sec, type, order = ord, x, y, width = w, height = h,
                  zIndex = 1, rotation = 0, opacity = 1.0, isLocked = false, isHidden = false,
                  content, styles };

        static string FormContent(string title, string btn, string btnColor, string btnText,
                                  string bg, params (string id, string label, string type)[] fields) =>
            System.Text.Json.JsonSerializer.Serialize(new
            {
                title, buttonText = btn, buttonColor = btnColor, buttonTextColor = btnText,
                backgroundColor = bg,
                fields = fields.Select(f => new { f.id, label = f.label, type = f.type, required = true }).ToArray(),
            });

        var now = DateTime.UtcNow;

        var templates = new List<Template>
        {
            // ── 1. SaaS / Tech ────────────────────────────────────────────
            new() {
                Name = Marker + " SaaS — Landing Page Phần Mềm", Category = "Công nghệ",
                Description = "Landing page SaaS với hero tối, feature cards, testimonial và CTA. Chỉnh sửa được từng phần tử.",
                IsFeatured = true, UsageCount = 480, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 580, "Hero", "#1e3a8a",
                        El(101, 1, "headline", 1, 80, 90, 800, 90, "Giải Pháp Phần Mềm\nHàng Đầu Doanh Nghiệp",
                            new { fontSize=48, fontWeight=700, fontFamily="Inter", color="#ffffff", textAlign="center", lineHeight=1.2 }),
                        El(102, 1, "paragraph", 2, 160, 220, 640, 60, "Nền tảng quản lý thông minh giúp tăng doanh thu, tiết kiệm chi phí và tối ưu quy trình vận hành.",
                            new { fontSize=18, fontWeight=400, fontFamily="Inter", color="#bfdbfe", textAlign="center", lineHeight=1.6 }),
                        El(103, 1, "button", 3, 270, 320, 200, 52, "Dùng thử miễn phí",
                            new { backgroundColor="#f59e0b", color="#0f172a", borderRadius=10, fontSize=16, fontWeight=700 }),
                        El(104, 1, "button", 4, 490, 320, 160, 52, "Xem demo",
                            new { backgroundColor="transparent", color="#ffffff", borderRadius=10, fontSize=15, fontWeight=600, borderWidth=2, borderColor="#ffffff" }),
                        El(105, 1, "text", 5, 160, 410, 640, 50, "✓ Không cần thẻ tín dụng  ✓ Dùng thử 14 ngày  ✓ Hủy bất cứ lúc nào",
                            new { fontSize=13, fontWeight=500, fontFamily="Inter", color="#93c5fd", textAlign="center" })
                    ),
                    Sec(2, 2, 380, "Features", "#ffffff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Tại sao chọn chúng tôi?",
                            new { fontSize=32, fontWeight=700, fontFamily="Inter", color="#0f172a", textAlign="center" }),
                        El(202, 2, "text", 2, 40, 110, 270, 220, "⚡ Nhanh chóng\n\nTriển khai trong 24 giờ, không cần kỹ thuật. Giao diện đơn giản, sẵn sàng ngay từ ngày đầu.",
                            new { fontSize=14, fontFamily="Inter", color="#475569", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 }),
                        El(203, 2, "text", 3, 345, 110, 270, 220, "🔒 Bảo mật tuyệt đối\n\nDữ liệu mã hóa 256-bit, backup tự động hàng ngày, tuân thủ chuẩn ISO 27001.",
                            new { fontSize=14, fontFamily="Inter", color="#475569", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 }),
                        El(204, 2, "text", 4, 650, 110, 270, 220, "📊 Báo cáo thông minh\n\nDashboard real-time, phân tích AI, dự báo xu hướng kinh doanh tự động.",
                            new { fontSize=14, fontFamily="Inter", color="#475569", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 })
                    ),
                    Sec(3, 3, 260, "CTA", "#1e3a8a",
                        El(301, 3, "headline", 1, 80, 50, 800, 60, "Bắt đầu dùng miễn phí ngay hôm nay",
                            new { fontSize=36, fontWeight=700, fontFamily="Inter", color="#ffffff", textAlign="center" }),
                        El(302, 3, "paragraph", 2, 200, 130, 560, 36, "Không cần thẻ tín dụng. Dùng thử 14 ngày, hủy bất cứ lúc nào.",
                            new { fontSize=15, fontFamily="Inter", color="#bfdbfe", textAlign="center" }),
                        El(303, 3, "button", 3, 380, 185, 200, 52, "Đăng ký ngay",
                            new { backgroundColor="#f59e0b", color="#0f172a", borderRadius=10, fontSize=16, fontWeight=700 })
                    )
                )
            },

            // ── 2. Flash Sale Bán hàng ────────────────────────────────────
            new() {
                Name = Marker + " Bán hàng — Flash Sale Khẩn Cấp", Category = "Bán hàng",
                Description = "Landing page flash sale với countdown đếm ngược, hiển thị sản phẩm và form đặt hàng nhanh.",
                IsFeatured = true, UsageCount = 620, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 300, "Flash Banner", "#b91c1c",
                        El(101, 1, "headline", 1, 80, 36, 800, 80, "⚡ FLASH SALE — GIẢM 50%",
                            new { fontSize=52, fontWeight=900, fontFamily="Inter", color="#ffffff", textAlign="center", letterSpacing=-1 }),
                        El(102, 1, "countdown", 2, 290, 140, 380, 90, "",
                            new { backgroundColor="#7f1d1d", color="#fef2f2", fontSize=34, fontWeight=700, borderRadius=12, textAlign="center" }),
                        El(103, 1, "paragraph", 3, 160, 248, 640, 36, "Ưu đãi chỉ có trong hôm nay — Số lượng có hạn, hành động ngay!",
                            new { fontSize=15, fontWeight=600, fontFamily="Inter", color="#fecaca", textAlign="center" })
                    ),
                    Sec(2, 2, 460, "Product", "#ffffff",
                        El(201, 2, "image", 1, 60, 40, 380, 300, "Hình ảnh sản phẩm",
                            new { borderRadius=16, objectFit="cover", backgroundColor="#f1f5f9" }),
                        El(202, 2, "headline", 2, 480, 40, 420, 60, "Tên Sản Phẩm Nổi Bật",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#0f172a" }),
                        El(203, 2, "text", 3, 480, 115, 420, 40, "Giá: 599.000đ  (Thường: 1.200.000đ)",
                            new { fontSize=20, fontWeight=700, fontFamily="Inter", color="#b91c1c" }),
                        El(204, 2, "paragraph", 4, 480, 170, 420, 72, "Chất liệu cao cấp, thiết kế hiện đại. Miễn phí vận chuyển toàn quốc. Đổi trả trong 30 ngày.",
                            new { fontSize=14, fontFamily="Inter", color="#475569", lineHeight=1.6 }),
                        El(205, 2, "form", 5, 480, 260, 420, 170,
                            FormContent("", "ĐẶT HÀNG NGAY", "#b91c1c", "#ffffff", "#fff1f2",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone")),
                            new { borderRadius=8, fontSize=14 })
                    ),
                    Sec(3, 3, 200, "Guarantee", "#fff7ed",
                        El(301, 3, "text", 1, 80, 40, 800, 120, "🚚 Miễn phí vận chuyển toàn quốc\n🔄 Đổi trả trong 30 ngày\n⭐ Cam kết hàng chính hãng 100%",
                            new { fontSize=15, fontFamily="Inter", color="#92400e", textAlign="center", lineHeight=2 })
                    )
                )
            },

            // ── 3. Khóa học Online ─────────────────────────────────────────
            new() {
                Name = Marker + " Giáo dục — Đăng Ký Khóa Học Online", Category = "Giáo dục",
                Description = "Landing page đăng ký khóa học với giới thiệu chương trình, lợi ích và form đăng ký.",
                IsFeatured = true, UsageCount = 390, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 540, "Hero Course", "#4c1d95",
                        El(101, 1, "text", 1, 80, 40, 400, 32, "🎓 KHÓA HỌC TRỰC TUYẾN",
                            new { fontSize=13, fontWeight=700, fontFamily="Inter", color="#c4b5fd", letterSpacing=2, textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 85, 500, 110, "Lập Trình Web\nTừ Zero to Hero",
                            new { fontSize=44, fontWeight=800, fontFamily="Inter", color="#ffffff", lineHeight=1.2 }),
                        El(103, 1, "text", 3, 80, 215, 480, 80, "✓ 120+ giờ video chất lượng cao\n✓ Dự án thực tế cùng mentor\n✓ Chứng chỉ được công nhận",
                            new { fontSize=15, fontFamily="Inter", color="#ddd6fe", lineHeight=2 }),
                        El(104, 1, "button", 4, 80, 315, 220, 52, "Đăng ký học thử miễn phí",
                            new { backgroundColor="#f59e0b", color="#0f172a", borderRadius=10, fontSize=15, fontWeight=700 }),
                        El(105, 1, "text", 5, 80, 385, 480, 36, "Học phí: 3.990.000đ  (Tiết kiệm 2.000.000đ — còn 48 giờ)",
                            new { fontSize=14, fontWeight=600, fontFamily="Inter", color="#fde68a" }),
                        El(106, 1, "image", 6, 560, 60, 360, 420, "Ảnh khóa học",
                            new { borderRadius=16, backgroundColor="#6d28d9" })
                    ),
                    Sec(2, 2, 340, "Benefits", "#faf5ff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Bạn sẽ học được gì?",
                            new { fontSize=30, fontWeight=700, fontFamily="Inter", color="#4c1d95", textAlign="center" }),
                        El(202, 2, "text", 2, 60, 110, 420, 190, "📌 HTML, CSS, JavaScript nâng cao\n📌 ReactJS & Node.js\n📌 Cơ sở dữ liệu MongoDB & SQL\n📌 Deploy lên AWS / Vercel",
                            new { fontSize=15, fontFamily="Inter", color="#374151", lineHeight=2, backgroundColor="#ede9fe", borderRadius=12, padding=20 }),
                        El(203, 2, "text", 3, 510, 110, 390, 190, "🏆 Học viên tiêu biểu:\n\nNguyễn Văn A — Hiện là Frontend Dev tại VNG\nTrần Thị B — Freelancer kiếm 50 triệu/tháng\nLê Văn C — Startup nhận đầu tư 2 tỷ đồng",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#f5f3ff", borderRadius=12, padding=16 })
                    ),
                    Sec(3, 3, 300, "Register", "#4c1d95",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Đăng ký ngay — Khai giảng 15/05/2025",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#ffffff", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 106, 480, 172,
                            FormContent("", "ĐĂNG KÝ HỌC THỬ MIỄN PHÍ", "#f59e0b", "#0f172a", "#3b0764",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("email","Email","email")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 4. Sự kiện / Hội thảo ─────────────────────────────────────
            new() {
                Name = Marker + " Sự kiện — Hội Thảo / Webinar", Category = "Sự kiện",
                Description = "Landing page hội thảo hoặc webinar với countdown, diễn giả và form đăng ký.",
                IsFeatured = false, UsageCount = 315, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 520, "Event Hero", "#0f172a",
                        El(101, 1, "text", 1, 80, 50, 800, 32, "📅 THỨ 6, NGÀY 30/05/2025  |  19:00 — 21:00  |  TRỰC TUYẾN",
                            new { fontSize=13, fontWeight=600, fontFamily="Inter", color="#94a3b8", textAlign="center", letterSpacing=1 }),
                        El(102, 1, "headline", 2, 80, 100, 800, 100, "Chiến Lược Tăng Trưởng\nDoanh Nghiệp 2025",
                            new { fontSize=46, fontWeight=800, fontFamily="Inter", color="#f8fafc", textAlign="center", lineHeight=1.2 }),
                        El(103, 1, "paragraph", 3, 160, 220, 640, 56, "Tham gia cùng 500+ doanh nhân Việt Nam học hỏi chiến lược thực chiến từ các chuyên gia hàng đầu.",
                            new { fontSize=17, fontFamily="Inter", color="#cbd5e1", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "countdown", 4, 230, 300, 500, 100, "",
                            new { backgroundColor="#1e293b", color="#f8fafc", fontSize=34, fontWeight=700, borderRadius=12 }),
                        El(105, 1, "button", 5, 365, 420, 230, 56, "Đăng ký tham dự — MIỄN PHÍ",
                            new { backgroundColor="#6366f1", color="#ffffff", borderRadius=10, fontSize=15, fontWeight=700 })
                    ),
                    Sec(2, 2, 340, "Speakers", "#ffffff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Diễn giả tiêu biểu",
                            new { fontSize=30, fontWeight=700, fontFamily="Inter", color="#0f172a", textAlign="center" }),
                        El(202, 2, "text", 2, 60, 110, 260, 180, "👤 Nguyễn Minh Tuấn\nCEO & Founder — ABC Corp\n\n\"10 năm kinh nghiệm xây dựng startup từ 0 lên 100 tỷ doanh thu hàng năm\"",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 }),
                        El(203, 2, "text", 3, 350, 110, 260, 180, "👤 Trần Thị Bảo Châu\nCMO — XYZ Digital\n\n\"Chuyên gia marketing số với hơn 1000 chiến dịch thành công tại Đông Nam Á\"",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 }),
                        El(204, 2, "text", 4, 640, 110, 260, 180, "👤 Lê Hoàng Phúc\nPartner — Startup Fund\n\n\"Đã đầu tư vào 50+ startup, tổng giá trị danh mục vượt 500 triệu USD\"",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f8fafc", borderRadius=12, padding=16 })
                    ),
                    Sec(3, 3, 280, "Register Event", "#6366f1",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Giữ chỗ của bạn ngay!",
                            new { fontSize=30, fontWeight=700, fontFamily="Inter", color="#ffffff", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐĂNG KÝ MIỄN PHÍ", "#ffffff", "#4f46e5", "#4338ca",
                                ("name","Họ và tên","text"), ("email","Email nhận link tham dự","email"), ("phone","Số điện thoại","phone")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 5. Spa / Làm đẹp ─────────────────────────────────────────
            new() {
                Name = Marker + " Làm đẹp — Spa & Chăm Sóc Da", Category = "Làm đẹp",
                Description = "Landing page spa và dịch vụ làm đẹp với bảng giá dịch vụ và form đặt lịch.",
                IsFeatured = false, UsageCount = 280, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 500, "Spa Hero", "#fdf2f8",
                        El(101, 1, "text", 1, 80, 60, 500, 28, "✨ LUXURY SPA & BEAUTY",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#be185d", letterSpacing=3, textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 102, 480, 110, "Trải Nghiệm Làm Đẹp\nĐẳng Cấp 5 Sao",
                            new { fontSize=42, fontWeight=800, fontFamily="Georgia", color="#831843", lineHeight=1.25 }),
                        El(103, 1, "paragraph", 3, 80, 232, 440, 72, "Đội ngũ chuyên gia 10 năm kinh nghiệm. Sản phẩm nhập khẩu cao cấp. Không gian sang trọng, thư giãn tuyệt đối.",
                            new { fontSize=15, fontFamily="Inter", color="#9d174d", lineHeight=1.7 }),
                        El(104, 1, "button", 4, 80, 322, 210, 52, "Đặt lịch ngay",
                            new { backgroundColor="#db2777", color="#ffffff", borderRadius=99, fontSize=15, fontWeight=700 }),
                        El(105, 1, "text", 5, 80, 392, 440, 40, "Hotline: 0901 234 567  |  Mở cửa: 8:00 — 21:00 hàng ngày",
                            new { fontSize=13, fontFamily="Inter", color="#9d174d" }),
                        El(106, 1, "image", 6, 540, 50, 380, 400, "Ảnh spa",
                            new { borderRadius=20, backgroundColor="#fce7f3" })
                    ),
                    Sec(2, 2, 380, "Services", "#ffffff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Dịch Vụ Nổi Bật",
                            new { fontSize=30, fontWeight=700, fontFamily="Georgia", color="#831843", textAlign="center" }),
                        El(202, 2, "text", 2, 40, 110, 200, 220, "💆 Massage Thư Giãn\n\n60 phút / 90 phút\n\nThải độc cơ thể, giảm stress, cải thiện giấc ngủ\n\n599.000đ — 799.000đ",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#fff0f9", borderRadius=12, padding=16 }),
                        El(203, 2, "text", 3, 260, 110, 200, 220, "✨ Chăm Sóc Da Mặt\n\n90 phút điều trị\n\nLàm sạch sâu, trẻ hoá da, trị thâm nám hiệu quả\n\n890.000đ",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#fff0f9", borderRadius=12, padding=16 }),
                        El(204, 2, "text", 4, 480, 110, 200, 220, "💅 Làm Nail\n\nĐắp gel, vẽ nail nghệ thuật\n\nThiết kế độc đáo theo yêu cầu, bền màu 3-4 tuần\n\nTừ 199.000đ",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#fff0f9", borderRadius=12, padding=16 }),
                        El(205, 2, "text", 5, 700, 110, 200, 220, "🌸 Gói VIP Trọn Gói\n\nMassage + Da mặt + Nail\n\nTrải nghiệm dịch vụ 5 sao toàn diện trong một ngày\n\n1.599.000đ",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#fce7f3", borderRadius=12, padding=16, borderWidth=1, borderColor="#f9a8d4" })
                    ),
                    Sec(3, 3, 280, "Book Appointment", "#fdf2f8",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Đặt Lịch Hẹn Ngay",
                            new { fontSize=28, fontWeight=700, fontFamily="Georgia", color="#831843", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐẶT LỊCH NGAY", "#db2777", "#ffffff", "#ffffff",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("email","Email","email")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 6. Nhà hàng / Ẩm thực ────────────────────────────────────
            new() {
                Name = Marker + " Nhà hàng — Trang Chủ & Đặt Bàn", Category = "Nhà hàng",
                Description = "Landing page nhà hàng với hero ấm cúng, menu đặc trưng và form đặt bàn trực tuyến.",
                IsFeatured = false, UsageCount = 340, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 500, "Restaurant Hero", "#1c0a00",
                        El(101, 1, "text", 1, 80, 60, 800, 28, "★★★★★  NHÀ HÀNG ẨM THỰC VIỆT",
                            new { fontSize=13, fontWeight=600, fontFamily="Inter", color="#d97706", letterSpacing=2, textAlign="center" }),
                        El(102, 1, "headline", 2, 80, 100, 800, 100, "Hương Vị Quê Hương\nTrong Từng Món Ăn",
                            new { fontSize=48, fontWeight=800, fontFamily="Georgia", color="#fef3c7", textAlign="center", lineHeight=1.2 }),
                        El(103, 1, "paragraph", 3, 160, 218, 640, 56, "Hơn 20 năm phục vụ, mang đến những món ăn Việt truyền thống với nguyên liệu tươi sạch mỗi ngày.",
                            new { fontSize=16, fontFamily="Inter", color="#fde68a", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "button", 4, 280, 300, 180, 52, "Đặt bàn ngay",
                            new { backgroundColor="#d97706", color="#ffffff", borderRadius=8, fontSize=15, fontWeight=700 }),
                        El(105, 1, "button", 5, 485, 300, 180, 52, "Xem thực đơn",
                            new { backgroundColor="transparent", color="#fbbf24", borderRadius=8, fontSize=15, fontWeight=600, borderWidth=2, borderColor="#d97706" }),
                        El(106, 1, "text", 6, 80, 380, 800, 36, "📍 123 Lê Lợi, Q.1, TP.HCM  |  ☎ 0901 234 567  |  🕐 10:00 — 22:00",
                            new { fontSize=13, fontFamily="Inter", color="#d97706", textAlign="center" })
                    ),
                    Sec(2, 2, 400, "Menu Highlights", "#fffbeb",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Món Đặc Trưng",
                            new { fontSize=30, fontWeight=700, fontFamily="Georgia", color="#92400e", textAlign="center" }),
                        El(202, 2, "image", 2, 40, 110, 270, 220, "Phở Bò Đặc Biệt",
                            new { borderRadius=12, backgroundColor="#fde68a" }),
                        El(203, 2, "text", 3, 40, 346, 270, 36, "Phở Bò Đặc Biệt — 89.000đ",
                            new { fontSize=13, fontWeight=700, fontFamily="Inter", color="#92400e", textAlign="center" }),
                        El(204, 2, "image", 4, 345, 110, 270, 220, "Cơm Tấm Sườn",
                            new { borderRadius=12, backgroundColor="#fef3c7" }),
                        El(205, 2, "text", 5, 345, 346, 270, 36, "Cơm Tấm Sườn Bì Chả — 75.000đ",
                            new { fontSize=13, fontWeight=700, fontFamily="Inter", color="#92400e", textAlign="center" }),
                        El(206, 2, "image", 6, 650, 110, 270, 220, "Bún Bò Huế",
                            new { borderRadius=12, backgroundColor="#fed7aa" }),
                        El(207, 2, "text", 7, 650, 346, 270, 36, "Bún Bò Huế Nguyên Bản — 79.000đ",
                            new { fontSize=13, fontWeight=700, fontFamily="Inter", color="#92400e", textAlign="center" })
                    ),
                    Sec(3, 3, 280, "Reservation", "#1c0a00",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Đặt Bàn Trực Tuyến",
                            new { fontSize=28, fontWeight=700, fontFamily="Georgia", color="#fef3c7", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐẶT BÀN NGAY", "#d97706", "#ffffff", "#2d1a00",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("date","Ngày & giờ đặt bàn","text")),
                            new { borderRadius=8, fontSize=14 })
                    )
                )
            },

            // ── 7. Bất động sản ───────────────────────────────────────────
            new() {
                Name = Marker + " Bất động sản — Dự Án Căn Hộ", Category = "Bất động sản",
                Description = "Landing page bất động sản cao cấp với hero sang trọng, điểm nổi bật dự án và form tư vấn.",
                IsFeatured = true, UsageCount = 510, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 560, "Property Hero", "#0c1a2e",
                        El(101, 1, "text", 1, 80, 60, 800, 28, "🏢 DỰ ÁN CAO CẤP 2025",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#f59e0b", letterSpacing=3, textAlign="center", textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 100, 800, 110, "GRAND TOWER\nCanh Cụm Trung Tâm",
                            new { fontSize=52, fontWeight=900, fontFamily="Inter", color="#f8fafc", textAlign="center", lineHeight=1.1 }),
                        El(103, 1, "paragraph", 3, 160, 230, 640, 56, "Căn hộ hạng sang ngay trung tâm thành phố. Tiện ích 5 sao, tầm nhìn panoramic, thiết kế bởi kiến trúc sư quốc tế.",
                            new { fontSize=16, fontFamily="Inter", color="#94a3b8", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "text", 4, 160, 310, 200, 80, "Giá từ\n2,5 tỷ đồng",
                            new { fontSize=15, fontWeight=700, fontFamily="Inter", color="#f59e0b", textAlign="center", lineHeight=1.5, backgroundColor="#1e3a5f", borderRadius=8, padding=12 }),
                        El(105, 1, "text", 5, 390, 310, 200, 80, "Diện tích\n50m² — 150m²",
                            new { fontSize=15, fontWeight=700, fontFamily="Inter", color="#f59e0b", textAlign="center", lineHeight=1.5, backgroundColor="#1e3a5f", borderRadius=8, padding=12 }),
                        El(106, 1, "text", 6, 620, 310, 180, 80, "Pháp lý\nSổ đỏ lâu dài",
                            new { fontSize=15, fontWeight=700, fontFamily="Inter", color="#f59e0b", textAlign="center", lineHeight=1.5, backgroundColor="#1e3a5f", borderRadius=8, padding=12 }),
                        El(107, 1, "button", 7, 330, 420, 300, 56, "Nhận tư vấn & bảng giá",
                            new { backgroundColor="#f59e0b", color="#0c1a2e", borderRadius=8, fontSize=16, fontWeight=700 })
                    ),
                    Sec(2, 2, 380, "Amenities", "#f8fafc",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Tiện Ích Đẳng Cấp",
                            new { fontSize=30, fontWeight=700, fontFamily="Inter", color="#0c1a2e", textAlign="center" }),
                        El(202, 2, "text", 2, 40, 110, 200, 180, "🏊 Hồ bơi\nvô cực tầng 30\n\n🏋️ Gym & Yoga\n24/7 cho cư dân",
                            new { fontSize=14, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16, textAlign="center" }),
                        El(203, 2, "text", 3, 260, 110, 200, 180, "🛡️ Bảo vệ\n24/7 an ninh\n\n🚗 Bãi xe\nthông minh B1-B3",
                            new { fontSize=14, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16, textAlign="center" }),
                        El(204, 2, "text", 4, 480, 110, 200, 180, "🌿 Công viên\nnội khu 2ha\n\n🏥 Phòng khám\nvà nhà thuốc nội khu",
                            new { fontSize=14, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16, textAlign="center" }),
                        El(205, 2, "text", 5, 700, 110, 200, 180, "🍽️ Nhà hàng\n& coffee shop\n\n🏫 Trường học\nquốc tế ngay cổng",
                            new { fontSize=14, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16, textAlign="center" })
                    ),
                    Sec(3, 3, 300, "Consult", "#0c1a2e",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Nhận Tư Vấn Miễn Phí",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#f8fafc", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 170,
                            FormContent("", "GỬI YÊU CẦU TƯ VẤN", "#f59e0b", "#0c1a2e", "#0f2544",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("email","Email","email")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 8. Portfolio Cá nhân ──────────────────────────────────────
            new() {
                Name = Marker + " Portfolio — Giới Thiệu Bản Thân", Category = "Portfolio",
                Description = "Landing page portfolio cá nhân tối giản, hiển thị kỹ năng, dự án và form liên hệ.",
                IsFeatured = false, UsageCount = 210, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 500, "Portfolio Hero", "#0f172a",
                        El(101, 1, "image", 1, 380, 60, 160, 160, "Avatar",
                            new { borderRadius=99, backgroundColor="#1e293b" }),
                        El(102, 1, "headline", 2, 80, 240, 800, 70, "Nguyễn Văn An",
                            new { fontSize=48, fontWeight=800, fontFamily="Inter", color="#f8fafc", textAlign="center" }),
                        El(103, 1, "text", 3, 80, 326, 800, 36, "UI/UX Designer  ·  Frontend Developer  ·  Creative Thinker",
                            new { fontSize=18, fontFamily="Inter", color="#6366f1", textAlign="center", fontWeight=500 }),
                        El(104, 1, "paragraph", 4, 200, 380, 560, 60, "5 năm kinh nghiệm thiết kế sản phẩm số. Đã làm việc với 50+ khách hàng tại Việt Nam và quốc tế.",
                            new { fontSize=15, fontFamily="Inter", color="#94a3b8", textAlign="center", lineHeight=1.6 }),
                        El(105, 1, "button", 5, 310, 462, 160, 48, "Xem dự án",
                            new { backgroundColor="#6366f1", color="#ffffff", borderRadius=8, fontSize=14, fontWeight=600 }),
                        El(106, 1, "button", 6, 490, 462, 160, 48, "Liên hệ ngay",
                            new { backgroundColor="transparent", color="#a5b4fc", borderRadius=8, fontSize=14, fontWeight=600, borderWidth=1, borderColor="#6366f1" })
                    ),
                    Sec(2, 2, 340, "Skills", "#f8fafc",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Kỹ năng & Chuyên môn",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#0f172a", textAlign="center" }),
                        El(202, 2, "text", 2, 60, 110, 260, 180, "🎨 Thiết kế UI/UX\n\nFigma, Adobe XD, Sketch\nPrototyping, Wireframing\nUser Research",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16 }),
                        El(203, 2, "text", 3, 350, 110, 260, 180, "💻 Frontend Development\n\nReactJS, TypeScript\nTailwind CSS, Next.js\nREST API, GraphQL",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16 }),
                        El(204, 2, "text", 4, 640, 110, 260, 180, "📱 Mobile & Tools\n\nReact Native, Flutter\nGit, Jira, Notion\nGoogle Analytics, SEO",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.8, backgroundColor="#ffffff", borderRadius=12, padding=16 })
                    ),
                    Sec(3, 3, 260, "Contact Me", "#0f172a",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Cùng hợp tác nào!",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#f8fafc", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 140,
                            FormContent("", "GỬI LỜI NHẮN", "#6366f1", "#ffffff", "#1e293b",
                                ("name","Tên của bạn","text"), ("email","Email","email")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 9. Newsletter / Thu thập email ────────────────────────────
            new() {
                Name = Marker + " Marketing — Thu Thập Email & Khách Hàng", Category = "Marketing",
                Description = "Landing page đơn giản tối ưu chuyển đổi: một headline mạnh, lợi ích và form đăng ký email.",
                IsFeatured = false, UsageCount = 450, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 560, "Newsletter", "#f0f9ff",
                        El(101, 1, "text", 1, 80, 80, 800, 28, "🎁 Tặng ngay khi đăng ký hôm nay",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#0369a1", textAlign="center", letterSpacing=0.5 }),
                        El(102, 1, "headline", 2, 80, 120, 800, 110, "Nhận Bí Quyết Kinh Doanh\nOnline Thành Công",
                            new { fontSize=46, fontWeight=800, fontFamily="Inter", color="#0c4a6e", textAlign="center", lineHeight=1.25 }),
                        El(103, 1, "paragraph", 3, 160, 248, 640, 72, "Mỗi tuần nhận 1 bản tin tổng hợp các chiến lược marketing, tips tăng doanh thu và case study thực tế từ 1000+ doanh nghiệp Việt.",
                            new { fontSize=17, fontFamily="Inter", color="#075985", textAlign="center", lineHeight=1.65 }),
                        El(104, 1, "text", 4, 160, 340, 640, 50, "✓ Hoàn toàn miễn phí  ✓ Không spam  ✓ Hủy bất cứ lúc nào",
                            new { fontSize=14, fontWeight=600, fontFamily="Inter", color="#0284c7", textAlign="center" }),
                        El(105, 1, "form", 5, 240, 408, 480, 120,
                            FormContent("", "ĐĂNG KÝ MIỄN PHÍ NGAY", "#0284c7", "#ffffff", "#e0f2fe",
                                ("name","Tên của bạn","text"), ("email","Địa chỉ email","email")),
                            new { borderRadius=12, fontSize=15 })
                    ),
                    Sec(2, 2, 280, "Social Proof", "#ffffff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Hơn 15.000 doanh nhân đã đăng ký",
                            new { fontSize=26, fontWeight=700, fontFamily="Inter", color="#0c4a6e", textAlign="center" }),
                        El(202, 2, "text", 2, 60, 110, 840, 130, "\"Bản tin này thay đổi hoàn toàn cách tôi nhìn nhận về marketing. Tháng đầu áp dụng, doanh thu tăng 40%.\" — Nguyễn Thị Lan, CEO StartUp ABC\n\n\"Đơn giản, thực tế, hiệu quả ngay. Tôi giới thiệu cho toàn team.\" — Trần Minh Tuấn, Founder XYZ",
                            new { fontSize=14, fontFamily="Inter", color="#374151", lineHeight=1.7, textAlign="center", fontStyle="italic" })
                    )
                )
            },

            // ── 10. Coming Soon ───────────────────────────────────────────
            new() {
                Name = Marker + " Khác — Coming Soon / Đang Xây Dựng", Category = "Khác",
                Description = "Landing page Coming Soon với countdown đếm ngược và form thu thập email chờ ra mắt.",
                IsFeatured = false, UsageCount = 175, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 620, "Coming Soon", "#030712",
                        El(101, 1, "text", 1, 80, 80, 800, 28, "CÁI GÌ ĐÓ TUYỆT VỜI ĐANG ĐẾN",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#6366f1", letterSpacing=4, textAlign="center", textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 120, 800, 110, "Sắp Ra Mắt",
                            new { fontSize=80, fontWeight=900, fontFamily="Inter", color="#f8fafc", textAlign="center", lineHeight=1.1 }),
                        El(103, 1, "paragraph", 3, 160, 248, 640, 60, "Chúng tôi đang hoàn thiện những điều kỳ diệu. Để lại email để nhận thông báo đầu tiên và nhận ưu đãi đặc biệt.",
                            new { fontSize=17, fontFamily="Inter", color="#94a3b8", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "countdown", 4, 230, 330, 500, 110, "",
                            new { backgroundColor="#0f172a", color="#f8fafc", fontSize=40, fontWeight=800, borderRadius=12 }),
                        El(105, 1, "form", 5, 240, 462, 480, 108,
                            FormContent("", "THÔNG BÁO CHO TÔI", "#6366f1", "#ffffff", "#0f172a",
                                ("email","Nhập email của bạn","email")),
                            new { borderRadius=12, fontSize=15 }),
                        El(106, 1, "text", 6, 160, 588, 640, 24, "Không spam. Chúng tôi chỉ gửi thông báo quan trọng nhất.",
                            new { fontSize=12, fontFamily="Inter", color="#475569", textAlign="center" })
                    )
                )
            },

            // ── 11. Tài chính / Bảo hiểm ─────────────────────────────────
            new() {
                Name = Marker + " Tài chính — Tư Vấn Đầu Tư & Bảo Hiểm", Category = "Tài chính",
                Description = "Landing page dịch vụ tài chính uy tín với số liệu, lợi ích và form tư vấn miễn phí.",
                IsFeatured = false, UsageCount = 245, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 520, "Finance Hero", "#1e40af",
                        El(101, 1, "headline", 1, 80, 80, 800, 90, "Bảo Vệ Tài Chính &\nTương Lai Của Bạn",
                            new { fontSize=46, fontWeight=800, fontFamily="Inter", color="#ffffff", textAlign="center", lineHeight=1.2 }),
                        El(102, 1, "paragraph", 2, 160, 190, 640, 56, "Giải pháp bảo hiểm nhân thọ, đầu tư tài chính và hoạch định tương lai được thiết kế riêng cho từng gia đình Việt.",
                            new { fontSize=16, fontFamily="Inter", color="#bfdbfe", textAlign="center", lineHeight=1.6 }),
                        El(103, 1, "text", 3, 80, 270, 200, 80, "20+ năm\nkinh nghiệm",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#1e40af", textAlign="center", backgroundColor="#ffffff", borderRadius=10, padding=12, lineHeight=1.5 }),
                        El(104, 1, "text", 4, 310, 270, 200, 80, "50.000+\nkhách hàng",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#1e40af", textAlign="center", backgroundColor="#ffffff", borderRadius=10, padding=12, lineHeight=1.5 }),
                        El(105, 1, "text", 5, 540, 270, 200, 80, "Tỉ lệ bồi thường\n98,5%",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#1e40af", textAlign="center", backgroundColor="#ffffff", borderRadius=10, padding=12, lineHeight=1.5 }),
                        El(106, 1, "text", 6, 770, 270, 150, 80, "Hotline\n1900 xxxx",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#1e40af", textAlign="center", backgroundColor="#ffffff", borderRadius=10, padding=12, lineHeight=1.5 }),
                        El(107, 1, "button", 7, 380, 380, 200, 52, "Tư vấn miễn phí",
                            new { backgroundColor="#f59e0b", color="#0f172a", borderRadius=10, fontSize=16, fontWeight=700 }),
                        El(108, 1, "text", 8, 160, 454, 640, 36, "Tư vấn viên sẽ liên hệ trong vòng 30 phút. Cam kết không phát sinh chi phí.",
                            new { fontSize=13, fontFamily="Inter", color="#93c5fd", textAlign="center" })
                    ),
                    Sec(2, 2, 300, "Consult", "#f8fafc",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Nhận Tư Vấn Miễn Phí",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#1e40af", textAlign="center" }),
                        El(202, 2, "form", 2, 240, 100, 480, 170,
                            FormContent("", "GỬI YÊU CẦU TƯ VẤN", "#1e40af", "#ffffff", "#ffffff",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("email","Email","email")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 12. Gym / Thể hình ────────────────────────────────────────
            new() {
                Name = Marker + " Thể thao — Gym & Fitness Center", Category = "Thể thao",
                Description = "Landing page gym và fitness với gói tập, lịch trainer và form đăng ký thử nghiệm.",
                IsFeatured = false, UsageCount = 290, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 520, "Gym Hero", "#0f172a",
                        El(101, 1, "text", 1, 80, 60, 800, 28, "💪 IRON GYM — TRUNG TÂM THỂ HÌNH CHUYÊN NGHIỆP",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#ef4444", letterSpacing=2, textAlign="center" }),
                        El(102, 1, "headline", 2, 80, 100, 800, 100, "Transform Your Body,\nTransform Your Life",
                            new { fontSize=48, fontWeight=900, fontFamily="Inter", color="#f8fafc", textAlign="center", lineHeight=1.15 }),
                        El(103, 1, "paragraph", 3, 160, 220, 640, 56, "Hơn 200 thiết bị hiện đại. Đội ngũ HLV chứng chỉ quốc tế. Hoạt động 24/7 phục vụ mọi mục tiêu tập luyện của bạn.",
                            new { fontSize=16, fontFamily="Inter", color="#94a3b8", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "button", 4, 330, 300, 300, 56, "Đăng ký 1 buổi tập MIỄN PHÍ",
                            new { backgroundColor="#ef4444", color="#ffffff", borderRadius=10, fontSize=16, fontWeight=700 }),
                        El(105, 1, "text", 5, 80, 378, 800, 80, "🏋️ GÓI TẬP:\n1 THÁNG: 499.000đ  |  3 THÁNG: 1.199.000đ  |  12 THÁNG: 3.599.000đ (TIẾT KIỆM 40%)",
                            new { fontSize=13, fontWeight=600, fontFamily="Inter", color="#fbbf24", textAlign="center", lineHeight=2 })
                    ),
                    Sec(2, 2, 280, "Register Gym", "#1e293b",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Đăng Ký Tập Thử 1 Buổi",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#f8fafc", textAlign="center" }),
                        El(202, 2, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐĂNG KÝ TẬP THỬ", "#ef4444", "#ffffff", "#0f172a",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("goal","Mục tiêu tập luyện","text")),
                            new { borderRadius=8, fontSize=14 })
                    )
                )
            },

            // ── 13. Du lịch / Tour ────────────────────────────────────────
            new() {
                Name = Marker + " Du lịch — Tour & Lữ Hành", Category = "Du lịch",
                Description = "Landing page tour du lịch với destination nổi bật, bảng giá tour và form đặt tour.",
                IsFeatured = false, UsageCount = 310, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 500, "Travel Hero", "#0c4a6e",
                        El(101, 1, "text", 1, 80, 60, 800, 28, "✈️ KHÁM PHÁ THẾ GIỚI CÙNG CHÚNG TÔI",
                            new { fontSize=13, fontWeight=700, fontFamily="Inter", color="#7dd3fc", letterSpacing=2, textAlign="center" }),
                        El(102, 1, "headline", 2, 80, 100, 800, 100, "Du Lịch Mơ Ước —\nGiá Tốt Nhất Năm",
                            new { fontSize=48, fontWeight=800, fontFamily="Inter", color="#f0f9ff", textAlign="center", lineHeight=1.2 }),
                        El(103, 1, "paragraph", 3, 160, 220, 640, 56, "Hơn 500 tour trong nước và quốc tế. Giá tốt nhất thị trường, dịch vụ 5 sao, hướng dẫn viên chuyên nghiệp.",
                            new { fontSize=16, fontFamily="Inter", color="#bae6fd", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "text", 4, 80, 300, 250, 110, "🏝️ Phú Quốc\n3N2Đ từ 3.990.000đ\nVé máy bay + KS 4★",
                            new { fontSize=13, fontFamily="Inter", color="#0c4a6e", lineHeight=1.7, backgroundColor="#e0f2fe", borderRadius=12, padding=14, fontWeight=600 }),
                        El(105, 1, "text", 5, 355, 300, 250, 110, "🗺️ Hội An\n2N1Đ từ 1.990.000đ\nDi sản UNESCO + Phố cổ",
                            new { fontSize=13, fontFamily="Inter", color="#0c4a6e", lineHeight=1.7, backgroundColor="#e0f2fe", borderRadius=12, padding=14, fontWeight=600 }),
                        El(106, 1, "text", 6, 630, 300, 250, 110, "🌍 Nhật Bản\n5N4Đ từ 22.990.000đ\nVisa + Vé + KS 4★",
                            new { fontSize=13, fontFamily="Inter", color="#0c4a6e", lineHeight=1.7, backgroundColor="#e0f2fe", borderRadius=12, padding=14, fontWeight=600 }),
                        El(107, 1, "button", 7, 330, 434, 300, 52, "Đặt tour ngay",
                            new { backgroundColor="#0284c7", color="#ffffff", borderRadius=10, fontSize=16, fontWeight=700 })
                    ),
                    Sec(2, 2, 280, "Book Tour", "#f0f9ff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Đặt Tour & Nhận Ưu Đãi",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#0c4a6e", textAlign="center" }),
                        El(202, 2, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐẶT TOUR NGAY", "#0284c7", "#ffffff", "#ffffff",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("destination","Điểm đến quan tâm","text")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 14. Y tế / Phòng khám ────────────────────────────────────
            new() {
                Name = Marker + " Y tế — Phòng Khám & Bệnh Viện", Category = "Y tế",
                Description = "Landing page phòng khám chuyên khoa với dịch vụ, đội ngũ bác sĩ và form đặt lịch khám.",
                IsFeatured = false, UsageCount = 265, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 480, "Clinic Hero", "#f0fdf4",
                        El(101, 1, "text", 1, 80, 50, 500, 28, "🏥 PHÒNG KHÁM ĐA KHOA UY TÍN",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#15803d", letterSpacing=2, textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 90, 500, 100, "Sức Khỏe Của Bạn\nLà Ưu Tiên Số 1",
                            new { fontSize=42, fontWeight=800, fontFamily="Inter", color="#14532d", lineHeight=1.25 }),
                        El(103, 1, "paragraph", 3, 80, 210, 460, 72, "Đội ngũ bác sĩ chuyên khoa 10+ năm kinh nghiệm. Trang thiết bị hiện đại. Kết quả xét nghiệm trong 24 giờ.",
                            new { fontSize=15, fontFamily="Inter", color="#166534", lineHeight=1.65 }),
                        El(104, 1, "button", 4, 80, 300, 220, 52, "Đặt lịch khám ngay",
                            new { backgroundColor="#16a34a", color="#ffffff", borderRadius=10, fontSize=15, fontWeight=700 }),
                        El(105, 1, "text", 5, 80, 370, 460, 52, "📞 Đường dây nóng: 1900 xxxx\n⏰ Mở cửa: Thứ 2 — Chủ nhật  7:00 — 20:00",
                            new { fontSize=13, fontFamily="Inter", color="#15803d", lineHeight=1.8 }),
                        El(106, 1, "image", 6, 560, 50, 360, 380, "Ảnh phòng khám",
                            new { borderRadius=16, backgroundColor="#dcfce7" })
                    ),
                    Sec(2, 2, 320, "Services", "#ffffff",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Chuyên Khoa",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#14532d", textAlign="center" }),
                        El(202, 2, "text", 2, 40, 110, 200, 160, "🫀 Tim Mạch\n\nKhám tổng quát, điện tâm đồ, siêu âm tim, tư vấn phòng ngừa",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f0fdf4", borderRadius=10, padding=14 }),
                        El(203, 2, "text", 3, 260, 110, 200, 160, "🦷 Răng Hàm Mặt\n\nNha khoa tổng quát, chỉnh nha, cấy ghép, làm trắng răng",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f0fdf4", borderRadius=10, padding=14 }),
                        El(204, 2, "text", 4, 480, 110, 200, 160, "👁️ Mắt\n\nKhám thị lực, điều trị mắt, phẫu thuật Lasik, kính áp tròng",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f0fdf4", borderRadius=10, padding=14 }),
                        El(205, 2, "text", 5, 700, 110, 200, 160, "🧬 Xét Nghiệm\n\nXét nghiệm máu, nước tiểu, gen di truyền. Kết quả trong 24h",
                            new { fontSize=13, fontFamily="Inter", color="#374151", lineHeight=1.7, backgroundColor="#f0fdf4", borderRadius=10, padding=14 })
                    ),
                    Sec(3, 3, 280, "Book Clinic", "#f0fdf4",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Đặt Lịch Khám Online",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#14532d", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 158,
                            FormContent("", "ĐẶT LỊCH KHÁM", "#16a34a", "#ffffff", "#ffffff",
                                ("name","Họ và tên","text"), ("phone","Số điện thoại","phone"), ("service","Chuyên khoa","text")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },

            // ── 15. Công ty / Giới thiệu doanh nghiệp ────────────────────
            new() {
                Name = Marker + " Doanh nghiệp — Giới Thiệu Công Ty", Category = "Dịch vụ",
                Description = "Landing page giới thiệu doanh nghiệp chuyên nghiệp với thành tích, dịch vụ và liên hệ.",
                IsFeatured = false, UsageCount = 380, CreatedAt = now,
                JsonContent = Ej(
                    Sec(1, 1, 500, "Company Hero", "#f8fafc",
                        El(101, 1, "text", 1, 80, 60, 800, 28, "THÀNH LẬP TỪ NĂM 2010",
                            new { fontSize=12, fontWeight=700, fontFamily="Inter", color="#6366f1", letterSpacing=3, textAlign="center", textTransform="uppercase" }),
                        El(102, 1, "headline", 2, 80, 100, 800, 100, "Đồng Hành Cùng\nSự Phát Triển Của Bạn",
                            new { fontSize=48, fontWeight=800, fontFamily="Inter", color="#0f172a", textAlign="center", lineHeight=1.2 }),
                        El(103, 1, "paragraph", 3, 160, 220, 640, 60, "Chúng tôi cung cấp giải pháp công nghệ toàn diện, giúp doanh nghiệp số hóa, tăng hiệu suất và mở rộng thị trường.",
                            new { fontSize=16, fontFamily="Inter", color="#475569", textAlign="center", lineHeight=1.6 }),
                        El(104, 1, "text", 4, 80, 310, 190, 110, "15+ năm\nkinh nghiệm\ntrên thị trường",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#4f46e5", textAlign="center", lineHeight=1.6, backgroundColor="#eef2ff", borderRadius=12, padding=16 }),
                        El(105, 1, "text", 5, 295, 310, 190, 110, "500+\nkhách hàng\ntin tưởng",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#4f46e5", textAlign="center", lineHeight=1.6, backgroundColor="#eef2ff", borderRadius=12, padding=16 }),
                        El(106, 1, "text", 6, 510, 310, 190, 110, "50+\nchuyên gia\ngiàu kinh nghiệm",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#4f46e5", textAlign="center", lineHeight=1.6, backgroundColor="#eef2ff", borderRadius=12, padding=16 }),
                        El(107, 1, "text", 7, 725, 310, 190, 110, "98%\nkhách hàng\nhài lòng",
                            new { fontSize=14, fontWeight=700, fontFamily="Inter", color="#4f46e5", textAlign="center", lineHeight=1.6, backgroundColor="#eef2ff", borderRadius=12, padding=16 }),
                        El(108, 1, "button", 8, 380, 448, 200, 52, "Liên hệ hợp tác",
                            new { backgroundColor="#6366f1", color="#ffffff", borderRadius=10, fontSize=15, fontWeight=700 })
                    ),
                    Sec(2, 2, 360, "Services", "#0f172a",
                        El(201, 2, "headline", 1, 80, 36, 800, 50, "Giải Pháp & Dịch Vụ",
                            new { fontSize=30, fontWeight=700, fontFamily="Inter", color="#f8fafc", textAlign="center" }),
                        El(202, 2, "text", 2, 40, 110, 275, 200, "💻 Phát Triển Phần Mềm\n\nXây dựng ứng dụng web, mobile theo yêu cầu. Agile, đúng tiến độ, chất lượng cao.",
                            new { fontSize=13, fontFamily="Inter", color="#cbd5e1", lineHeight=1.7, backgroundColor="#1e293b", borderRadius=12, padding=16 }),
                        El(203, 2, "text", 3, 340, 110, 275, 200, "📱 Chuyển Đổi Số\n\nTư vấn và triển khai chuyển đổi số toàn diện. ERP, CRM, HRM tích hợp thông minh.",
                            new { fontSize=13, fontFamily="Inter", color="#cbd5e1", lineHeight=1.7, backgroundColor="#1e293b", borderRadius=12, padding=16 }),
                        El(204, 2, "text", 4, 640, 110, 275, 200, "📊 Marketing Digital\n\nSEO, Google Ads, Social Media, Content Marketing. Tối ưu chi phí, tăng chuyển đổi.",
                            new { fontSize=13, fontFamily="Inter", color="#cbd5e1", lineHeight=1.7, backgroundColor="#1e293b", borderRadius=12, padding=16 })
                    ),
                    Sec(3, 3, 260, "Contact Company", "#6366f1",
                        El(301, 3, "headline", 1, 80, 36, 800, 50, "Bắt Đầu Hợp Tác Ngay",
                            new { fontSize=28, fontWeight=700, fontFamily="Inter", color="#ffffff", textAlign="center" }),
                        El(302, 3, "form", 2, 240, 100, 480, 140,
                            FormContent("", "LIÊN HỆ NGAY", "#ffffff", "#4f46e5", "#4338ca",
                                ("name","Tên doanh nghiệp / Liên hệ","text"), ("phone","Số điện thoại","phone")),
                            new { borderRadius=12, fontSize=14 })
                    )
                )
            },
        };

        db.Templates.AddRange(templates);
        await db.SaveChangesAsync();
    }
}
