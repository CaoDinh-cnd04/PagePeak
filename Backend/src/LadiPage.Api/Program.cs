using LadiPage.Api.Extensions;
using LadiPage.Api.Middlewares;
using LadiPage.Api.Services;
using LadiPage.Application;
using LadiPage.Domain.Interfaces;
using LadiPage.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Giữ khóa Data Protection ổn định giữa các lần chạy API → cookie correlation OAuth không bị "Correlation failed" sau khi restart dotnet.
var dpKeysDir = Path.Combine(builder.Environment.ContentRootPath, "dp-keys");
Directory.CreateDirectory(dpKeysDir);
builder.Services.AddDataProtection()
    .SetApplicationName("LadiPage.Api")
    .PersistKeysToFileSystem(new DirectoryInfo(dpKeysDir));

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "LadiPage API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Bearer token",
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ICurrentUser, CurrentUserService>();

builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services.AddAuthorization();
builder.Services.AddResponseCompression();
builder.Services.AddResponseCaching();
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("PlansCache", policy => policy.Expire(TimeSpan.FromMinutes(5)));
    options.AddPolicy("TemplatesCache", policy => policy.Expire(TimeSpan.FromMinutes(2)));
});

var app = builder.Build();

// Tạo DB LadiPageDB (nếu được phép) + áp dụng EF Core migrations (code-first)
using (var scope = app.Services.CreateScope())
{
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var connStr = config.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(connStr))
    {
        var masterConn = connStr.Replace("Database=LadiPageDB", "Database=master", StringComparison.OrdinalIgnoreCase)
            .Replace("Initial Catalog=LadiPageDB", "Initial Catalog=master", StringComparison.OrdinalIgnoreCase);
        try
        {
            await using var conn = new Microsoft.Data.SqlClient.SqlConnection(masterConn);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'LadiPageDB') CREATE DATABASE LadiPageDB";
            await cmd.ExecuteNonQueryAsync();
        }
        catch { /* Ignore neu server khong cho tao DB */ }

        var db = scope.ServiceProvider.GetRequiredService<LadiPage.Infrastructure.Data.AppDbContext>();
        await db.Database.MigrateAsync();

        // Seed editor tools - reseed if missing
        var needsReseed = !await db.ToolCategories.AnyAsync();
        if (needsReseed)
        {
            db.ElementPresets.RemoveRange(await db.ElementPresets.ToListAsync());
            db.ToolItems.RemoveRange(await db.ToolItems.ToListAsync());
            db.ToolCategories.RemoveRange(await db.ToolCategories.ToListAsync());
            await db.SaveChangesAsync();
            var catPhanTu = new LadiPage.Domain.Entities.ToolCategory { Name = "Phần tử", Icon = "layout-grid", Order = 1, IsActive = true };
            var catAssets = new LadiPage.Domain.Entities.ToolCategory { Name = "Assets", Icon = "bookmark", Order = 2, IsActive = true };
            var catSection = new LadiPage.Domain.Entities.ToolCategory { Name = "Section", Icon = "layers", Order = 3, IsActive = true };
            var catPopup = new LadiPage.Domain.Entities.ToolCategory { Name = "Popup", Icon = "message-square", Order = 4, IsActive = true };
            var catDropbox = new LadiPage.Domain.Entities.ToolCategory { Name = "Dropbox", Icon = "hard-drive", Order = 5, IsActive = true };
            var catSanPham = new LadiPage.Domain.Entities.ToolCategory { Name = "Sản phẩm", Icon = "shopping-bag", Order = 6, IsActive = true };
            var catBlog = new LadiPage.Domain.Entities.ToolCategory { Name = "Blog", Icon = "file-text", Order = 7, IsActive = true };
            var catTienIch = new LadiPage.Domain.Entities.ToolCategory { Name = "Tiện ích", Icon = "puzzle", Order = 8, IsActive = true };
            var catNoiDung = new LadiPage.Domain.Entities.ToolCategory { Name = "Quản lý nội dung", Icon = "folder", Order = 9, IsActive = true };
            var catMedia = new LadiPage.Domain.Entities.ToolCategory { Name = "Quản lý Media", Icon = "film", Order = 10, IsActive = true };
            var catTaiLieu = new LadiPage.Domain.Entities.ToolCategory { Name = "Quản lý tài liệu", Icon = "file-archive", Order = 11, IsActive = true };
            var catFont = new LadiPage.Domain.Entities.ToolCategory { Name = "Quản lý Font", Icon = "type", Order = 12, IsActive = true };
            var catYeuThich = new LadiPage.Domain.Entities.ToolCategory { Name = "Yêu thích", Icon = "star", Order = 13, IsActive = true };

            db.ToolCategories.AddRange(catPhanTu, catAssets, catSection, catPopup, catDropbox, catSanPham, catBlog, catTienIch, catNoiDung, catMedia, catTaiLieu, catFont, catYeuThich);
            await db.SaveChangesAsync();

            // Tool Items for "Phần tử"
            var tiVanBan = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Văn bản", Icon = "type", ElementType = "text", Order = 1, HasSubTabs = true, SubTabsJson = "[\"Tiêu đề\",\"Đoạn văn\",\"Danh sách\"]" };
            var tiNutBam = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Nút bấm", Icon = "mouse-pointer-click", ElementType = "button", Order = 2, HasSubTabs = true, SubTabsJson = "[\"Nút bấm\",\"Nhóm nút bấm\"]" };
            var tiAnh = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Ảnh", Icon = "image", ElementType = "image", Order = 3, HasSubTabs = false };
            var tiGallery = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Gallery", Icon = "layout-grid", ElementType = "gallery", Order = 4, HasSubTabs = true, SubTabsJson = "[\"Gallery\"]" };
            var tiHinhHop = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Hình hộp", Icon = "square", ElementType = "shape", Order = 5, HasSubTabs = true, SubTabsJson = "[\"Hình hộp\"]" };
            var tiBieuTuong = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Biểu tượng", Icon = "smile", ElementType = "icon", Order = 6, HasSubTabs = false };
            var tiDuongKe = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Đường kẻ", Icon = "minus", ElementType = "divider", Order = 7, HasSubTabs = true, SubTabsJson = "[\"Đường kẻ\",\"Pen Tool\"]" };
            var tiForm = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Form", Icon = "clipboard-list", ElementType = "form", Order = 8, HasSubTabs = true, SubTabsJson = "[\"Form\",\"Form checkout\",\"Form Login\",\"Form OTP\"]" };
            var tiVideo = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Video", Icon = "play", ElementType = "video", Order = 9, HasSubTabs = false };
            var tiFrame = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Frame", Icon = "frame", ElementType = "frame", Order = 10, HasSubTabs = false };
            var tiAccordion = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Accordion", Icon = "chevrons-down", ElementType = "accordion", Order = 11, HasSubTabs = false };
            var tiTable = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Table", Icon = "table", ElementType = "table", Order = 12, HasSubTabs = false };
            var tiAntigravity = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Antigravity UI", Icon = "rocket", ElementType = "antigravity", Order = 13, HasSubTabs = false };
            var tiMaHtml = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Mã HTML", Icon = "code", ElementType = "html-code", Order = 14, HasSubTabs = true, SubTabsJson = "[\"HTML/JAVASCRIPT\",\"IFRAME\"]" };

            db.ToolItems.AddRange(tiVanBan, tiNutBam, tiAnh, tiGallery, tiHinhHop, tiBieuTuong, tiDuongKe, tiForm, tiVideo, tiFrame, tiAccordion, tiTable, tiAntigravity, tiMaHtml);

            // Tool Items for "Section"
            var tiSectionBlank = new LadiPage.Domain.Entities.ToolItem { CategoryId = catSection.Id, Name = "Section trống", Icon = "plus-square", ElementType = "section", Order = 1, HasSubTabs = false };
            var tiSectionPrebuilt = new LadiPage.Domain.Entities.ToolItem { CategoryId = catSection.Id, Name = "Section có sẵn", Icon = "layout", ElementType = "section-preset", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiSectionBlank, tiSectionPrebuilt);

            // Tool Items for "Popup"
            var tiPopupBlank = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPopup.Id, Name = "Popup trống", Icon = "plus-square", ElementType = "popup", Order = 1, HasSubTabs = false };
            var tiPopupTemplate = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPopup.Id, Name = "Mẫu popup", Icon = "layout", ElementType = "popup-preset", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiPopupBlank, tiPopupTemplate);

            // Tool Items for "Sản phẩm"
            var tiSPChiTiet = new LadiPage.Domain.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Chi tiết sản phẩm", Icon = "shopping-bag", ElementType = "product-detail", Order = 1, HasSubTabs = false };
            var tiSPDanhSach = new LadiPage.Domain.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Danh sách sản phẩm", Icon = "layout-grid", ElementType = "collection-list", Order = 2, HasSubTabs = false };
            var tiSPGioHang = new LadiPage.Domain.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Giỏ hàng", Icon = "shopping-cart", ElementType = "cart", Order = 3, HasSubTabs = false };
            db.ToolItems.AddRange(tiSPChiTiet, tiSPDanhSach, tiSPGioHang);

            // Tool Items for "Blog"
            var tiBlogList = new LadiPage.Domain.Entities.ToolItem { CategoryId = catBlog.Id, Name = "Danh sách bài", Icon = "list", ElementType = "blog-list", Order = 1, HasSubTabs = false };
            var tiBlogDetail = new LadiPage.Domain.Entities.ToolItem { CategoryId = catBlog.Id, Name = "Chi tiết bài", Icon = "file-text", ElementType = "blog-detail", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiBlogList, tiBlogDetail);

            // Tool Items for "Tiện ích"
            var tiCountdown = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Đếm ngược", Icon = "timer", ElementType = "countdown", Order = 1, HasSubTabs = false };
            var tiHtml = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "HTML tùy chỉnh", Icon = "code", ElementType = "html", Order = 2, HasSubTabs = false };
            var tiMap = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Google Maps", Icon = "map-pin", ElementType = "map", Order = 3, HasSubTabs = false };
            var tiSocialShare = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Chia sẻ MXH", Icon = "share-2", ElementType = "social-share", Order = 4, HasSubTabs = false };
            var tiRating = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Đánh giá sao", Icon = "star", ElementType = "rating", Order = 5, HasSubTabs = false };
            var tiProgress = new LadiPage.Domain.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Thanh tiến trình", Icon = "bar-chart-2", ElementType = "progress", Order = 6, HasSubTabs = false };
            db.ToolItems.AddRange(tiCountdown, tiHtml, tiMap, tiSocialShare, tiRating, tiProgress);

            // Tool Items for "Yêu thích" - danh mục nhanh với các phần tử thường dùng
            var tiYtTieuDe = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Tiêu đề nhanh", Icon = "type", ElementType = "headline", Order = 1, HasSubTabs = true, SubTabsJson = "[\"Tiêu đề\"]" };
            var tiYtNut = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Nút CTA", Icon = "mouse-pointer-click", ElementType = "button", Order = 2, HasSubTabs = true, SubTabsJson = "[\"Nút\"]" };
            var tiYtAnh = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Hình ảnh", Icon = "image", ElementType = "image", Order = 3, HasSubTabs = true, SubTabsJson = "[\"Ảnh\"]" };
            var tiYtDoanVan = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Đoạn văn", Icon = "align-left", ElementType = "paragraph", Order = 4, HasSubTabs = true, SubTabsJson = "[\"Đoạn văn\"]" };
            var tiYtHinhHop = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Hình hộp", Icon = "square", ElementType = "shape", Order = 5, HasSubTabs = true, SubTabsJson = "[\"Hình hộp\"]" };
            var tiYtDuongKe = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Đường kẻ", Icon = "minus", ElementType = "divider", Order = 6, HasSubTabs = true, SubTabsJson = "[\"Đường kẻ\"]" };
            db.ToolItems.AddRange(tiYtTieuDe, tiYtNut, tiYtAnh, tiYtDoanVan, tiYtHinhHop, tiYtDuongKe);

            await db.SaveChangesAsync();

            // Element Presets for "Văn bản" -> Tiêu đề tab
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 3", TabName = "Tiêu đề", DefaultContent = "Heading 3", StylesJson = "{\"fontSize\":18,\"fontWeight\":600,\"color\":\"#1e293b\"}", DefaultWidth = 400, DefaultHeight = 30, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 2", TabName = "Tiêu đề", DefaultContent = "Heading 2", StylesJson = "{\"fontSize\":24,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 500, DefaultHeight = 40, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 1", TabName = "Tiêu đề", DefaultContent = "Heading 1", StylesJson = "{\"fontSize\":32,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 600, DefaultHeight = 50, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 1", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 1", StylesJson = "{\"fontSize\":20,\"fontWeight\":500,\"color\":\"#334155\"}", DefaultWidth = 400, DefaultHeight = 32, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 2", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 2", StylesJson = "{\"fontSize\":22,\"fontWeight\":600,\"color\":\"#ea580c\"}", DefaultWidth = 420, DefaultHeight = 35, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 3", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 3", StylesJson = "{\"fontSize\":28,\"fontWeight\":600,\"color\":\"#dc2626\"}", DefaultWidth = 450, DefaultHeight = 42, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 4", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 4", StylesJson = "{\"fontSize\":16,\"fontWeight\":400,\"color\":\"#475569\",\"fontStyle\":\"italic\"}", DefaultWidth = 380, DefaultHeight = 28, Order = 7 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 5", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 5", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#64748b\"}", DefaultWidth = 360, DefaultHeight = 24, Order = 8 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Big Title", TabName = "Tiêu đề", DefaultContent = "Big Title", StylesJson = "{\"fontSize\":48,\"fontWeight\":800,\"color\":\"#0f172a\"}", DefaultWidth = 600, DefaultHeight = 70, Order = 9 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "CAPS TITLE", TabName = "Tiêu đề", DefaultContent = "CAPS TITLE", StylesJson = "{\"fontSize\":28,\"fontWeight\":700,\"color\":\"#ea580c\",\"textTransform\":\"uppercase\",\"letterSpacing\":4}", DefaultWidth = 500, DefaultHeight = 42, Order = 10 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Small Title", TabName = "Tiêu đề", DefaultContent = "Small Title", StylesJson = "{\"fontSize\":13,\"fontWeight\":500,\"color\":\"#94a3b8\"}", DefaultWidth = 300, DefaultHeight = 22, Order = 11 }
            );

            // Element Presets for "Văn bản" -> Đoạn văn tab
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn lớn", TabName = "Đoạn văn", DefaultContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", StylesJson = "{\"fontSize\":18,\"fontWeight\":400,\"color\":\"#334155\",\"lineHeight\":1.8}", DefaultWidth = 600, DefaultHeight = 100, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn trung bình", TabName = "Đoạn văn", DefaultContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam.", StylesJson = "{\"fontSize\":15,\"fontWeight\":400,\"color\":\"#475569\",\"lineHeight\":1.7}", DefaultWidth = 500, DefaultHeight = 80, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn nhỏ", TabName = "Đoạn văn", DefaultContent = "Mô tả ngắn gọn sản phẩm hoặc dịch vụ của bạn.", StylesJson = "{\"fontSize\":13,\"fontWeight\":400,\"color\":\"#64748b\",\"lineHeight\":1.6}", DefaultWidth = 400, DefaultHeight = 50, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Trích dẫn", TabName = "Đoạn văn", DefaultContent = "\"Đây là một câu trích dẫn nổi bật để thu hút sự chú ý của khách hàng.\"", StylesJson = "{\"fontSize\":20,\"fontWeight\":500,\"color\":\"#7c3aed\",\"fontStyle\":\"italic\",\"lineHeight\":1.6}", DefaultWidth = 550, DefaultHeight = 80, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Chú thích", TabName = "Đoạn văn", DefaultContent = "* Điều kiện và điều khoản áp dụng", StylesJson = "{\"fontSize\":11,\"fontWeight\":400,\"color\":\"#94a3b8\",\"lineHeight\":1.5}", DefaultWidth = 300, DefaultHeight = 20, Order = 5 }
            );

            // Element Presets for "Văn bản" -> Danh sách tab
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách có dấu", TabName = "Danh sách", DefaultContent = "Tính năng thứ nhất\nTính năng thứ hai\nTính năng thứ ba", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#334155\",\"listStyle\":\"disc\"}", DefaultWidth = 400, DefaultHeight = 100, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách đánh số", TabName = "Danh sách", DefaultContent = "Bước 1: Đăng ký tài khoản\nBước 2: Chọn gói dịch vụ\nBước 3: Bắt đầu sử dụng", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#334155\",\"listStyle\":\"decimal\"}", DefaultWidth = 400, DefaultHeight = 100, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách check", TabName = "Danh sách", DefaultContent = "✓ Miễn phí dùng thử 14 ngày\n✓ Không cần thẻ tín dụng\n✓ Hỗ trợ 24/7\n✓ Hủy bất kỳ lúc nào", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#16a34a\",\"lineHeight\":2}", DefaultWidth = 400, DefaultHeight = 140, Order = 3 }
            );

            // Element Presets for "Nút bấm" -> Nút bấm tab
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Buy Now", TabName = "Nút bấm", DefaultContent = "Buy Now", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#000000\",\"borderRadius\":4}", DefaultWidth = 120, DefaultHeight = 44, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Shop Now", TabName = "Nút bấm", DefaultContent = "Shop Now", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#1e293b\",\"borderRadius\":4}", DefaultWidth = 120, DefaultHeight = 44, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Read More", TabName = "Nút bấm", DefaultContent = "Read More", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#000000\",\"backgroundColor\":\"#ffffff\",\"borderRadius\":4,\"borderWidth\":1,\"borderColor\":\"#000000\"}", DefaultWidth = 120, DefaultHeight = 44, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút chính", TabName = "Nút bấm", DefaultContent = "Bắt đầu ngay", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#4f46e5\",\"borderRadius\":8}", DefaultWidth = 200, DefaultHeight = 48, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Contact Us", TabName = "Nút bấm", DefaultContent = "Contact Us", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#1e40af\",\"borderRadius\":50}", DefaultWidth = 160, DefaultHeight = 48, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Contact Us viền", TabName = "Nút bấm", DefaultContent = "Contact Us", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#1e40af\",\"backgroundColor\":\"transparent\",\"borderRadius\":50,\"borderWidth\":2,\"borderColor\":\"#1e40af\"}", DefaultWidth = 160, DefaultHeight = 48, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Gửi →", TabName = "Nút bấm", DefaultContent = "Gửi →", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#2563eb\",\"borderRadius\":50}", DefaultWidth = 100, DefaultHeight = 44, Order = 7 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Click Here", TabName = "Nút bấm", DefaultContent = "Click Here", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#2563eb\",\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"textDecoration\":\"underline\"}", DefaultWidth = 100, DefaultHeight = 32, Order = 8 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút viền", TabName = "Nút bấm", DefaultContent = "Liên hệ", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#4f46e5\",\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":2,\"borderColor\":\"#4f46e5\"}", DefaultWidth = 160, DefaultHeight = 44, Order = 9 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút tròn (pill)", TabName = "Nút bấm", DefaultContent = "Đăng ký", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#dc2626\",\"borderRadius\":50}", DefaultWidth = 200, DefaultHeight = 50, Order = 10 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút có bóng", TabName = "Nút bấm", DefaultContent = "Gửi", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#6366f1\",\"borderRadius\":10,\"boxShadow\":\"0 10px 25px rgba(99,102,241,0.35)\"}", DefaultWidth = 120, DefaultHeight = 48, Order = 11 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Xem Thêm", TabName = "Nút bấm", DefaultContent = "Xem Thêm", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#000000\",\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"textDecoration\":\"underline\"}", DefaultWidth = 100, DefaultHeight = 32, Order = 12 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Mua Ngay →", TabName = "Nút bấm", DefaultContent = "Mua Ngay →", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#ea580c\",\"borderRadius\":50}", DefaultWidth = 160, DefaultHeight = 48, Order = 13 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "XEM TẤT CẢ", TabName = "Nút bấm", DefaultContent = "XEM TẤT CẢ", StylesJson = "{\"fontSize\":14,\"fontWeight\":700,\"color\":\"#dc2626\",\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"textTransform\":\"uppercase\"}", DefaultWidth = 140, DefaultHeight = 36, Order = 14 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "TẢI XUỐNG", TabName = "Nút bấm", DefaultContent = "TẢI XUỐNG", StylesJson = "{\"fontSize\":14,\"fontWeight\":700,\"color\":\"#ffffff\",\"backgroundColor\":\"#0d9488\",\"borderRadius\":8,\"textTransform\":\"uppercase\"}", DefaultWidth = 160, DefaultHeight = 48, Order = 15 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "THAM GIA", TabName = "Nút bấm", DefaultContent = "THAM GIA", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#1e40af\",\"backgroundColor\":\"#e0e7ff\",\"borderRadius\":50,\"textTransform\":\"uppercase\",\"fontFamily\":\"Georgia, serif\"}", DefaultWidth = 140, DefaultHeight = 44, Order = 16 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Let's Go", TabName = "Nút bấm", DefaultContent = "Let's Go", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#2563eb\",\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"borderWidth\":1,\"borderColor\":\"#2563eb\"}", DefaultWidth = 120, DefaultHeight = 44, Order = 17 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút xám", TabName = "Nút bấm", DefaultContent = "Xem thêm", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#1e293b\",\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":8}", DefaultWidth = 120, DefaultHeight = 44, Order = 18 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút xanh viền", TabName = "Nút bấm", DefaultContent = "Chi tiết", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#2563eb\",\"backgroundColor\":\"#f8fafc\",\"borderRadius\":8,\"borderWidth\":1,\"borderColor\":\"#2563eb\"}", DefaultWidth = 120, DefaultHeight = 44, Order = 19 }
            );
            // Element Presets for "Nút bấm" -> Nhóm nút bấm tab (single buttons that look like nav groups - user adds multiple)
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nhóm text link", TabName = "Nhóm nút bấm", DefaultContent = "Products | Solutions | Pricing | Contact", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#64748b\",\"backgroundColor\":\"transparent\",\"borderRadius\":0}", DefaultWidth = 400, DefaultHeight = 40, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nhóm nút viền", TabName = "Nhóm nút bấm", DefaultContent = "Giới thiệu | Dịch vụ | Liên hệ", StylesJson = "{\"fontSize\":13,\"fontWeight\":500,\"color\":\"#1e293b\",\"backgroundColor\":\"transparent\",\"borderRadius\":6,\"borderWidth\":1,\"borderColor\":\"#e2e8f0\"}", DefaultWidth = 320, DefaultHeight = 40, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nhóm nút pill", TabName = "Nhóm nút bấm", DefaultContent = "Tab 1 | Tab 2 | Tab 3", StylesJson = "{\"fontSize\":14,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#4f46e5\",\"borderRadius\":20}", DefaultWidth = 280, DefaultHeight = 44, Order = 3 }
            );

            // Presets for Chi tiết sản phẩm
            var productDetailContent = "{\"images\":[\"https://picsum.photos/400/400?random=1\"],\"title\":\"Áo thun nam cao cấp\",\"price\":\"1.290.000đ\",\"salePrice\":\"990.000đ\",\"description\":\"Chất liệu cotton 100%, thoáng mát, form dáng chuẩn.\",\"badge\":\"Giảm 23%\"}";
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPChiTiet.Id, Name = "Sản phẩm mẫu", TabName = null, DefaultContent = productDetailContent, StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12}", DefaultWidth = 360, DefaultHeight = 420, Order = 1 }
            );

            // Presets for Danh sách sản phẩm
            var collectionListContent = "{\"columns\":3,\"items\":[{\"image\":\"https://picsum.photos/200/200?random=2\",\"title\":\"Áo Polo Basic\",\"price\":\"299.000đ\"},{\"image\":\"https://picsum.photos/200/200?random=3\",\"title\":\"Quần Jeans Slim\",\"price\":\"499.000đ\"},{\"image\":\"https://picsum.photos/200/200?random=4\",\"title\":\"Giày Sneaker\",\"price\":\"890.000đ\"}]}";
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Danh sách 3 cột", TabName = null, DefaultContent = collectionListContent, StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12}", DefaultWidth = 600, DefaultHeight = 280, Order = 1 }
            );

            // Presets for Gallery - layoutType: grid | product-main-thumbs | minimal | vertical-thumbs
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Sản phẩm (ảnh lớn + thumb)", TabName = "Gallery", DefaultContent = "[\"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800\",\"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200\",\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200\",\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200\"]", StylesJson = "{\"layoutType\":\"product-main-thumbs\",\"columns\":3,\"gap\":8,\"backgroundColor\":\"#ffffff\"}", DefaultWidth = 500, DefaultHeight = 420, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Minimal (ảnh đơn)", TabName = "Gallery", DefaultContent = "[\"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800\"]", StylesJson = "{\"layoutType\":\"minimal\",\"backgroundColor\":\"#fce7f3\",\"borderRadius\":12}", DefaultWidth = 400, DefaultHeight = 350, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Thumb dọc bên trái", TabName = "Gallery", DefaultContent = "[\"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800\",\"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150\",\"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=150\",\"https://images.unsplash.com/photo-1556742111-a301076d9d18?w=150\"]", StylesJson = "{\"layoutType\":\"vertical-thumbs\",\"gap\":8,\"backgroundColor\":\"#f8fafc\"}", DefaultWidth = 550, DefaultHeight = 400, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Gallery 3 cột", TabName = "Gallery", DefaultContent = "[]", StylesJson = "{\"layoutType\":\"grid\",\"columns\":3,\"gap\":8}", DefaultWidth = 600, DefaultHeight = 400, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Gallery 4 cột", TabName = "Gallery", DefaultContent = "[]", StylesJson = "{\"layoutType\":\"grid\",\"columns\":4,\"gap\":6}", DefaultWidth = 700, DefaultHeight = 350, Order = 5 }
            );

            // Presets for Hình hộp - solid, outlined, dashed, per-corner radius, shadow
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Vuông nền xám", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":0,\"borderWidth\":0}", DefaultWidth = 120, DefaultHeight = 120, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Vuông viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\",\"borderStyle\":\"solid\"}", DefaultWidth = 120, DefaultHeight = 120, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Tròn nền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":999,\"borderWidth\":0}", DefaultWidth = 120, DefaultHeight = 120, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Tròn viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":999,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\",\"borderStyle\":\"solid\"}", DefaultWidth = 120, DefaultHeight = 120, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Chữ nhật nền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":0,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Chữ nhật viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\",\"borderStyle\":\"solid\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp đổ bóng nhẹ", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"borderWidth\":0,\"boxShadow\":\"0 2px 8px rgba(0,0,0,0.08)\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 7 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp đổ bóng đậm", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"borderWidth\":0,\"boxShadow\":\"0 4px 12px rgba(0,0,0,0.15)\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 8 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp xanh nền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#2563eb\",\"borderRadius\":8,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 9 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp xanh viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":3,\"borderColor\":\"#2563eb\",\"borderStyle\":\"solid\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 10 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp viền chấm", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":0,\"borderWidth\":2,\"borderColor\":\"#1e293b\",\"borderStyle\":\"dashed\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 11 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Góc chéo (TL+BR)", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#7c3aed\",\"borderRadius\":12,\"borderTopLeftRadius\":20,\"borderTopRightRadius\":0,\"borderBottomLeftRadius\":0,\"borderBottomRightRadius\":20,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 12 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Góc chéo (TR+BL)", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#2e8b57\",\"borderRadius\":12,\"borderTopLeftRadius\":0,\"borderTopRightRadius\":20,\"borderBottomLeftRadius\":20,\"borderBottomRightRadius\":0,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 13 }
            );

            // Presets for Đường kẻ (divider/line)
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen vừa", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt đen đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":4,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[8,4]\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét chấm đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,4]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Đường kép đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"double\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền xám", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#94a3b8\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt xanh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#2563eb\",\"height\":3,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[8,4]\"}", DefaultWidth = 400, DefaultHeight = 3, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét chấm cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,3]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 7 }
            );

            // Presets for Biểu tượng (icon)
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Ngôi sao", TabName = null, DefaultContent = "★", StylesJson = "{\"color\":\"#f59e0b\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Trái tim", TabName = null, DefaultContent = "❤", StylesJson = "{\"color\":\"#ef4444\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Dấu tick", TabName = null, DefaultContent = "✔", StylesJson = "{\"color\":\"#16a34a\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Thông tin", TabName = null, DefaultContent = "ℹ", StylesJson = "{\"color\":\"#3b82f6\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Cảnh báo", TabName = null, DefaultContent = "⚠", StylesJson = "{\"color\":\"#eab308\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 5 }
            );

            // Presets for Ảnh
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh mặc định", TabName = null, DefaultContent = "Image", StylesJson = "{\"borderRadius\":0}", DefaultWidth = 400, DefaultHeight = 260, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh bo góc", TabName = null, DefaultContent = "Image", StylesJson = "{\"borderRadius\":16,\"shadow\":\"0 10px 30px rgba(15,23,42,0.21)\"}", DefaultWidth = 420, DefaultHeight = 280, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh avatar tròn", TabName = null, DefaultContent = "Avatar", StylesJson = "{\"borderRadius\":9999}", DefaultWidth = 160, DefaultHeight = 160, Order = 3 }
            );

            // Presets for Video
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVideo.Id, Name = "Video 16:9", TabName = null, DefaultContent = "https://www.youtube.com/embed/dQw4w9WgXcQ", StylesJson = "{\"borderRadius\":12}", DefaultWidth = 560, DefaultHeight = 315, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiVideo.Id, Name = "Video 4:3", TabName = null, DefaultContent = "https://www.youtube.com/embed/jNQXAC9IVRw", StylesJson = "{\"borderRadius\":8}", DefaultWidth = 480, DefaultHeight = 360, Order = 2 }
            );

            // Presets for Form
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form viền mỏng", TabName = "Form", DefaultContent = "{\"formType\":\"contact\",\"title\":\"Liên hệ\",\"buttonText\":\"Đặt ngay\",\"fields\":[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\"},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"},{\"id\":\"message\",\"name\":\"message\",\"label\":\"Để lại lời nhắn\",\"placeholder\":\"Để lại lời nhắn cho chúng tôi\",\"type\":\"textarea\"}],\"inputStyle\":\"outlined\"}", StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 320, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form Login", TabName = "Form Login", DefaultContent = "{\"formType\":\"login\",\"title\":\"\",\"buttonText\":\"Đăng nhập\",\"fields\":[{\"id\":\"accessCode\",\"name\":\"accessCode\",\"label\":\"Mã truy cập\",\"placeholder\":\"Mã truy cập\",\"type\":\"text\"}],\"inputStyle\":\"outlined\"}", StylesJson = "{\"fontSize\":14}", DefaultWidth = 360, DefaultHeight = 56, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form OTP", TabName = "Form OTP", DefaultContent = "{\"formType\":\"otp\",\"title\":\"Vui lòng xác nhận OTP\",\"buttonText\":\"Xác nhận OTP\",\"fields\":[{\"id\":\"otp\",\"name\":\"otp\",\"label\":\"Mã OTP\",\"placeholder\":\"Nhập mã OTP\",\"type\":\"text\"}],\"inputStyle\":\"outlined\"}", StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 180, Order = 3 }
            );

            // Presets for tiện ích: Countdown, HTML, Map, Social share, Rating, Progress
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiCountdown.Id, Name = "Đếm ngược mặc định", TabName = null, DefaultContent = "", StylesJson = "{\"fontSize\":24}", DefaultWidth = 320, DefaultHeight = 80, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiHtml.Id, Name = "Khối HTML trống", TabName = null, DefaultContent = "<div>HTML tùy chỉnh</div>", StylesJson = "{}", DefaultWidth = 400, DefaultHeight = 200, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiMaHtml.Id, Name = "HTML/JAVASCRIPT", TabName = "HTML/JAVASCRIPT", DefaultContent = "{\"subType\":\"html-js\",\"code\":\"<div style=\\\"padding:16px;background:#f8fafc;border-radius:8px;font-family:monospace;font-size:12px\\\">Nhấn <b>Sửa HTML</b> để thêm mã tùy chỉnh</div>\",\"iframeSrc\":\"\"}", StylesJson = "{}", DefaultWidth = 400, DefaultHeight = 250, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiMaHtml.Id, Name = "IFRAME", TabName = "IFRAME", DefaultContent = "{\"subType\":\"iframe\",\"code\":\"\",\"iframeSrc\":\"https://example.com\"}", StylesJson = "{}", DefaultWidth = 400, DefaultHeight = 250, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiMap.Id, Name = "Google Maps mặc định", TabName = null, DefaultContent = "10.762622,106.660172", StylesJson = "{}", DefaultWidth = 500, DefaultHeight = 300, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSocialShare.Id, Name = "Thanh chia sẻ", TabName = null, DefaultContent = "facebook,zalo,linkedin", StylesJson = "{\"fontSize\":14}", DefaultWidth = 260, DefaultHeight = 40, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiRating.Id, Name = "5 sao", TabName = null, DefaultContent = "5", StylesJson = "{\"color\":\"#f59e0b\"}", DefaultWidth = 200, DefaultHeight = 40, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiProgress.Id, Name = "Tiến trình 75%", TabName = null, DefaultContent = "75", StylesJson = "{\"backgroundColor\":\"#e2e8f0\"}", DefaultWidth = 400, DefaultHeight = 24, Order = 1 }
            );

            // Presets for Antigravity UI
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiAntigravity.Id, Name = "Antigravity UI", TabName = null, DefaultContent = "Antigravity UI Component", StylesJson = "{}", DefaultWidth = 800, DefaultHeight = 600, Order = 1 }
            );

            // Presets for "Yêu thích"
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtTieuDe.Id, Name = "Tiêu đề chính", TabName = "Tiêu đề", DefaultContent = "Tiêu đề của bạn", StylesJson = "{\"fontSize\":28,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 500, DefaultHeight = 45, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtTieuDe.Id, Name = "Tiêu đề phụ", TabName = "Tiêu đề", DefaultContent = "Tiêu đề phụ", StylesJson = "{\"fontSize\":20,\"fontWeight\":600,\"color\":\"#475569\"}", DefaultWidth = 400, DefaultHeight = 32, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtNut.Id, Name = "Nút CTA chính", TabName = "Nút", DefaultContent = "Bắt đầu ngay", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#4f46e5\",\"borderRadius\":8}", DefaultWidth = 180, DefaultHeight = 48, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtNut.Id, Name = "Nút viền", TabName = "Nút", DefaultContent = "Tìm hiểu thêm", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#4f46e5\",\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":2,\"borderColor\":\"#4f46e5\"}", DefaultWidth = 160, DefaultHeight = 44, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtAnh.Id, Name = "Ảnh mặc định", TabName = "Ảnh", DefaultContent = "Image", StylesJson = "{\"borderRadius\":8}", DefaultWidth = 400, DefaultHeight = 260, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtDoanVan.Id, Name = "Đoạn văn mô tả", TabName = "Đoạn văn", DefaultContent = "Mô tả ngắn gọn về sản phẩm hoặc dịch vụ của bạn. Thu hút khách hàng với nội dung hấp dẫn.", StylesJson = "{\"fontSize\":15,\"fontWeight\":400,\"color\":\"#475569\",\"lineHeight\":1.7}", DefaultWidth = 500, DefaultHeight = 80, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtHinhHop.Id, Name = "Hộp nền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":8,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtHinhHop.Id, Name = "Hộp viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtDuongKe.Id, Name = "Đường kẻ ngang", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 1 }
            );

            await db.SaveChangesAsync();
        }
        else
        {
            // Thêm danh mục "Yêu thích" nếu chưa có (cho DB đã tồn tại)
            var catYeuThichExisting = await db.ToolCategories.FirstOrDefaultAsync(c => c.Name == "Yêu thích");
            if (catYeuThichExisting == null)
            {
                var catYeuThich = new LadiPage.Domain.Entities.ToolCategory { Name = "Yêu thích", Icon = "star", Order = 13, IsActive = true };
                db.ToolCategories.Add(catYeuThich);
                await db.SaveChangesAsync();

                var tiYtTieuDe = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Tiêu đề nhanh", Icon = "type", ElementType = "headline", Order = 1, HasSubTabs = true, SubTabsJson = "[\"Tiêu đề\"]" };
                var tiYtNut = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Nút CTA", Icon = "mouse-pointer-click", ElementType = "button", Order = 2, HasSubTabs = true, SubTabsJson = "[\"Nút\"]" };
                var tiYtAnh = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Hình ảnh", Icon = "image", ElementType = "image", Order = 3, HasSubTabs = true, SubTabsJson = "[\"Ảnh\"]" };
                var tiYtDoanVan = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Đoạn văn", Icon = "align-left", ElementType = "paragraph", Order = 4, HasSubTabs = true, SubTabsJson = "[\"Đoạn văn\"]" };
                var tiYtHinhHop = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Hình hộp", Icon = "square", ElementType = "shape", Order = 5, HasSubTabs = true, SubTabsJson = "[\"Hình hộp\"]" };
                var tiYtDuongKe = new LadiPage.Domain.Entities.ToolItem { CategoryId = catYeuThich.Id, Name = "Đường kẻ", Icon = "minus", ElementType = "divider", Order = 6, HasSubTabs = true, SubTabsJson = "[\"Đường kẻ\"]" };
                db.ToolItems.AddRange(tiYtTieuDe, tiYtNut, tiYtAnh, tiYtDoanVan, tiYtHinhHop, tiYtDuongKe);
                await db.SaveChangesAsync();

                db.ElementPresets.AddRange(
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtTieuDe.Id, Name = "Tiêu đề chính", TabName = "Tiêu đề", DefaultContent = "Tiêu đề của bạn", StylesJson = "{\"fontSize\":28,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 500, DefaultHeight = 45, Order = 1 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtTieuDe.Id, Name = "Tiêu đề phụ", TabName = "Tiêu đề", DefaultContent = "Tiêu đề phụ", StylesJson = "{\"fontSize\":20,\"fontWeight\":600,\"color\":\"#475569\"}", DefaultWidth = 400, DefaultHeight = 32, Order = 2 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtNut.Id, Name = "Nút CTA chính", TabName = "Nút", DefaultContent = "Bắt đầu ngay", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#4f46e5\",\"borderRadius\":8}", DefaultWidth = 180, DefaultHeight = 48, Order = 1 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtNut.Id, Name = "Nút viền", TabName = "Nút", DefaultContent = "Tìm hiểu thêm", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#4f46e5\",\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":2,\"borderColor\":\"#4f46e5\"}", DefaultWidth = 160, DefaultHeight = 44, Order = 2 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtAnh.Id, Name = "Ảnh mặc định", TabName = "Ảnh", DefaultContent = "Image", StylesJson = "{\"borderRadius\":8}", DefaultWidth = 400, DefaultHeight = 260, Order = 1 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtDoanVan.Id, Name = "Đoạn văn mô tả", TabName = "Đoạn văn", DefaultContent = "Mô tả ngắn gọn về sản phẩm hoặc dịch vụ của bạn. Thu hút khách hàng với nội dung hấp dẫn.", StylesJson = "{\"fontSize\":15,\"fontWeight\":400,\"color\":\"#475569\",\"lineHeight\":1.7}", DefaultWidth = 500, DefaultHeight = 80, Order = 1 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtHinhHop.Id, Name = "Hộp nền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"borderRadius\":8,\"borderWidth\":0}", DefaultWidth = 200, DefaultHeight = 100, Order = 1 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtHinhHop.Id, Name = "Hộp viền", TabName = "Hình hộp", DefaultContent = "[]", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\"}", DefaultWidth = 200, DefaultHeight = 100, Order = 2 },
                    new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiYtDuongKe.Id, Name = "Đường kẻ ngang", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#e2e8f0\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 1 }
                );
                await db.SaveChangesAsync();
            }
        }

        if (!await db.Plans.AnyAsync())
        {
            db.Plans.AddRange(
                new LadiPage.Domain.Entities.Plan { Name = "Miễn phí", Code = "free", Price = 0, BillingCycle = "thang", MaxPages = 10, MaxMembers = 1, StorageGb = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Domain.Entities.Plan { Name = "Pro", Code = "pro", Price = 299000, BillingCycle = "thang", MaxPages = 100, MaxMembers = 5, MaxPageViews = 100000, StorageGb = 10, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Domain.Entities.Plan { Name = "Enterprise", Code = "enterprise", Price = 999000, BillingCycle = "thang", MaxPages = 9999, MaxMembers = 50, MaxPageViews = 1000000, StorageGb = 100, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        // Seed sample notifications for every user who has none
        var usersWithoutNotifs = await db.Users.Where(u => !db.Notifications.Any(n => n.UserId == u.Id)).Select(u => u.Id).ToListAsync();
        foreach (var uid in usersWithoutNotifs)
        {
            db.Notifications.AddRange(
                new LadiPage.Domain.Entities.Notification { UserId = uid, Title = "Chào mừng đến PagePeak!", Message = "Bạn đã đăng ký thành công. Hãy bắt đầu tạo landing page đầu tiên.", Type = "success", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
                new LadiPage.Domain.Entities.Notification { UserId = uid, Title = "Hướng dẫn sử dụng", Message = "Xem hướng dẫn tạo landing page chuyên nghiệp trong 5 phút.", Type = "info", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
                new LadiPage.Domain.Entities.Notification { UserId = uid, Title = "Mẫu giao diện mới", Message = "30+ mẫu landing page mới đã được thêm vào thư viện.", Type = "info", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
            );
        }
        if (usersWithoutNotifs.Count > 0) await db.SaveChangesAsync();

        // Seed templates mau neu chua co
        if (await db.Templates.CountAsync() < 30)
        {
            db.Templates.RemoveRange(await db.Templates.ToListAsync());
            await db.SaveChangesAsync();

            var tpl = (string name, string cat, string thumb, string desc, bool featured, int usage, bool premium = false) =>
                new LadiPage.Domain.Entities.Template
                {
                    Name = name, Category = cat, ThumbnailUrl = thumb,
                    Description = desc, IsFeatured = featured, IsPremium = premium, UsageCount = usage,
                    JsonContent = $"{{{{\"version\":1,\"blocks\":[{{{{\"type\":\"hero\",\"title\":\"{name}\"}}}}]}}}}",
                    CreatedAt = DateTime.UtcNow
                };

            db.Templates.AddRange(
                // Thương mại điện tử
                tpl("Flash Sale - Siêu khuyến mãi", "Thương mại điện tử", "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=400&fit=crop", "Landing page khuyến mãi sốc, đếm ngược thời gian", true, 12450),
                tpl("Shop thời trang Online", "Thương mại điện tử", "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop", "Giao diện cửa hàng thời trang hiện đại", false, 8320),
                tpl("Mỹ phẩm - Beauty Care", "Thương mại điện tử", "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop", "Landing page sản phẩm mỹ phẩm, skincare", true, 9870),
                tpl("Sản phẩm công nghệ", "Thương mại điện tử", "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=400&fit=crop", "Giới thiệu smartphone, laptop, phụ kiện", false, 5410),
                tpl("Đồ gia dụng thông minh", "Thương mại điện tử", "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop", "Landing page thiết bị smarthome", false, 3200),
                tpl("Black Friday Sale", "Thương mại điện tử", "https://images.unsplash.com/photo-1573855619003-97b4799dcd8b?w=600&h=400&fit=crop", "Template giảm giá Black Friday hoành tráng", true, 15600, true),
                tpl("Thực phẩm sạch - Organic", "Thương mại điện tử", "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop", "Landing page thực phẩm organic, healthy", false, 4150),
                tpl("Đồ handmade - Craft", "Thương mại điện tử", "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop", "Giao diện bán đồ thủ công mỹ nghệ", false, 2900),

                // Dịch vụ
                tpl("Dịch vụ tư vấn tài chính", "Dịch vụ", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop", "Landing page tư vấn đầu tư, bảo hiểm", true, 7640),
                tpl("Spa & Massage", "Dịch vụ", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop", "Giao diện spa thư giãn sang trọng", false, 6120),
                tpl("Dịch vụ vận chuyển", "Dịch vụ", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop", "Landing page logistics, giao hàng nhanh", false, 3890),
                tpl("Studio chụp ảnh cưới", "Dịch vụ", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop", "Giao diện studio ảnh cưới lãng mạn", true, 8900, true),
                tpl("Dịch vụ sửa chữa nhà", "Dịch vụ", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop", "Landing page dịch vụ sửa nhà, nội thất", false, 2340),
                tpl("Agency Marketing", "Dịch vụ", "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop", "Giao diện agency digital marketing", true, 11200, true),

                // Giáo dục
                tpl("Khóa học Online", "Giáo dục", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop", "Landing page khóa học trực tuyến chuyên nghiệp", true, 14500, true),
                tpl("Trung tâm tiếng Anh", "Giáo dục", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop", "Landing page trung tâm ngoại ngữ", false, 5670),
                tpl("Tuyển sinh đại học", "Giáo dục", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop", "Giao diện tuyển sinh, xét tuyển 2025", false, 4200),
                tpl("Workshop kỹ năng", "Giáo dục", "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop", "Landing page workshop, khoá học ngắn hạn", false, 3450),

                // Sự kiện
                tpl("Webinar đăng ký", "Sự kiện", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", "Landing page đăng ký webinar chuyên ngành", true, 10200, true),
                tpl("Hội nghị thượng đỉnh", "Sự kiện", "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop", "Giao diện hội nghị, summit doanh nghiệp", false, 6780),
                tpl("Music Festival", "Sự kiện", "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop", "Landing page sự kiện âm nhạc sôi động", true, 7890),
                tpl("Sự kiện ra mắt sản phẩm", "Sự kiện", "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop", "Giao diện launch event hoành tráng", false, 5430),

                // Bất động sản
                tpl("Dự án căn hộ cao cấp", "Bất động sản", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop", "Landing page bất động sản hạng sang", true, 13400, true),
                tpl("Biệt thự nghỉ dưỡng", "Bất động sản", "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop", "Giao diện biệt thự, resort cao cấp", false, 6200),
                tpl("Chung cư mini", "Bất động sản", "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop", "Landing page dự án chung cư tầm trung", false, 4500),
                tpl("Đất nền dự án", "Bất động sản", "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop", "Giao diện bán đất nền, phân lô", false, 3100),

                // Sức khỏe
                tpl("Fitness & Gym", "Sức khỏe", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop", "Landing page phòng gym, PT cá nhân", true, 9300, true),
                tpl("Phòng khám nha khoa", "Sức khỏe", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop", "Giao diện phòng khám răng hiện đại", false, 4800),
                tpl("Thực phẩm chức năng", "Sức khỏe", "https://images.unsplash.com/photo-1505576399279-0d309eed513e?w=600&h=400&fit=crop", "Landing page TPCN, vitamin, bổ sung", false, 5600),
                tpl("Yoga & Thiền", "Sức khỏe", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop", "Giao diện lớp yoga, thiền định online", false, 3700),

                // Nhà hàng & F&B
                tpl("Nhà hàng - Restaurant", "Nhà hàng", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop", "Landing page nhà hàng sang trọng", true, 8700),
                tpl("Quán cà phê", "Nhà hàng", "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop", "Giao diện quán café phong cách", false, 6300),
                tpl("Đặt đồ ăn Online", "Nhà hàng", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop", "Landing page order food delivery", false, 4100),
                tpl("Tiệm bánh - Bakery", "Nhà hàng", "https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=600&h=400&fit=crop", "Giao diện tiệm bánh ngọt đẹp mắt", false, 3500),

                // Công nghệ
                tpl("SaaS Landing Page", "Công nghệ", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop", "Landing page sản phẩm SaaS chuyên nghiệp", true, 16200, true),
                tpl("App Mobile Download", "Công nghệ", "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop", "Giao diện giới thiệu ứng dụng mobile", true, 11800, true),
                tpl("Startup - Pitch", "Công nghệ", "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop", "Landing page startup gọi vốn đầu tư", false, 7400),

                // Tiện ích
                tpl("Coming Soon", "Tiện ích", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop", "Trang sắp ra mắt với đếm ngược", false, 8900),
                tpl("Thank You Page", "Tiện ích", "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?w=600&h=400&fit=crop", "Trang cảm ơn sau chuyển đổi", false, 7200),
                tpl("Thu Lead - Ebook", "Tiện ích", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=400&fit=crop", "Landing page tải ebook miễn phí", true, 10500, true),
                tpl("Đăng ký tư vấn", "Tiện ích", "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop", "Landing page form đăng ký tư vấn", false, 6800)
            );
            await db.SaveChangesAsync();
        }
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseResponseCompression();
app.UseCors();
app.UseResponseCaching();
app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.UseStaticFiles();

app.Run();
