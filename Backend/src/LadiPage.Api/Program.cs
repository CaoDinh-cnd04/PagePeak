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
builder.Services.AddScoped<OnePayCallbackProcessor>();

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

        // Code-first: áp dụng mọi migration trong LadiPage.Infrastructure/Migrations (đồng bộ schema với entity + ProductConfiguration).
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
            var tiFrame = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Frame", Icon = "frame", ElementType = "frame", Order = 10, HasSubTabs = true, SubTabsJson = "[\"Quote\",\"Feature\",\"Profile\",\"Số liệu\",\"Trống\"]" };
            var tiAccordion = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Accordion", Icon = "chevrons-down", ElementType = "accordion", Order = 11, HasSubTabs = false };
            var tiTable = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Table", Icon = "table", ElementType = "table", Order = 12, HasSubTabs = false };
            var tiMenu = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Menu", Icon = "menu", ElementType = "menu", Order = 13, HasSubTabs = false };
            var tiCarousel = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Carousel", Icon = "gallery-horizontal", ElementType = "carousel", Order = 14, HasSubTabs = true, SubTabsJson = "[\"Product\",\"Testimonial\",\"Media\",\"Hero\",\"Cards\",\"Logos\",\"Stats\"]" };
            var tiMaHtml = new LadiPage.Domain.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Mã HTML", Icon = "code", ElementType = "html-code", Order = 15, HasSubTabs = true, SubTabsJson = "[\"HTML/JAVASCRIPT\",\"IFRAME\"]" };

            db.ToolItems.AddRange(tiVanBan, tiNutBam, tiAnh, tiGallery, tiHinhHop, tiBieuTuong, tiDuongKe, tiForm, tiVideo, tiFrame, tiAccordion, tiTable, tiMenu, tiCarousel, tiMaHtml);

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

            // Presets for Chi tiết sản phẩm — 6 preset theo ngành hàng
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Thời trang nam", TabName = null, Order = 1,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"boxShadow\":\"0 4px 24px rgba(0,0,0,0.08)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/fashion1/600/600\",\"https://picsum.photos/seed/fashion2/600/600\",\"https://picsum.photos/seed/fashion3/600/600\"],\"title\":\"Áo thun nam Premium Cotton\",\"price\":\"1.290.000đ\",\"salePrice\":\"890.000đ\",\"description\":\"Chất liệu cotton 100% Pima cao cấp, thoáng mát, form dáng chuẩn Slim Fit. Co giãn 4 chiều, không nhăn nhúm sau khi giặt.\",\"badge\":\"Giảm 31%\",\"rating\":4.5,\"reviewCount\":128,\"sku\":\"AT-001-PIMA\",\"stockStatus\":\"instock\",\"stockText\":\"Còn 42 sản phẩm\",\"category\":\"Thời trang nam\",\"features\":[\"Cotton 100% Pima cao cấp\",\"Co giãn 4 chiều thoải mái\",\"Không phai màu sau 100 lần giặt\",\"Giao hàng toàn quốc 2-3 ngày\"],\"variants\":[{\"label\":\"Size\",\"type\":\"size\",\"options\":[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]},{\"label\":\"Màu sắc\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Navy\",\"Xám\"]}],\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#6366f1\",\"cardRadius\":12,\"imageRadius\":8}"
                },
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Điện tử - Tai nghe", TabName = null, Order = 2,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#0f172a\",\"borderRadius\":16,\"boxShadow\":\"0 8px 32px rgba(0,0,0,0.3)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/headphone1/600/600\",\"https://picsum.photos/seed/headphone2/600/600\",\"https://picsum.photos/seed/headphone3/600/600\"],\"title\":\"Tai nghe Bluetooth Premium ANC\",\"price\":\"4.990.000đ\",\"salePrice\":\"2.990.000đ\",\"description\":\"Chống ồn chủ động ANC thế hệ mới, âm thanh Hi-Res 40mm, pin 30h liên tục. Kết nối đa điểm Bluetooth 5.3 cùng lúc 2 thiết bị.\",\"badge\":\"HOT -40%\",\"rating\":4.8,\"reviewCount\":256,\"sku\":\"HP-ANC-PRO\",\"stockStatus\":\"limited\",\"stockText\":\"Chỉ còn 8 sản phẩm\",\"category\":\"Điện tử\",\"features\":[\"ANC chống ồn thế hệ mới\",\"Pin 30 giờ liên tục\",\"Bluetooth 5.3 đa điểm\",\"Chất âm Hi-Res Audio\",\"Sạc nhanh 15 phút = 3h dùng\"],\"variants\":[{\"label\":\"Màu\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Xanh\"]},{\"label\":\"Gói\",\"type\":\"text\",\"options\":[\"Cơ bản\",\"Kèm túi\",\"Cao cấp\"]}],\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#6366f1\",\"cardRadius\":16,\"imageRadius\":0}"
                },
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Mỹ phẩm - Serum", TabName = null, Order = 3,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#fff9f5\",\"borderRadius\":16,\"boxShadow\":\"0 4px 20px rgba(251,146,60,0.15)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/serum1/600/600\",\"https://picsum.photos/seed/serum2/600/600\",\"https://picsum.photos/seed/serum3/600/600\"],\"title\":\"Serum Vitamin C 20% Sáng Da\",\"price\":\"890.000đ\",\"salePrice\":\"590.000đ\",\"description\":\"Công thức nồng độ cao Vitamin C 20% kết hợp Niacinamide và Hyaluronic Acid. Làm sáng da, mờ thâm nám, cấp ẩm 72 giờ. Phù hợp mọi loại da.\",\"badge\":\"Best Seller\",\"rating\":4.7,\"reviewCount\":342,\"sku\":\"VTC-20-30ML\",\"stockStatus\":\"instock\",\"stockText\":\"\",\"category\":\"Chăm sóc da\",\"features\":[\"Vitamin C 20% nồng độ cao\",\"Kết hợp Niacinamide + HA\",\"Sáng da sau 2 tuần\",\"Không cồn, không paraben\",\"Kiểm nghiệm da liễu\"],\"variants\":[{\"label\":\"Dung tích\",\"type\":\"text\",\"options\":[\"30ml\",\"50ml\",\"100ml\"]},{\"label\":\"Loại da\",\"type\":\"text\",\"options\":[\"Da thường\",\"Da dầu\",\"Da khô\"]}],\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#f97316\",\"cardRadius\":16,\"imageRadius\":12}"
                },
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Thực phẩm - Hộp quà", TabName = null, Order = 4,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"boxShadow\":\"0 4px 16px rgba(0,0,0,0.06)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/food1/600/600\",\"https://picsum.photos/seed/food2/600/600\",\"https://picsum.photos/seed/food3/600/600\"],\"title\":\"Hộp Quà Trà Thảo Mộc Premium\",\"price\":\"850.000đ\",\"salePrice\":\"650.000đ\",\"description\":\"Bộ quà tặng sang trọng gồm 6 loại trà thảo mộc cao cấp nhập khẩu. Hộp thiết kế đẹp, phù hợp làm quà tặng dịp lễ Tết, sinh nhật, sự kiện.\",\"badge\":\"Quà tặng\",\"rating\":4.9,\"reviewCount\":87,\"sku\":\"TRA-GIF-06\",\"stockStatus\":\"instock\",\"stockText\":\"Còn 25 hộp\",\"category\":\"Thực phẩm & Quà tặng\",\"features\":[\"6 loại trà thảo mộc cao cấp\",\"Hộp thiết kế sang trọng\",\"Kèm thiệp chúc mừng\",\"Giao hàng miễn phí toàn quốc\",\"Hạn sử dụng 24 tháng\"],\"variants\":[{\"label\":\"Kích thước\",\"type\":\"text\",\"options\":[\"6 hộp\",\"12 hộp\",\"24 hộp\"]},{\"label\":\"Có thiệp\",\"type\":\"text\",\"options\":[\"Có\",\"Không\"]}],\"buyButtonText\":\"Đặt hàng ngay\",\"addCartText\":\"Thêm giỏ hàng\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#16a34a\",\"cardRadius\":12,\"imageRadius\":8}"
                },
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Sách - Khóa học", TabName = null, Order = 5,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12,\"boxShadow\":\"0 2px 12px rgba(0,0,0,0.06)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/book1/600/600\",\"https://picsum.photos/seed/book2/600/600\"],\"title\":\"Khóa Học Marketing Online Toàn Diện 2025\",\"price\":\"2.990.000đ\",\"salePrice\":\"990.000đ\",\"description\":\"Khóa học 48 giờ video HD từ chuyên gia Marketing 10+ năm kinh nghiệm. Học mọi lúc mọi nơi, trọn đời. Bao gồm tài liệu, bài tập thực hành và hỗ trợ cộng đồng.\",\"badge\":\"Giảm 67%\",\"rating\":4.6,\"reviewCount\":1204,\"sku\":\"MKTG-2025-PRO\",\"stockStatus\":\"instock\",\"stockText\":\"Đăng ký không giới hạn\",\"category\":\"Giáo dục & Đào tạo\",\"features\":[\"48 giờ video chất lượng HD\",\"Học mọi lúc - Truy cập trọn đời\",\"Chứng chỉ hoàn thành\",\"Hỗ trợ 1-1 với giảng viên\",\"Cộng đồng 10.000+ học viên\"],\"variants\":[{\"label\":\"Gói học\",\"type\":\"text\",\"options\":[\"Cơ bản\",\"Nâng cao\",\"Mentor\"]}],\"buyButtonText\":\"Đăng ký ngay\",\"addCartText\":\"Tìm hiểu thêm\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#2563eb\",\"cardRadius\":12,\"imageRadius\":8}"
                },
                new LadiPage.Domain.Entities.ElementPreset
                {
                    ToolItemId = tiSPChiTiet.Id, Name = "Nội thất - Ghế văn phòng", TabName = null, Order = 6,
                    DefaultWidth = 380, DefaultHeight = 600,
                    StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"boxShadow\":\"0 4px 20px rgba(0,0,0,0.08)\"}",
                    DefaultContent = "{\"images\":[\"https://picsum.photos/seed/chair1/600/600\",\"https://picsum.photos/seed/chair2/600/600\",\"https://picsum.photos/seed/chair3/600/600\"],\"title\":\"Ghế Công Thái Học Ergonomic Pro\",\"price\":\"8.500.000đ\",\"salePrice\":\"5.990.000đ\",\"description\":\"Ghế văn phòng công thái học cao cấp, điều chỉnh độ cao, tựa lưng, tựa tay 4D. Lưới thoáng khí, phù hợp ngồi 8+ giờ. Bảo hành 5 năm chính hãng.\",\"badge\":\"Trả góp 0%\",\"rating\":4.8,\"reviewCount\":63,\"sku\":\"GHE-ERGO-PRO\",\"stockStatus\":\"instock\",\"stockText\":\"Giao hàng 3-5 ngày\",\"category\":\"Nội thất văn phòng\",\"features\":[\"Điều chỉnh độ cao điện khí\",\"Tựa tay 4D linh hoạt\",\"Lưới thoáng khí Breathe-Mesh\",\"Tựa đầu điều chỉnh 6 hướng\",\"Bảo hành 5 năm chính hãng\"],\"variants\":[{\"label\":\"Màu\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Xanh\"]},{\"label\":\"Khung\",\"type\":\"text\",\"options\":[\"Nhôm\",\"Nhựa\"]}],\"buyButtonText\":\"Đặt mua ngay\",\"addCartText\":\"Xem chi tiết\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"accentColor\":\"#0ea5e9\",\"cardRadius\":8,\"imageRadius\":6}"
                }
            );

            // Presets for Danh sách sản phẩm (collection-list) — dữ liệu mới đẹp với badge, rating, originalPrice
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Thời trang 3 cột", TabName = null, Order = 1, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#fff7f0\",\"borderRadius\":12}",
                    DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#e11d48\",\"items\":[{\"image\":\"https://picsum.photos/seed/fa1/400/400\",\"title\":\"Áo Polo Basic Cotton Premium\",\"price\":\"299.000đ\",\"originalPrice\":\"450.000đ\",\"badge\":\"-34%\",\"rating\":4.5},{\"image\":\"https://picsum.photos/seed/fa2/400/400\",\"title\":\"Quần Jeans Slim Fit Cao Cấp\",\"price\":\"499.000đ\",\"originalPrice\":\"699.000đ\",\"badge\":\"HOT\",\"rating\":4.3},{\"image\":\"https://picsum.photos/seed/fa3/400/400\",\"title\":\"Giày Sneaker Trắng Classic\",\"price\":\"890.000đ\",\"originalPrice\":\"1.200.000đ\",\"badge\":\"-26%\",\"rating\":4.7}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Điện tử 3 cột", TabName = null, Order = 2, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#eff6ff\",\"borderRadius\":12}",
                    DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#2563eb\",\"items\":[{\"image\":\"https://picsum.photos/seed/te1/400/400\",\"title\":\"Tai nghe Bluetooth ANC Pro\",\"price\":\"1.990.000đ\",\"originalPrice\":\"2.990.000đ\",\"badge\":\"-33%\",\"rating\":4.8},{\"image\":\"https://picsum.photos/seed/te2/400/400\",\"title\":\"Sạc nhanh 65W GaN Compact\",\"price\":\"450.000đ\",\"originalPrice\":\"650.000đ\",\"badge\":\"Mới\",\"rating\":4.6},{\"image\":\"https://picsum.photos/seed/te3/400/400\",\"title\":\"Chuột không dây Ergonomic\",\"price\":\"320.000đ\",\"originalPrice\":\"480.000đ\",\"badge\":\"-33%\",\"rating\":4.4}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Mỹ phẩm 3 cột", TabName = null, Order = 3, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#fdf2f8\",\"borderRadius\":14}",
                    DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":12,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#db2777\",\"items\":[{\"image\":\"https://picsum.photos/seed/bea1/400/400\",\"title\":\"Serum Vitamin C 20% Brightening\",\"price\":\"590.000đ\",\"originalPrice\":\"890.000đ\",\"badge\":\"-34%\",\"rating\":4.7},{\"image\":\"https://picsum.photos/seed/bea2/400/400\",\"title\":\"Kem dưỡng ẩm Hyaluronic 50ml\",\"price\":\"420.000đ\",\"originalPrice\":\"620.000đ\",\"badge\":\"Mới\",\"rating\":4.5},{\"image\":\"https://picsum.photos/seed/bea3/400/400\",\"title\":\"Tẩy trang dạng dầu 200ml\",\"price\":\"280.000đ\",\"originalPrice\":\"380.000đ\",\"badge\":\"-26%\",\"rating\":4.6}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Thực phẩm 3 cột", TabName = null, Order = 4, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#fff7ed\",\"borderRadius\":12}",
                    DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":10,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":false,\"accentColor\":\"#ea580c\",\"items\":[{\"image\":\"https://picsum.photos/seed/fd1/400/400\",\"title\":\"Hạt điều rang muối 500g\",\"price\":\"129.000đ\",\"badge\":\"Best Seller\",\"rating\":4.9},{\"image\":\"https://picsum.photos/seed/fd2/400/400\",\"title\":\"Cà phê Arabica nguyên hạt 500g\",\"price\":\"185.000đ\",\"badge\":\"Đặc sản\",\"rating\":4.7},{\"image\":\"https://picsum.photos/seed/fd3/400/400\",\"title\":\"Mật ong rừng nguyên chất 350ml\",\"price\":\"220.000đ\",\"badge\":\"Organic\",\"rating\":4.8}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Flash Sale 3 cột", TabName = null, Order = 5, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#fef2f2\",\"borderRadius\":12}",
                    DefaultContent = "{\"columns\":3,\"gap\":8,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#dc2626\",\"items\":[{\"image\":\"https://picsum.photos/seed/fs1/400/400\",\"title\":\"Tai nghe TWS chống ồn ANC\",\"price\":\"399.000đ\",\"originalPrice\":\"799.000đ\",\"badge\":\"-50%\",\"rating\":4.4},{\"image\":\"https://picsum.photos/seed/fs2/400/400\",\"title\":\"Loa Bluetooth Portable Mini\",\"price\":\"299.000đ\",\"originalPrice\":\"599.000đ\",\"badge\":\"-50%\",\"rating\":4.2},{\"image\":\"https://picsum.photos/seed/fs3/400/400\",\"title\":\"Đồng hồ thông minh Sport Pro\",\"price\":\"990.000đ\",\"originalPrice\":\"1.990.000đ\",\"badge\":\"-50%\",\"rating\":4.5}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Nội thất 2 cột", TabName = null, Order = 6, DefaultWidth = 600, DefaultHeight = 480,
                    StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12}",
                    DefaultContent = "{\"columns\":2,\"gap\":12,\"cardRadius\":10,\"showBadge\":true,\"showRating\":false,\"showOriginalPrice\":true,\"accentColor\":\"#0ea5e9\",\"items\":[{\"image\":\"https://picsum.photos/seed/fu1/500/500\",\"title\":\"Bàn làm việc gỗ tự nhiên 120cm\",\"price\":\"3.200.000đ\",\"originalPrice\":\"4.500.000đ\",\"badge\":\"Sale\"},{\"image\":\"https://picsum.photos/seed/fu2/500/500\",\"title\":\"Ghế văn phòng Ergonomic lưới\",\"price\":\"2.990.000đ\",\"originalPrice\":\"4.200.000đ\",\"badge\":\"-29%\"},{\"image\":\"https://picsum.photos/seed/fu3/500/500\",\"title\":\"Kệ sách treo tường 5 tầng\",\"price\":\"890.000đ\",\"originalPrice\":\"1.200.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/fu4/500/500\",\"title\":\"Đèn bàn LED cảm ứng dimmer\",\"price\":\"450.000đ\",\"originalPrice\":\"680.000đ\",\"badge\":\"-34%\"}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Cao cấp (nền tối)", TabName = null, Order = 7, DefaultWidth = 600, DefaultHeight = 360,
                    StylesJson = "{\"backgroundColor\":\"#0f172a\",\"borderRadius\":14}",
                    DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":10,\"showBadge\":false,\"showRating\":true,\"showOriginalPrice\":false,\"accentColor\":\"#f59e0b\",\"items\":[{\"image\":\"https://picsum.photos/seed/pr1/400/400\",\"title\":\"Vòng tay bạc 925 đính đá Swarovski\",\"price\":\"1.450.000đ\",\"rating\":4.9},{\"image\":\"https://picsum.photos/seed/pr2/400/400\",\"title\":\"Đồng hồ cơ sapphire Swiss Made\",\"price\":\"8.900.000đ\",\"rating\":4.8},{\"image\":\"https://picsum.photos/seed/pr3/400/400\",\"title\":\"Nhẫn vàng 14K đá tự nhiên\",\"price\":\"3.200.000đ\",\"rating\":4.7}]}"
                },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiSPDanhSach.Id, Name = "Văn phòng phẩm 4 cột", TabName = null, Order = 8, DefaultWidth = 700, DefaultHeight = 520,
                    StylesJson = "{\"backgroundColor\":\"#faf5ff\",\"borderRadius\":10}",
                    DefaultContent = "{\"columns\":4,\"gap\":8,\"cardRadius\":6,\"showBadge\":true,\"showRating\":false,\"showOriginalPrice\":true,\"accentColor\":\"#7c3aed\",\"items\":[{\"image\":\"https://picsum.photos/seed/m1/300/300\",\"title\":\"Bút máy cao cấp\",\"price\":\"199.000đ\",\"originalPrice\":\"290.000đ\",\"badge\":\"-31%\"},{\"image\":\"https://picsum.photos/seed/m2/300/300\",\"title\":\"Sổ da A5 ép nổi\",\"price\":\"159.000đ\",\"originalPrice\":\"230.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/m3/300/300\",\"title\":\"Bộ highlight 6 màu\",\"price\":\"89.000đ\",\"originalPrice\":\"130.000đ\",\"badge\":\"-31%\"},{\"image\":\"https://picsum.photos/seed/m4/300/300\",\"title\":\"Hộp đựng bút nhôm\",\"price\":\"129.000đ\",\"originalPrice\":\"190.000đ\",\"badge\":\"Sale\"},{\"image\":\"https://picsum.photos/seed/m5/300/300\",\"title\":\"Bộ tem dán sáng tạo\",\"price\":\"45.000đ\",\"originalPrice\":\"70.000đ\",\"badge\":\"-36%\"},{\"image\":\"https://picsum.photos/seed/m6/300/300\",\"title\":\"Clip giữ sổ kim loại\",\"price\":\"35.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/m7/300/300\",\"title\":\"Bộ viết vẽ watercolor\",\"price\":\"249.000đ\",\"originalPrice\":\"350.000đ\",\"badge\":\"-29%\"},{\"image\":\"https://picsum.photos/seed/m8/300/300\",\"title\":\"Notebook dotted 160 trang\",\"price\":\"185.000đ\",\"badge\":\"Hot\"}]}"
                }
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

            // Presets for Đường kẻ (divider/line) — full set matching lineData.ts
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen vừa", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt đen đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":4,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[8,4]\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét chấm đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,4]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Đường kép đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"double\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen rất đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":6,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền xám đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#94a3b8\",\"height\":4,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":1,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 7 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt đen mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":1,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[6,3]\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 8 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền xám mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#64748b\",\"height\":1,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 9 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen vừa đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":3,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 3, Order = 10 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":4,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 11 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét liền đen rất đậm 2", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":5,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 5, Order = 12 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét chấm xanh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#2563eb\",\"height\":3,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[3,4]\"}", DefaultWidth = 400, DefaultHeight = 3, Order = 13 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt xanh lá", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#16a34a\",\"height\":4,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[10,5]\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 14 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét đứt cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[6,3]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 15 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Nét chấm cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,3]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 16 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiDuongKe.Id, Name = "Đường kép cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"double\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 17 }
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

            // Presets for Form — full set matching formData.ts
            // ── Shared field arrays (inlined as JSON in DefaultContent) ──
            const string fContactFields = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"},{\"id\":\"message\",\"name\":\"message\",\"label\":\"Để lại lời nhắn\",\"placeholder\":\"Để lại lời nhắn cho chúng tôi\",\"type\":\"textarea\"}]";
            const string fContactShort = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true}]";
            const string fEmailOnly = "[{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Nhập địa chỉ email của bạn\",\"type\":\"email\",\"required\":true}]";
            const string fSurvey = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"},{\"id\":\"interest\",\"name\":\"interest\",\"label\":\"Lĩnh vực quan tâm\",\"placeholder\":\"Chọn lĩnh vực\",\"type\":\"select\",\"options\":[\"Sản phẩm A\",\"Sản phẩm B\",\"Tư vấn thêm\"]},{\"id\":\"message\",\"name\":\"message\",\"label\":\"Ghi chú thêm\",\"placeholder\":\"Bạn muốn chúng tôi hỗ trợ điều gì?\",\"type\":\"textarea\"}]";
            const string fNameEmail = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên đầy đủ\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email của bạn\",\"type\":\"email\",\"required\":true}]";
            const string fRegistration = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true}]";
            const string fRegCourse = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"},{\"id\":\"city\",\"name\":\"city\",\"label\":\"Thành phố\",\"placeholder\":\"Hà Nội, TP.HCM...\",\"type\":\"text\"}]";
            const string fWebinar = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email nhận link tham dự\",\"placeholder\":\"Email nhận link tham dự\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"}]";
            const string fMembership = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên đầy đủ\",\"placeholder\":\"Họ và tên đầy đủ\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Điện thoại\",\"placeholder\":\"Điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"dob\",\"name\":\"dob\",\"label\":\"Ngày sinh\",\"placeholder\":\"Ngày sinh\",\"type\":\"date\"}]";
            const string fLogin = "[{\"id\":\"accessCode\",\"name\":\"accessCode\",\"label\":\"Mã truy cập\",\"placeholder\":\"Mã truy cập\",\"type\":\"text\",\"required\":true}]";
            const string fLoginFull = "[{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email / Tên đăng nhập\",\"placeholder\":\"Email hoặc tên đăng nhập\",\"type\":\"email\",\"required\":true},{\"id\":\"password\",\"name\":\"password\",\"label\":\"Mật khẩu\",\"placeholder\":\"Mật khẩu\",\"type\":\"text\",\"required\":true}]";
            const string fOtp = "[{\"id\":\"otp\",\"name\":\"otp\",\"label\":\"Mã OTP\",\"placeholder\":\"Nhập mã OTP\",\"type\":\"text\",\"required\":true}]";
            const string fCheckout = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"}]";
            const string fCheckoutFull = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"},{\"id\":\"address\",\"name\":\"address\",\"label\":\"Địa chỉ giao hàng\",\"placeholder\":\"Số nhà, đường, phường/xã\",\"type\":\"textarea\"}]";

            static string FC(string formType, string tabName, string title, string buttonText, string fields, string inputStyle,
                int w, int h, string btnColor, string btnText, string bgColor, int radius = 8, int inputR = 4,
                string? titleColor = null, string? accentColor = null)
            {
                var tc = titleColor != null ? $",\"titleColor\":\"{titleColor}\"" : "";
                var ac = accentColor != null ? $",\"accentColor\":\"{accentColor}\"" : "";
                return $"{{\"formType\":\"{formType}\",\"title\":\"{title}\",\"buttonText\":\"{buttonText}\",\"fields\":{fields},\"inputStyle\":\"{inputStyle}\",\"buttonColor\":\"{btnColor}\",\"buttonTextColor\":\"{btnText}\",\"backgroundColor\":\"{bgColor}\",\"formBorderRadius\":{radius},\"inputRadius\":{inputR}{tc}{ac}}}";
            }

            db.ElementPresets.AddRange(
                // ── Form (contact) ──────────────────────────────────────────────
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form viền mỏng", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ","Đặt ngay",fContactFields,"outlined",400,360,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form nền xám", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ","Đặt ngay",fContactFields,"filled",400,360,"#334155","#ffffff","#f8fafc",12,6), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 2 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form gạch chân", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ","Đặt ngay",fContactFields,"underlined",400,360,"#0f172a","#ffffff","#ffffff",0,0), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 3 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form 2 cột", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ với chúng tôi","Liên hệ ngay",fContactFields,"underlined",500,340,"#0f172a","#ffffff","#ffffff",8,0), StylesJson = "{\"fontSize\":14}", DefaultWidth = 500, DefaultHeight = 340, Order = 4 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form xanh lá", TabName = "Form", DefaultContent = FC("contact","Form","Nhận liên hệ từ chúng tôi","Liên hệ chúng tôi",fContactFields,"filled",420,370,"#16a34a","#ffffff","#f0fdf4",12,6,"#16a34a","#16a34a"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 370, Order = 5 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form tím gradient", TabName = "Form", DefaultContent = FC("contact","Form","Đăng ký tư vấn","Đăng ký ngay",fContactShort,"outlined",380,220,"#7c3aed","#ffffff","#faf5ff",16,8,"#7c3aed","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 6 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form xanh dương", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ với chúng tôi","Gửi tin nhắn",fContactFields,"filled",420,370,"#2563eb","#ffffff","#eff6ff",12,6,"#2563eb","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 370, Order = 7 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form cam nổi bật", TabName = "Form", DefaultContent = FC("contact","Form","Nhận ưu đãi ngay","NHẬN NGAY",fContactShort,"outlined",380,220,"#ea580c","#ffffff","#fff7ed",8,4,"#ea580c","#ea580c"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 8 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form tối", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ","Gửi ngay",fContactShort,"filled",380,220,"#6366f1","#ffffff","#0f172a",12,6,"#f8fafc","#6366f1"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 9 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form tối giản", TabName = "Form", DefaultContent = FC("contact","Form","","Liên hệ ngay",fContactShort,"underlined",360,190,"#dc2626","#ffffff","#ffffff",0,0,"#dc2626","#dc2626"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 360, DefaultHeight = 190, Order = 10 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form newsletter", TabName = "Form", DefaultContent = FC("contact","Form","Nhận tin tức mới nhất","Đăng ký ngay",fEmailOnly,"outlined",460,165,"#0f172a","#ffffff","#f8fafc",12,24,"#0f172a","#0f172a"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 460, DefaultHeight = 165, Order = 11 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form khảo sát", TabName = "Form", DefaultContent = FC("contact","Form","Khảo sát nhanh","Gửi khảo sát",fSurvey,"filled",420,390,"#0284c7","#ffffff","#f0f9ff",12,6,"#0369a1","#0284c7"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 390, Order = 12 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form gradient xanh", TabName = "Form", DefaultContent = FC("contact","Form","Tư vấn miễn phí","Nhận tư vấn ngay",fNameEmail,"outlined",400,215,"#1d4ed8","#ffffff","#dbeafe",16,8,"#1e3a8a","#3b82f6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 215, Order = 13 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form thẻ nổi", TabName = "Form", DefaultContent = FC("contact","Form","Liên hệ với chúng tôi","Gửi tin nhắn",fContactFields,"outlined",440,375,"#6366f1","#ffffff","#ffffff",20,10,"#6366f1","#6366f1"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 375, Order = 14 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form hồng pastel", TabName = "Form", DefaultContent = FC("contact","Form","Đặt lịch tư vấn làm đẹp","Đặt lịch ngay",fContactShort,"filled",380,230,"#db2777","#ffffff","#fdf2f8",16,8,"#9d174d","#ec4899"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 230, Order = 15 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form viền trái", TabName = "Form", DefaultContent = FC("contact","Form","Nhận báo giá","Yêu cầu báo giá",fContactFields,"underlined",400,360,"#0f766e","#ffffff","#f0fdfa",8,0,"#134e4a","#14b8a6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 16 },
                // ── Form checkout ────────────────────────────────────────────────
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout nền", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Đặt hàng","Mua ngay",fCheckout,"filled",420,275,"#dc2626","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 275, Order = 17 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout viền", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Đặt hàng","Mua ngay",fCheckout,"outlined",420,275,"#16a34a","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 275, Order = 18 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đặt hàng tím", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Đặt hàng ngay với chúng tôi","Mua ngay",fCheckout,"outlined",420,290,"#7c3aed","#ffffff","#faf5ff",12,6,"#7c3aed","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 290, Order = 19 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đặt hàng kem", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Đặt hàng sản phẩm với giá tốt nhất","MUA NGAY",fCheckout,"underlined",420,295,"#92400e","#ffffff","#fffbeb",8,0,"#92400e","#d97706"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 295, Order = 20 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout đầy đủ", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Thông tin đặt hàng","Đặt hàng",fCheckoutFull,"outlined",440,380,"#0f172a","#ffffff","#f8fafc",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 380, Order = 21 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Flash sale đỏ", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","ĐẶT HÀNG FLASH SALE","ĐẶT HÀNG NGAY",fCheckout,"filled",420,290,"#b91c1c","#ffffff","#fff1f2",4,4,"#b91c1c","#b91c1c"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 290, Order = 22 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout tối", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Thông tin đặt hàng","Xác nhận đặt hàng",fCheckout,"filled",420,290,"#f59e0b","#000000","#1e293b",12,6,"#f8fafc","#f59e0b"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 290, Order = 23 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout xanh mint", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Hoàn tất đơn hàng","Đặt hàng ngay",fCheckout,"filled",420,280,"#059669","#ffffff","#ecfdf5",12,8,"#065f46","#10b981"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 280, Order = 24 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Checkout trắng sạch", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","Thông tin giao hàng","Xác nhận đặt hàng",fCheckoutFull,"outlined",440,380,"#111827","#ffffff","#ffffff",4,4,"#111827"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 380, Order = 25 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Flash Sale hồng đỏ", TabName = "Form checkout", DefaultContent = FC("checkout","Form checkout","⚡ ĐẶT HÀNG NGAY - SALE 50%","MUA NGAY TRƯỚC KHI HẾT",fCheckout,"filled",440,300,"#e11d48","#ffffff","#fff1f2",8,4,"#9f1239","#f43f5e"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 300, Order = 26 },
                // ── Form đăng ký ─────────────────────────────────────────────────
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký viền", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Đăng ký nhận tư vấn","Đăng ký ngay",fRegistration,"outlined",400,275,"#2563eb","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 275, Order = 27 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký khoá học", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Đăng ký học thử MIỄN PHÍ","Đăng ký học thử",fRegCourse,"filled",400,325,"#7c3aed","#ffffff","#faf5ff",12,6,"#5b21b6","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 325, Order = 28 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký sự kiện", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Đăng ký tham dự","Xác nhận đăng ký",fRegistration,"underlined",420,275,"#0891b2","#ffffff","#ecfeff",8,0,"#0e7490","#0891b2"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 275, Order = 29 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký tối", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Nhận ưu đãi đặc biệt","ĐĂNG KÝ NGAY",fRegistration,"filled",400,280,"#f97316","#ffffff","#0f172a",12,6,"#fbbf24","#f97316"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 280, Order = 30 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký webinar", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Đăng ký tham dự Webinar","Giữ chỗ ngay",fWebinar,"outlined",420,285,"#0891b2","#ffffff","#ecfeff",14,6,"#0e7490","#06b6d4"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 285, Order = 31 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Đăng ký thành viên", TabName = "Form Đăng ký", DefaultContent = FC("registration","Form Đăng ký","Đăng ký thành viên Premium","Trở thành thành viên",fMembership,"filled",420,330,"#7c3aed","#ffffff","#faf5ff",16,8,"#5b21b6","#8b5cf6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 330, Order = 32 },
                // ── Form Login ───────────────────────────────────────────────────
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login viền", TabName = "Form Login", DefaultContent = FC("login","Form Login","","Đăng nhập",fLogin,"outlined",440,64,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 64, Order = 33 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login nền", TabName = "Form Login", DefaultContent = FC("login","Form Login","","Đăng nhập",fLogin,"filled",440,64,"#334155","#ffffff","#f1f5f9",12,6), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 64, Order = 34 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login đầy đủ", TabName = "Form Login", DefaultContent = FC("login","Form Login","Đăng nhập","Đăng nhập",fLoginFull,"outlined",400,230,"#2563eb","#ffffff","#ffffff",12,6,"#1e40af","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 230, Order = 35 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login tím", TabName = "Form Login", DefaultContent = FC("login","Form Login","Chào mừng trở lại","Vào ngay",fLogin,"outlined",440,100,"#7c3aed","#ffffff","#faf5ff",16,8,"#5b21b6","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 100, Order = 36 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login tối", TabName = "Form Login", DefaultContent = FC("login","Form Login","Đăng nhập hệ thống","Đăng nhập",fLoginFull,"filled",420,250,"#6366f1","#ffffff","#0f172a",14,8,"#e2e8f0","#818cf8"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 250, Order = 37 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Login tối giản", TabName = "Form Login", DefaultContent = FC("login","Form Login","","Vào xem nội dung",fLogin,"underlined",420,64,"#0f172a","#ffffff","#ffffff",0,0), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 64, Order = 38 },
                // ── Form OTP ─────────────────────────────────────────────────────
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "OTP mặc định", TabName = "Form OTP", DefaultContent = FC("otp","Form OTP","Vui lòng xác nhận OTP","Xác nhận OTP",fOtp,"outlined",380,230,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 230, Order = 39 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "OTP nền", TabName = "Form OTP", DefaultContent = FC("otp","Form OTP","Vui lòng xác nhận OTP","Xác nhận OTP",fOtp,"filled",380,230,"#334155","#ffffff","#f8fafc",12,6), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 230, Order = 40 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "OTP xanh", TabName = "Form OTP", DefaultContent = FC("otp","Form OTP","Xác minh số điện thoại","Xác nhận",fOtp,"outlined",380,235,"#2563eb","#ffffff","#eff6ff",12,8,"#1d4ed8","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 235, Order = 41 }
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

            // Presets for Menu
            db.ElementPresets.AddRange(
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiMenu.Id, Name = "Menu ngang cơ bản", TabName = null,
                    DefaultContent = "{\"items\":[{\"label\":\"Trang chủ\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Giới thiệu\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Dịch vụ\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Liên hệ\",\"href\":\"#\",\"target\":\"_self\"}],\"activeIndex\":0,\"variant\":1,\"align\":\"left\",\"activeColor\":\"#f97316\",\"activeBgColor\":\"#fff7ed\",\"textColor\":\"#1e293b\",\"fontSize\":14,\"fontWeight\":600,\"fontFamily\":\"Inter\",\"textTransform\":\"none\",\"gap\":8,\"backgroundColor\":\"#ffffff\",\"borderRadius\":8}",
                    StylesJson = "{}", DefaultWidth = 520, DefaultHeight = 48, Order = 1 },
                new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiMenu.Id, Name = "Menu uppercase xanh", TabName = null,
                    DefaultContent = "{\"items\":[{\"label\":\"Trang chủ\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Về chúng tôi\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Sản phẩm\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Tin tức\",\"href\":\"#\",\"target\":\"_self\"},{\"label\":\"Liên hệ\",\"href\":\"#\",\"target\":\"_self\"}],\"activeIndex\":0,\"variant\":4,\"align\":\"center\",\"activeColor\":\"#2563eb\",\"activeBgColor\":\"#eff6ff\",\"textColor\":\"#1d4ed8\",\"fontSize\":13,\"fontWeight\":700,\"fontFamily\":\"Inter\",\"textTransform\":\"uppercase\",\"gap\":10,\"backgroundColor\":\"transparent\",\"borderRadius\":0}",
                    StylesJson = "{}", DefaultWidth = 600, DefaultHeight = 44, Order = 2 }
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
            // Cập nhật form/line presets nếu DB cũ còn dữ liệu ít
            var tiFormExisting = await db.ToolItems.FirstOrDefaultAsync(i => i.ElementType == "form");
            if (tiFormExisting != null)
            {
                var formPresetCount = await db.ElementPresets.CountAsync(p => p.ToolItemId == tiFormExisting.Id);
                if (formPresetCount < 30)
                {
                    db.ElementPresets.RemoveRange(await db.ElementPresets.Where(p => p.ToolItemId == tiFormExisting.Id).ToListAsync());
                    await db.SaveChangesAsync();

                    const string uf_CF = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"},{\"id\":\"message\",\"name\":\"message\",\"label\":\"Để lại lời nhắn\",\"placeholder\":\"Để lại lời nhắn cho chúng tôi\",\"type\":\"textarea\"}]";
                    const string uf_CS = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true}]";
                    const string uf_EO = "[{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Nhập địa chỉ email của bạn\",\"type\":\"email\",\"required\":true}]";
                    const string uf_SV = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"},{\"id\":\"interest\",\"name\":\"interest\",\"label\":\"Lĩnh vực quan tâm\",\"placeholder\":\"Chọn lĩnh vực\",\"type\":\"select\",\"options\":[\"Sản phẩm A\",\"Sản phẩm B\",\"Tư vấn thêm\"]},{\"id\":\"message\",\"name\":\"message\",\"label\":\"Ghi chú thêm\",\"placeholder\":\"Bạn muốn chúng tôi hỗ trợ điều gì?\",\"type\":\"textarea\"}]";
                    const string uf_NE = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên đầy đủ\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email của bạn\",\"type\":\"email\",\"required\":true}]";
                    const string uf_RG = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true}]";
                    const string uf_RC = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"},{\"id\":\"city\",\"name\":\"city\",\"label\":\"Thành phố\",\"placeholder\":\"Hà Nội, TP.HCM...\",\"type\":\"text\"}]";
                    const string uf_WB = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email nhận link tham dự\",\"placeholder\":\"Email nhận link tham dự\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\"}]";
                    const string uf_MB = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên đầy đủ\",\"placeholder\":\"Họ và tên đầy đủ\",\"type\":\"text\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Điện thoại\",\"placeholder\":\"Điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"dob\",\"name\":\"dob\",\"label\":\"Ngày sinh\",\"placeholder\":\"Ngày sinh\",\"type\":\"date\"}]";
                    const string uf_LG = "[{\"id\":\"accessCode\",\"name\":\"accessCode\",\"label\":\"Mã truy cập\",\"placeholder\":\"Mã truy cập\",\"type\":\"text\",\"required\":true}]";
                    const string uf_LF = "[{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email / Tên đăng nhập\",\"placeholder\":\"Email hoặc tên đăng nhập\",\"type\":\"email\",\"required\":true},{\"id\":\"password\",\"name\":\"password\",\"label\":\"Mật khẩu\",\"placeholder\":\"Mật khẩu\",\"type\":\"text\",\"required\":true}]";
                    const string uf_OT = "[{\"id\":\"otp\",\"name\":\"otp\",\"label\":\"Mã OTP\",\"placeholder\":\"Nhập mã OTP\",\"type\":\"text\",\"required\":true}]";
                    const string uf_CK = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"}]";
                    const string uf_CKF = "[{\"id\":\"name\",\"name\":\"name\",\"label\":\"Họ và tên\",\"placeholder\":\"Họ và tên\",\"type\":\"text\",\"required\":true},{\"id\":\"phone\",\"name\":\"phone\",\"label\":\"Số điện thoại\",\"placeholder\":\"Số điện thoại\",\"type\":\"phone\",\"required\":true},{\"id\":\"email\",\"name\":\"email\",\"label\":\"Email\",\"placeholder\":\"Email\",\"type\":\"email\"},{\"id\":\"address\",\"name\":\"address\",\"label\":\"Địa chỉ giao hàng\",\"placeholder\":\"Số nhà, đường, phường/xã\",\"type\":\"textarea\"}]";

                    static string UF(string ft, string tn, string ti, string bt, string flds, string style,
                        int w, int h, string bc, string btc, string bg, int r = 8, int ir = 4,
                        string? tc = null, string? ac = null)
                    {
                        var tcs = tc != null ? $",\"titleColor\":\"{tc}\"" : "";
                        var acs = ac != null ? $",\"accentColor\":\"{ac}\"" : "";
                        return $"{{\"formType\":\"{ft}\",\"title\":\"{ti}\",\"buttonText\":\"{bt}\",\"fields\":{flds},\"inputStyle\":\"{style}\",\"buttonColor\":\"{bc}\",\"buttonTextColor\":\"{btc}\",\"backgroundColor\":\"{bg}\",\"formBorderRadius\":{r},\"inputRadius\":{ir}{tcs}{acs}}}";
                    }

                    db.ElementPresets.AddRange(
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form viền mỏng", TabName = "Form", DefaultContent = UF("contact","Form","Liên hệ","Đặt ngay",uf_CF,"outlined",400,360,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 1 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form nền xám", TabName = "Form", DefaultContent = UF("contact","Form","Liên hệ","Đặt ngay",uf_CF,"filled",400,360,"#334155","#ffffff","#f8fafc",12,6), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 2 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form gạch chân", TabName = "Form", DefaultContent = UF("contact","Form","Liên hệ","Đặt ngay",uf_CF,"underlined",400,360,"#0f172a","#ffffff","#ffffff",0,0), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 3 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form tím gradient", TabName = "Form", DefaultContent = UF("contact","Form","Đăng ký tư vấn","Đăng ký ngay",uf_CS,"outlined",380,220,"#7c3aed","#ffffff","#faf5ff",16,8,"#7c3aed","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 4 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form xanh dương", TabName = "Form", DefaultContent = UF("contact","Form","Liên hệ với chúng tôi","Gửi tin nhắn",uf_CF,"filled",420,370,"#2563eb","#ffffff","#eff6ff",12,6,"#2563eb","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 370, Order = 5 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form cam nổi bật", TabName = "Form", DefaultContent = UF("contact","Form","Nhận ưu đãi ngay","NHẬN NGAY",uf_CS,"outlined",380,220,"#ea580c","#ffffff","#fff7ed",8,4,"#ea580c","#ea580c"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 6 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form tối", TabName = "Form", DefaultContent = UF("contact","Form","Liên hệ","Gửi ngay",uf_CS,"filled",380,220,"#6366f1","#ffffff","#0f172a",12,6,"#f8fafc","#6366f1"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 220, Order = 7 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form newsletter", TabName = "Form", DefaultContent = UF("contact","Form","Nhận tin tức mới nhất","Đăng ký ngay",uf_EO,"outlined",460,165,"#0f172a","#ffffff","#f8fafc",12,24,"#0f172a","#0f172a"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 460, DefaultHeight = 165, Order = 8 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form khảo sát", TabName = "Form", DefaultContent = UF("contact","Form","Khảo sát nhanh","Gửi khảo sát",uf_SV,"filled",420,390,"#0284c7","#ffffff","#f0f9ff",12,6,"#0369a1","#0284c7"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 390, Order = 9 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form gradient xanh", TabName = "Form", DefaultContent = UF("contact","Form","Tư vấn miễn phí","Nhận tư vấn ngay",uf_NE,"outlined",400,215,"#1d4ed8","#ffffff","#dbeafe",16,8,"#1e3a8a","#3b82f6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 215, Order = 10 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form hồng pastel", TabName = "Form", DefaultContent = UF("contact","Form","Đặt lịch tư vấn làm đẹp","Đặt lịch ngay",uf_CS,"filled",380,230,"#db2777","#ffffff","#fdf2f8",16,8,"#9d174d","#ec4899"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 230, Order = 11 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Form viền trái", TabName = "Form", DefaultContent = UF("contact","Form","Nhận báo giá","Yêu cầu báo giá",uf_CF,"underlined",400,360,"#0f766e","#ffffff","#f0fdfa",8,0,"#134e4a","#14b8a6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 360, Order = 12 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Checkout nền", TabName = "Form checkout", DefaultContent = UF("checkout","Form checkout","Đặt hàng","Mua ngay",uf_CK,"filled",420,275,"#dc2626","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 275, Order = 13 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Checkout viền", TabName = "Form checkout", DefaultContent = UF("checkout","Form checkout","Đặt hàng","Mua ngay",uf_CK,"outlined",420,275,"#16a34a","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 275, Order = 14 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Flash sale đỏ", TabName = "Form checkout", DefaultContent = UF("checkout","Form checkout","ĐẶT HÀNG FLASH SALE","ĐẶT HÀNG NGAY",uf_CK,"filled",420,290,"#b91c1c","#ffffff","#fff1f2",4,4,"#b91c1c","#b91c1c"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 290, Order = 15 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Checkout đầy đủ", TabName = "Form checkout", DefaultContent = UF("checkout","Form checkout","Thông tin đặt hàng","Đặt hàng",uf_CKF,"outlined",440,380,"#0f172a","#ffffff","#f8fafc",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 380, Order = 16 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Đăng ký viền", TabName = "Form Đăng ký", DefaultContent = UF("registration","Form Đăng ký","Đăng ký nhận tư vấn","Đăng ký ngay",uf_RG,"outlined",400,275,"#2563eb","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 275, Order = 17 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Đăng ký khoá học", TabName = "Form Đăng ký", DefaultContent = UF("registration","Form Đăng ký","Đăng ký học thử MIỄN PHÍ","Đăng ký học thử",uf_RC,"filled",400,325,"#7c3aed","#ffffff","#faf5ff",12,6,"#5b21b6","#7c3aed"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 325, Order = 18 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Đăng ký webinar", TabName = "Form Đăng ký", DefaultContent = UF("registration","Form Đăng ký","Đăng ký tham dự Webinar","Giữ chỗ ngay",uf_WB,"outlined",420,285,"#0891b2","#ffffff","#ecfeff",14,6,"#0e7490","#06b6d4"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 285, Order = 19 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Đăng ký thành viên", TabName = "Form Đăng ký", DefaultContent = UF("registration","Form Đăng ký","Đăng ký thành viên Premium","Trở thành thành viên",uf_MB,"filled",420,330,"#7c3aed","#ffffff","#faf5ff",16,8,"#5b21b6","#8b5cf6"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 330, Order = 20 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Login viền", TabName = "Form Login", DefaultContent = UF("login","Form Login","","Đăng nhập",uf_LG,"outlined",440,64,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 440, DefaultHeight = 64, Order = 21 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Login đầy đủ", TabName = "Form Login", DefaultContent = UF("login","Form Login","Đăng nhập","Đăng nhập",uf_LF,"outlined",400,230,"#2563eb","#ffffff","#ffffff",12,6,"#1e40af","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 230, Order = 22 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "Login tối", TabName = "Form Login", DefaultContent = UF("login","Form Login","Đăng nhập hệ thống","Đăng nhập",uf_LF,"filled",420,250,"#6366f1","#ffffff","#0f172a",14,8,"#e2e8f0","#818cf8"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 250, Order = 23 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "OTP mặc định", TabName = "Form OTP", DefaultContent = UF("otp","Form OTP","Vui lòng xác nhận OTP","Xác nhận OTP",uf_OT,"outlined",380,230,"#1e293b","#ffffff","#ffffff",8,4), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 230, Order = 24 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiFormExisting.Id, Name = "OTP xanh", TabName = "Form OTP", DefaultContent = UF("otp","Form OTP","Xác minh số điện thoại","Xác nhận",uf_OT,"outlined",380,235,"#2563eb","#ffffff","#eff6ff",12,8,"#1d4ed8","#2563eb"), StylesJson = "{\"fontSize\":14}", DefaultWidth = 380, DefaultHeight = 235, Order = 25 }
                    );
                    await db.SaveChangesAsync();
                }
            }

            // Cập nhật line presets nếu DB cũ có dữ liệu ít
            var phanTuCatId = await db.ToolCategories.Where(c => c.Name == "Phần tử").Select(c => c.Id).FirstOrDefaultAsync();
            var tiLineExisting = await db.ToolItems.FirstOrDefaultAsync(i => i.ElementType == "divider" && i.Name == "Đường kẻ" && i.CategoryId == phanTuCatId);
            if (tiLineExisting != null)
            {
                var lineCount = await db.ElementPresets.CountAsync(p => p.ToolItemId == tiLineExisting.Id);
                if (lineCount < 10)
                {
                    db.ElementPresets.RemoveRange(await db.ElementPresets.Where(p => p.ToolItemId == tiLineExisting.Id).ToListAsync());
                    db.ElementPresets.AddRange(
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen vừa", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 1 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét đứt đen đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":4,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[8,4]\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 2 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét chấm đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,4]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 3 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Đường kép đen", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":2,\"lineStyle\":\"double\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 4 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen rất đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":6,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 5 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền xám đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#94a3b8\",\"height\":4,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 6 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":1,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 7 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét đứt đen mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":1,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[6,3]\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 8 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền xám mảnh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#64748b\",\"height\":1,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 1, Order = 9 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen vừa đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":3,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 3, Order = 10 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen đậm", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":4,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 11 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét liền đen rất đậm 2", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#000000\",\"height\":5,\"lineStyle\":\"solid\"}", DefaultWidth = 400, DefaultHeight = 5, Order = 12 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét chấm xanh", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#2563eb\",\"height\":3,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[3,4]\"}", DefaultWidth = 400, DefaultHeight = 3, Order = 13 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét đứt xanh lá", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#16a34a\",\"height\":4,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[10,5]\"}", DefaultWidth = 400, DefaultHeight = 4, Order = 14 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét đứt cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"dashed\",\"strokeDashArray\":\"[6,3]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 15 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Nét chấm cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"dotted\",\"strokeDashArray\":\"[2,3]\"}", DefaultWidth = 400, DefaultHeight = 2, Order = 16 },
                        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = tiLineExisting.Id, Name = "Đường kép cam", TabName = "Đường kẻ", DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#ea580c\",\"height\":2,\"lineStyle\":\"double\"}", DefaultWidth = 400, DefaultHeight = 6, Order = 17 }
                    );
                    await db.SaveChangesAsync();
                }
            }

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
                new LadiPage.Domain.Entities.Plan { Name = "Miễn phí", Code = "free", Price = 0, BillingCycle = "thang", MaxPages = 9999, MaxMembers = 1, StorageGb = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Domain.Entities.Plan { Name = "Pro", Code = "pro", Price = 299000, BillingCycle = "thang", MaxPages = 9999, MaxMembers = 5, MaxPageViews = 100000, StorageGb = 10, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Domain.Entities.Plan { Name = "Enterprise", Code = "enterprise", Price = 999000, BillingCycle = "thang", MaxPages = 9999, MaxMembers = 50, MaxPageViews = 1000000, StorageGb = 100, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }
        else
        {
            // Đảm bảo tất cả plan có MaxPages đủ lớn (không block tạo trang trong dev)
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE [GoiDichVu] SET [SoTrangToiDa] = 9999 WHERE [SoTrangToiDa] < 9999");
        }

        // Cập nhật SubTabsJson cho carousel và frame nếu cũ/sai
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE [CongCuMuc] SET [CoTabCon] = 1, [TabConJson] = '[\"Product\",\"Testimonial\",\"Media\",\"Hero\",\"Cards\",\"Logos\",\"Stats\"]' WHERE [LoaiPhanTu] = 'carousel'");
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE [CongCuMuc] SET [CoTabCon] = 1, [TabConJson] = '[\"Quote\",\"Feature\",\"Profile\",\"S\\u1ed1 li\\u1ec7u\",\"Tr\\u1ed1ng\"]' WHERE [LoaiPhanTu] = 'frame'");

        // Thêm carousel ToolItem nếu chưa có (cho DB đã tồn tại từ trước)
        if (!await db.ToolItems.AnyAsync(t => t.ElementType == "carousel"))
        {
            var phanTuCatForCarousel = await db.ToolCategories.FirstOrDefaultAsync(c => c.Name == "Phần tử");
            if (phanTuCatForCarousel != null)
            {
                var tiCarouselNew = new LadiPage.Domain.Entities.ToolItem {
                    CategoryId = phanTuCatForCarousel.Id, Name = "Carousel", Icon = "gallery-horizontal",
                    ElementType = "carousel", Order = 14, HasSubTabs = true,
                    SubTabsJson = "[\"Product\",\"Testimonial\",\"Media\",\"Hero\",\"Cards\",\"Logos\",\"Stats\"]"
                };
                db.ToolItems.Add(tiCarouselNew);
                await db.SaveChangesAsync();
                // Update MaHtml order to 15 if currently 14
                await db.Database.ExecuteSqlRawAsync(
                    "UPDATE [CongCuMuc] SET [ThuTu] = 15 WHERE [LoaiPhanTu] = 'html-code' AND [ThuTu] = 14");
            }
        }

        // Migrate antigravity → menu trong ToolItems và xóa preset cũ (cho DB đã seed cũ)
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE [CongCuMuc] SET [TenMuc] = N'Menu', [BieuTuong] = 'menu', [LoaiPhanTu] = 'menu' WHERE [LoaiPhanTu] = 'antigravity'");

        // Xóa preset "Antigravity UI" cũ, seed lại 9 preset menu nếu chưa có đủ
        var menuToolItem = await db.ToolItems.FirstOrDefaultAsync(t => t.ElementType == "menu");
        if (menuToolItem != null)
        {
            var existingMenuPresets = await db.ElementPresets.Where(p => p.ToolItemId == menuToolItem.Id).ToListAsync();
            // Xóa preset cũ còn tên "Antigravity"
            var oldPresets = existingMenuPresets.Where(p => p.Name.Contains("Antigravity") || p.Name.Contains("antigravity")).ToList();
            if (oldPresets.Any()) { db.ElementPresets.RemoveRange(oldPresets); await db.SaveChangesAsync(); existingMenuPresets = existingMenuPresets.Except(oldPresets).ToList(); }

            if (existingMenuPresets.Count < 9)
            {
                static string MC(string[] labels, int variant, string align, string activeColor, string activeBg, string textColor, int fontSize, int fontWeight, string tt, int gap, string bg, int br) =>
                    System.Text.Json.JsonSerializer.Serialize(new {
                        items = labels.Select((l, i) => new { label = l, href = "#", target = "_self" }).ToArray(),
                        activeIndex = 0, variant, align, activeColor, activeBgColor = activeBg, textColor,
                        fontSize, fontWeight, fontFamily = "Inter", textTransform = tt, gap, backgroundColor = bg, borderRadius = br });

                var menuPresets = new List<LadiPage.Domain.Entities.ElementPreset>
                {
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 1 — Nền active", Order=1, DefaultWidth=520, DefaultHeight=48, StylesJson="{}",
                        DefaultContent=MC(["Trang chủ","Công ty","Dịch vụ","Tin tức","Liên hệ"],1,"left","#f97316","#fff7ed","#1e293b",14,600,"none",8,"#ffffff",8) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 2 — Phẳng đơn giản", Order=2, DefaultWidth=520, DefaultHeight=44, StylesJson="{}",
                        DefaultContent=MC(["Trang chủ","Công ty","Dịch vụ","Tin tức","Liên hệ"],2,"left","#1e293b","transparent","#1e293b",14,500,"none",6,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 3 — Màu sắc", Order=3, DefaultWidth=520, DefaultHeight=44, StylesJson="{}",
                        DefaultContent=MC(["Trang chủ","Giới thiệu","Dịch vụ","Tin tức","Liên hệ"],3,"left","#ef4444","transparent","#ef4444",14,600,"none",6,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 4 — Gạch chân uppercase xanh", Order=4, DefaultWidth=560, DefaultHeight=48, StylesJson="{}",
                        DefaultContent=MC(["TRANG CHỦ","GIỚI THIỆU","DỊCH VỤ","TIN TỨC","LIÊN HỆ"],4,"center","#2563eb","#eff6ff","#1d4ed8",13,700,"uppercase",10,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 5 — Bold uppercase đen", Order=5, DefaultWidth=560, DefaultHeight=44, StylesJson="{}",
                        DefaultContent=MC(["TRANG CHỦ","GIỚI THIỆU","SẢN PHẨM","TIN TỨC","LIÊN HỆ"],5,"left","#1e293b","transparent","#1e293b",13,800,"uppercase",8,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 6 — Chữ lớn màu xanh lá", Order=6, DefaultWidth=480, DefaultHeight=52, StylesJson="{}",
                        DefaultContent=MC(["Giới thiệu","Khóa học","Tin tức","Liên hệ"],6,"center","#16a34a","transparent","#16a34a",17,700,"none",12,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 7 — Nhỏ xám", Order=7, DefaultWidth=480, DefaultHeight=40, StylesJson="{}",
                        DefaultContent=MC(["Giới thiệu","Dịch vụ","Sản phẩm","Tin tức","Liên hệ"],7,"left","#64748b","transparent","#94a3b8",12,400,"none",4,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 8 — Uppercase đỏ cam", Order=8, DefaultWidth=520, DefaultHeight=44, StylesJson="{}",
                        DefaultContent=MC(["VỀ CHÚNG TÔI","DỊCH VỤ","TIN TỨC","LIÊN HỆ"],8,"left","#ef4444","transparent","#ef4444",13,700,"uppercase",8,"transparent",0) },
                    new() { ToolItemId=menuToolItem.Id, Name="Kiểu 9 — Tối giản teal", Order=9, DefaultWidth=480, DefaultHeight=40, StylesJson="{}",
                        DefaultContent=MC(["Sản phẩm","Tin tức","Liên hệ"],9,"left","#0d9488","transparent","#475569",13,500,"none",6,"transparent",0) },
                };

                // Chỉ thêm những preset chưa có
                var existingOrders = existingMenuPresets.Select(p => p.Order).ToHashSet();
                foreach (var p in menuPresets.Where(p => !existingOrders.Contains(p.Order)))
                    db.ElementPresets.Add(p);
                await db.SaveChangesAsync();
            }
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

        // Cập nhật presets sản phẩm mẫu nếu chưa có đủ (< 6 presets)
        await SeedOrUpdateProductDetailPresetsAsync(db);

        // Cập nhật presets collection-list (danh sách sản phẩm)
        await SeedOrUpdateCollectionListPresetsAsync(db);

        // Seed presets cho carousel, blog-list, blog-detail, cart
        await SeedOtherElementPresetsAsync(db);

        // Seed Form Presets (từ formData.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedFormPresetsAsync(db);

        // Seed Popup Templates (từ popupTemplateCatalog.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedPopupTemplatesAsync(db);

        // Seed Vietnam Address (từ vnAddressData.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedVnAddressAsync(db);

        // Seed Login Feature Slides (từ loginFeatureSlides.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedLoginFeatureSlidesAsync(db);

        // Seed Editor Icons (từ iconData.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedEditorIconsAsync(db);

        // Seed Sample Videos (từ VideoPickerPanel.tsx)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedSampleVideosAsync(db);

        // Seed Line Presets (từ lineData.ts)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedLinePresetsAsync(db);

        // Seed Stock Images (từ ImagePickerPanel.tsx)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedStockImagesAsync(db);

        // Seed Page Templates (từ thư mục pages mẫu/)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedPageTemplatesAsync(db);

        // Seed Editor Templates (JSON thuần — có thể chỉnh sửa từng phần tử)
        await LadiPage.Infrastructure.Data.DbSeeder.SeedEditorTemplatesAsync(db);
    }
}

static async System.Threading.Tasks.Task SeedOrUpdateProductDetailPresetsAsync(LadiPage.Infrastructure.Data.AppDbContext db)
{
    // Xử lý TẤT CẢ ToolItems có elementType = "product-detail"
    var pdItems = await db.ToolItems.Where(x => x.ElementType == "product-detail").ToListAsync();
    if (!pdItems.Any()) return;

    foreach (var tiSP in pdItems)
    {
        // Xác định tabName dựa trên HasSubTabs của ToolItem
        string? expectedTabName = null;
        if (tiSP.HasSubTabs && !string.IsNullOrEmpty(tiSP.SubTabsJson))
        {
            try
            {
                var tabs = System.Text.Json.JsonSerializer.Deserialize<string[]>(tiSP.SubTabsJson);
                expectedTabName = tabs?.FirstOrDefault();
            }
            catch { }
        }

        var existingPresets = await db.ElementPresets.Where(x => x.ToolItemId == tiSP.Id).ToListAsync();

        if (existingPresets.Count >= 6)
        {
            // Fix TabName, layout key, hoặc height lỗi thời → force reseed
            bool needsTabFix = existingPresets.Any(p => p.TabName != expectedTabName);
            bool needsContentFix = existingPresets.Any(p => !(p.DefaultContent ?? "").Contains("\"layout\""));
            // "Thời trang nam" nên là 600, "Ghế văn phòng" nên là 600 — reseed nếu còn 620
            bool needsHeightFix = existingPresets.Any(p =>
                (p.Name == "Thời trang nam" && p.DefaultHeight > 600) ||
                (p.Name == "Nội thất - Ghế văn phòng" && p.DefaultHeight > 600));
            if (needsTabFix || needsContentFix || needsHeightFix)
            {
                db.ElementPresets.RemoveRange(existingPresets);
                await db.SaveChangesAsync();
                db.ElementPresets.AddRange(BuildProductDetailPresets(tiSP.Id, expectedTabName));
                await db.SaveChangesAsync();
            }
            continue;
        }

        // Xóa preset cũ và thêm mới
        db.ElementPresets.RemoveRange(existingPresets);
        await db.SaveChangesAsync();

        db.ElementPresets.AddRange(BuildProductDetailPresets(tiSP.Id, expectedTabName));
        await db.SaveChangesAsync();
    }
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildProductDetailPresets(long toolItemId, string? tabName)
{
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Thời trang nam", TabName = tabName, Order = 1,
            DefaultWidth = 380, DefaultHeight = 600,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"boxShadow\":\"0 4px 24px rgba(0,0,0,0.08)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/fashion1/600/600\",\"https://picsum.photos/seed/fashion2/600/600\",\"https://picsum.photos/seed/fashion3/600/600\"],\"title\":\"Áo thun nam Premium Cotton\",\"price\":\"1.290.000đ\",\"salePrice\":\"890.000đ\",\"description\":\"Chất liệu cotton 100% Pima cao cấp, thoáng mát, form dáng chuẩn Slim Fit. Co giãn 4 chiều, không nhăn nhúm sau khi giặt.\",\"badge\":\"Giảm 31%\",\"rating\":4.5,\"reviewCount\":128,\"sku\":\"AT-001-PIMA\",\"stockStatus\":\"instock\",\"stockText\":\"Còn 42 sản phẩm\",\"category\":\"Thời trang nam\",\"features\":[\"Cotton 100% Pima cao cấp\",\"Co giãn 4 chiều thoải mái\",\"Không phai màu sau 100 lần giặt\",\"Giao hàng toàn quốc 2-3 ngày\"],\"variants\":[{\"label\":\"Size\",\"type\":\"size\",\"options\":[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]},{\"label\":\"Màu sắc\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Navy\",\"Xám\"]}],\"quantity\":1,\"showQuantity\":true,\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":false,\"accentColor\":\"#6366f1\",\"cardRadius\":12,\"imageRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Điện tử - Tai nghe", TabName = tabName, Order = 2,
            DefaultWidth = 380, DefaultHeight = 620,  // 5 features + qty → cần nhiều space hơn
            StylesJson = "{\"backgroundColor\":\"#0f172a\",\"borderRadius\":16,\"boxShadow\":\"0 8px 32px rgba(0,0,0,0.3)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/headphone1/600/600\",\"https://picsum.photos/seed/headphone2/600/600\",\"https://picsum.photos/seed/headphone3/600/600\"],\"title\":\"Tai nghe Bluetooth Premium ANC\",\"price\":\"4.990.000đ\",\"salePrice\":\"2.990.000đ\",\"description\":\"Chống ồn chủ động ANC thế hệ mới, âm thanh Hi-Res 40mm, pin 30h liên tục. Kết nối đa điểm Bluetooth 5.3 cùng lúc 2 thiết bị.\",\"badge\":\"HOT -40%\",\"rating\":4.8,\"reviewCount\":256,\"sku\":\"HP-ANC-PRO\",\"stockStatus\":\"limited\",\"stockText\":\"Chỉ còn 8 sản phẩm\",\"category\":\"Điện tử\",\"features\":[\"ANC chống ồn thế hệ mới\",\"Pin 30 giờ liên tục\",\"Bluetooth 5.3 đa điểm\",\"Chất âm Hi-Res Audio\",\"Sạc nhanh 15 phút = 3h dùng\"],\"variants\":[{\"label\":\"Màu\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Xanh\"]},{\"label\":\"Gói\",\"type\":\"text\",\"options\":[\"Cơ bản\",\"Kèm túi\",\"Cao cấp\"]}],\"quantity\":1,\"showQuantity\":true,\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":false,\"accentColor\":\"#6366f1\",\"cardRadius\":16,\"imageRadius\":0}"
        },
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Mỹ phẩm - Serum", TabName = tabName, Order = 3,
            DefaultWidth = 380, DefaultHeight = 630,  // 5 features + desc → cần nhiều space nhất
            StylesJson = "{\"backgroundColor\":\"#fff9f5\",\"borderRadius\":16,\"boxShadow\":\"0 4px 20px rgba(251,146,60,0.15)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/serum1/600/600\",\"https://picsum.photos/seed/serum2/600/600\",\"https://picsum.photos/seed/serum3/600/600\"],\"title\":\"Serum Vitamin C 20% Sáng Da\",\"price\":\"890.000đ\",\"salePrice\":\"590.000đ\",\"description\":\"Công thức nồng độ cao Vitamin C 20% kết hợp Niacinamide và Hyaluronic Acid. Làm sáng da, mờ thâm nám, cấp ẩm 72 giờ. Phù hợp mọi loại da.\",\"badge\":\"Best Seller\",\"rating\":4.7,\"reviewCount\":342,\"sku\":\"VTC-20-30ML\",\"stockStatus\":\"instock\",\"stockText\":\"\",\"category\":\"Chăm sóc da\",\"features\":[\"Vitamin C 20% nồng độ cao\",\"Kết hợp Niacinamide + HA\",\"Sáng da sau 2 tuần\",\"Không cồn, không paraben\",\"Kiểm nghiệm da liễu\"],\"variants\":[{\"label\":\"Dung tích\",\"type\":\"text\",\"options\":[\"30ml\",\"50ml\",\"100ml\"]},{\"label\":\"Loại da\",\"type\":\"text\",\"options\":[\"Da thường\",\"Da dầu\",\"Da khô\"]}],\"quantity\":1,\"showQuantity\":false,\"buyButtonText\":\"Mua ngay\",\"addCartText\":\"Thêm vào giỏ\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":true,\"accentColor\":\"#f97316\",\"cardRadius\":16,\"imageRadius\":12}"
        },
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Thực phẩm - Hộp quà", TabName = tabName, Order = 4,
            DefaultWidth = 380, DefaultHeight = 580,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"boxShadow\":\"0 4px 16px rgba(0,0,0,0.06)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/food1/600/600\",\"https://picsum.photos/seed/food2/600/600\",\"https://picsum.photos/seed/food3/600/600\"],\"title\":\"Hộp Quà Trà Thảo Mộc Premium\",\"price\":\"850.000đ\",\"salePrice\":\"650.000đ\",\"description\":\"Bộ quà tặng sang trọng gồm 6 loại trà thảo mộc cao cấp nhập khẩu.\",\"badge\":\"Quà tặng\",\"rating\":4.9,\"reviewCount\":87,\"sku\":\"TRA-GIF-06\",\"stockStatus\":\"instock\",\"stockText\":\"Còn 25 hộp\",\"category\":\"Thực phẩm & Quà tặng\",\"features\":[\"6 loại trà thảo mộc cao cấp\",\"Hộp thiết kế sang trọng\",\"Kèm thiệp chúc mừng\",\"Giao hàng miễn phí toàn quốc\"],\"variants\":[{\"label\":\"Kích thước\",\"type\":\"text\",\"options\":[\"6 hộp\",\"12 hộp\",\"24 hộp\"]},{\"label\":\"Có thiệp\",\"type\":\"text\",\"options\":[\"Có\",\"Không\"]}],\"quantity\":1,\"showQuantity\":true,\"buyButtonText\":\"Đặt hàng ngay\",\"addCartText\":\"Thêm giỏ hàng\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":false,\"accentColor\":\"#16a34a\",\"cardRadius\":12,\"imageRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Sách - Khóa học", TabName = tabName, Order = 5,
            DefaultWidth = 380, DefaultHeight = 560,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12,\"boxShadow\":\"0 2px 12px rgba(0,0,0,0.06)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/book1/600/600\",\"https://picsum.photos/seed/book2/600/600\"],\"title\":\"Khóa Học Marketing Online Toàn Diện 2025\",\"price\":\"2.990.000đ\",\"salePrice\":\"990.000đ\",\"description\":\"Khóa học 48 giờ video HD từ chuyên gia Marketing 10+ năm kinh nghiệm. Học mọi lúc mọi nơi, trọn đời.\",\"badge\":\"Giảm 67%\",\"rating\":4.6,\"reviewCount\":1204,\"sku\":\"MKTG-2025-PRO\",\"stockStatus\":\"instock\",\"stockText\":\"Đăng ký không giới hạn\",\"category\":\"Giáo dục & Đào tạo\",\"features\":[\"48 giờ video chất lượng HD\",\"Học mọi lúc - Truy cập trọn đời\",\"Chứng chỉ hoàn thành\",\"Hỗ trợ 1-1 với giảng viên\"],\"variants\":[{\"label\":\"Gói học\",\"type\":\"text\",\"options\":[\"Cơ bản\",\"Nâng cao\",\"Mentor\"]}],\"quantity\":1,\"showQuantity\":false,\"buyButtonText\":\"Đăng ký ngay\",\"addCartText\":\"Tìm hiểu thêm\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":true,\"accentColor\":\"#2563eb\",\"cardRadius\":12,\"imageRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset
        {
            ToolItemId = toolItemId, Name = "Nội thất - Ghế văn phòng", TabName = tabName, Order = 6,
            DefaultWidth = 380, DefaultHeight = 600,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"boxShadow\":\"0 4px 20px rgba(0,0,0,0.08)\"}",
            DefaultContent = "{\"layout\":\"vertical\",\"images\":[\"https://picsum.photos/seed/chair1/600/600\",\"https://picsum.photos/seed/chair2/600/600\",\"https://picsum.photos/seed/chair3/600/600\"],\"title\":\"Ghế Công Thái Học Ergonomic Pro\",\"price\":\"8.500.000đ\",\"salePrice\":\"5.990.000đ\",\"description\":\"Ghế văn phòng công thái học cao cấp, điều chỉnh độ cao, tựa lưng, tựa tay 4D. Lưới thoáng khí, phù hợp ngồi 8+ giờ.\",\"badge\":\"Trả góp 0%\",\"rating\":4.8,\"reviewCount\":63,\"sku\":\"GHE-ERGO-PRO\",\"stockStatus\":\"instock\",\"stockText\":\"Giao hàng 3-5 ngày\",\"category\":\"Nội thất văn phòng\",\"features\":[\"Điều chỉnh độ cao điện khí\",\"Tựa tay 4D linh hoạt\",\"Lưới thoáng khí Breathe-Mesh\",\"Bảo hành 5 năm chính hãng\"],\"variants\":[{\"label\":\"Màu\",\"type\":\"color\",\"options\":[\"Đen\",\"Trắng\",\"Xanh\"]},{\"label\":\"Khung\",\"type\":\"text\",\"options\":[\"Nhôm\",\"Nhựa\"]}],\"quantity\":1,\"showQuantity\":true,\"buyButtonText\":\"Đặt mua ngay\",\"addCartText\":\"Xem chi tiết\",\"showRating\":true,\"showFeatures\":true,\"showVariants\":true,\"showActions\":true,\"showBadge\":true,\"showDescription\":false,\"accentColor\":\"#0ea5e9\",\"cardRadius\":8,\"imageRadius\":6}"
        }
    };
}

static async System.Threading.Tasks.Task SeedOrUpdateCollectionListPresetsAsync(LadiPage.Infrastructure.Data.AppDbContext db)
{
    var clItems = await db.ToolItems.Where(x => x.ElementType == "collection-list").ToListAsync();
    if (!clItems.Any()) return;

    foreach (var tiCL in clItems)
    {
        // Xác định TabName đúng từ SubTabsJson của ToolItem
        string? correctTabName = null;
        if (tiCL.HasSubTabs && !string.IsNullOrEmpty(tiCL.SubTabsJson))
        {
            try {
                var tabs = System.Text.Json.JsonSerializer.Deserialize<string[]>(tiCL.SubTabsJson);
                correctTabName = tabs?.Length > 0 ? tabs[0] : null;
            } catch { }
        }

        var existingPresets = await db.ElementPresets.Where(x => x.ToolItemId == tiCL.Id).ToListAsync();

        // Cần reseed nếu: chưa đủ presets, thiếu accentColor, hoặc TabName sai
        bool needsReseed = existingPresets.Count < 6
            || existingPresets.Any(p => !(p.DefaultContent ?? "").Contains("\"accentColor\""))
            || existingPresets.Any(p => (p.TabName ?? "") != (correctTabName ?? ""));

        if (!needsReseed) continue;

        db.ElementPresets.RemoveRange(existingPresets);
        await db.SaveChangesAsync();
        db.ElementPresets.AddRange(BuildCollectionListPresets(tiCL.Id, correctTabName));
        await db.SaveChangesAsync();
    }
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildCollectionListPresets(long toolItemId, string? tabName = null)
{
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Thời trang 3 cột", TabName = tabName, Order = 1, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#fff7f0\",\"borderRadius\":12}",
            DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#e11d48\",\"items\":[{\"image\":\"https://picsum.photos/seed/fa1/400/400\",\"title\":\"Áo Polo Basic Cotton Premium\",\"price\":\"299.000đ\",\"originalPrice\":\"450.000đ\",\"badge\":\"-34%\",\"rating\":4.5},{\"image\":\"https://picsum.photos/seed/fa2/400/400\",\"title\":\"Quần Jeans Slim Fit Cao Cấp\",\"price\":\"499.000đ\",\"originalPrice\":\"699.000đ\",\"badge\":\"HOT\",\"rating\":4.3},{\"image\":\"https://picsum.photos/seed/fa3/400/400\",\"title\":\"Giày Sneaker Trắng Classic\",\"price\":\"890.000đ\",\"originalPrice\":\"1.200.000đ\",\"badge\":\"-26%\",\"rating\":4.7}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Điện tử 3 cột", TabName = tabName, Order = 2, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#eff6ff\",\"borderRadius\":12}",
            DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#2563eb\",\"items\":[{\"image\":\"https://picsum.photos/seed/te1/400/400\",\"title\":\"Tai nghe Bluetooth ANC Pro\",\"price\":\"1.990.000đ\",\"originalPrice\":\"2.990.000đ\",\"badge\":\"-33%\",\"rating\":4.8},{\"image\":\"https://picsum.photos/seed/te2/400/400\",\"title\":\"Sạc nhanh 65W GaN Compact\",\"price\":\"450.000đ\",\"originalPrice\":\"650.000đ\",\"badge\":\"Mới\",\"rating\":4.6},{\"image\":\"https://picsum.photos/seed/te3/400/400\",\"title\":\"Chuột không dây Ergonomic\",\"price\":\"320.000đ\",\"originalPrice\":\"480.000đ\",\"badge\":\"-33%\",\"rating\":4.4}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Mỹ phẩm 3 cột", TabName = tabName, Order = 3, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#fdf2f8\",\"borderRadius\":14}",
            DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":12,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#db2777\",\"items\":[{\"image\":\"https://picsum.photos/seed/bea1/400/400\",\"title\":\"Serum Vitamin C 20% Brightening\",\"price\":\"590.000đ\",\"originalPrice\":\"890.000đ\",\"badge\":\"-34%\",\"rating\":4.7},{\"image\":\"https://picsum.photos/seed/bea2/400/400\",\"title\":\"Kem dưỡng ẩm Hyaluronic 50ml\",\"price\":\"420.000đ\",\"originalPrice\":\"620.000đ\",\"badge\":\"Mới\",\"rating\":4.5},{\"image\":\"https://picsum.photos/seed/bea3/400/400\",\"title\":\"Tẩy trang dạng dầu 200ml\",\"price\":\"280.000đ\",\"originalPrice\":\"380.000đ\",\"badge\":\"-26%\",\"rating\":4.6}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Thực phẩm 3 cột", TabName = tabName, Order = 4, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#fff7ed\",\"borderRadius\":12}",
            DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":10,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":false,\"accentColor\":\"#ea580c\",\"items\":[{\"image\":\"https://picsum.photos/seed/fd1/400/400\",\"title\":\"Hạt điều rang muối 500g\",\"price\":\"129.000đ\",\"badge\":\"Best Seller\",\"rating\":4.9},{\"image\":\"https://picsum.photos/seed/fd2/400/400\",\"title\":\"Cà phê Arabica nguyên hạt 500g\",\"price\":\"185.000đ\",\"badge\":\"Đặc sản\",\"rating\":4.7},{\"image\":\"https://picsum.photos/seed/fd3/400/400\",\"title\":\"Mật ong rừng nguyên chất 350ml\",\"price\":\"220.000đ\",\"badge\":\"Organic\",\"rating\":4.8}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Flash Sale 3 cột", TabName = tabName, Order = 5, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#fef2f2\",\"borderRadius\":12}",
            DefaultContent = "{\"columns\":3,\"gap\":8,\"cardRadius\":8,\"showBadge\":true,\"showRating\":true,\"showOriginalPrice\":true,\"accentColor\":\"#dc2626\",\"items\":[{\"image\":\"https://picsum.photos/seed/fs1/400/400\",\"title\":\"Tai nghe TWS chống ồn ANC\",\"price\":\"399.000đ\",\"originalPrice\":\"799.000đ\",\"badge\":\"-50%\",\"rating\":4.4},{\"image\":\"https://picsum.photos/seed/fs2/400/400\",\"title\":\"Loa Bluetooth Portable Mini\",\"price\":\"299.000đ\",\"originalPrice\":\"599.000đ\",\"badge\":\"-50%\",\"rating\":4.2},{\"image\":\"https://picsum.photos/seed/fs3/400/400\",\"title\":\"Đồng hồ thông minh Sport Pro\",\"price\":\"990.000đ\",\"originalPrice\":\"1.990.000đ\",\"badge\":\"-50%\",\"rating\":4.5}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Nội thất 2 cột", TabName = tabName, Order = 6, DefaultWidth = 600, DefaultHeight = 480,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12}",
            DefaultContent = "{\"columns\":2,\"gap\":12,\"cardRadius\":10,\"showBadge\":true,\"showRating\":false,\"showOriginalPrice\":true,\"accentColor\":\"#0ea5e9\",\"items\":[{\"image\":\"https://picsum.photos/seed/fu1/500/500\",\"title\":\"Bàn làm việc gỗ tự nhiên 120cm\",\"price\":\"3.200.000đ\",\"originalPrice\":\"4.500.000đ\",\"badge\":\"Sale\"},{\"image\":\"https://picsum.photos/seed/fu2/500/500\",\"title\":\"Ghế văn phòng Ergonomic lưới\",\"price\":\"2.990.000đ\",\"originalPrice\":\"4.200.000đ\",\"badge\":\"-29%\"},{\"image\":\"https://picsum.photos/seed/fu3/500/500\",\"title\":\"Kệ sách treo tường 5 tầng\",\"price\":\"890.000đ\",\"originalPrice\":\"1.200.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/fu4/500/500\",\"title\":\"Đèn bàn LED cảm ứng dimmer\",\"price\":\"450.000đ\",\"originalPrice\":\"680.000đ\",\"badge\":\"-34%\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Cao cấp (nền tối)", TabName = tabName, Order = 7, DefaultWidth = 600, DefaultHeight = 360,
            StylesJson = "{\"backgroundColor\":\"#0f172a\",\"borderRadius\":14}",
            DefaultContent = "{\"columns\":3,\"gap\":10,\"cardRadius\":10,\"showBadge\":false,\"showRating\":true,\"showOriginalPrice\":false,\"accentColor\":\"#f59e0b\",\"items\":[{\"image\":\"https://picsum.photos/seed/pr1/400/400\",\"title\":\"Vòng tay bạc 925 đính đá Swarovski\",\"price\":\"1.450.000đ\",\"rating\":4.9},{\"image\":\"https://picsum.photos/seed/pr2/400/400\",\"title\":\"Đồng hồ cơ sapphire Swiss Made\",\"price\":\"8.900.000đ\",\"rating\":4.8},{\"image\":\"https://picsum.photos/seed/pr3/400/400\",\"title\":\"Nhẫn vàng 14K đá tự nhiên\",\"price\":\"3.200.000đ\",\"rating\":4.7}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = toolItemId, Name = "Văn phòng phẩm 4 cột", TabName = tabName, Order = 8, DefaultWidth = 700, DefaultHeight = 520,
            StylesJson = "{\"backgroundColor\":\"#faf5ff\",\"borderRadius\":10}",
            DefaultContent = "{\"columns\":4,\"gap\":8,\"cardRadius\":6,\"showBadge\":true,\"showRating\":false,\"showOriginalPrice\":true,\"accentColor\":\"#7c3aed\",\"items\":[{\"image\":\"https://picsum.photos/seed/m1/300/300\",\"title\":\"Bút máy cao cấp\",\"price\":\"199.000đ\",\"originalPrice\":\"290.000đ\",\"badge\":\"-31%\"},{\"image\":\"https://picsum.photos/seed/m2/300/300\",\"title\":\"Sổ da A5 ép nổi\",\"price\":\"159.000đ\",\"originalPrice\":\"230.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/m3/300/300\",\"title\":\"Bộ highlight 6 màu\",\"price\":\"89.000đ\",\"originalPrice\":\"130.000đ\",\"badge\":\"-31%\"},{\"image\":\"https://picsum.photos/seed/m4/300/300\",\"title\":\"Hộp đựng bút nhôm\",\"price\":\"129.000đ\",\"originalPrice\":\"190.000đ\",\"badge\":\"Sale\"},{\"image\":\"https://picsum.photos/seed/m5/300/300\",\"title\":\"Bộ tem dán sáng tạo\",\"price\":\"45.000đ\",\"originalPrice\":\"70.000đ\",\"badge\":\"-36%\"},{\"image\":\"https://picsum.photos/seed/m6/300/300\",\"title\":\"Clip giữ sổ kim loại\",\"price\":\"35.000đ\",\"badge\":\"Mới\"},{\"image\":\"https://picsum.photos/seed/m7/300/300\",\"title\":\"Bộ viết vẽ watercolor\",\"price\":\"249.000đ\",\"originalPrice\":\"350.000đ\",\"badge\":\"-29%\"},{\"image\":\"https://picsum.photos/seed/m8/300/300\",\"title\":\"Notebook dotted 160 trang\",\"price\":\"185.000đ\",\"badge\":\"Hot\"}]}"
        }
    };
}

// ─── Seed Carousel / Blog / Cart Presets ─────────────────────────────────────
static async System.Threading.Tasks.Task SeedOtherElementPresetsAsync(LadiPage.Infrastructure.Data.AppDbContext db)
{
    await SeedPresetsForTypeAsync(db, "carousel", (id, tab) => BuildCarouselPresets(id, tab), forceReseed: true);
    await SeedPresetsForTypeAsync(db, "frame",    (id, tab) => BuildFramePresets(id, tab),    forceReseed: true);
    await SeedPresetsForTypeAsync(db, "blog-list", (id, tab) => BuildBlogListPresets(id, tab));
    await SeedPresetsForTypeAsync(db, "blog-detail", (id, tab) => BuildBlogDetailPresets(id, tab));
    await SeedPresetsForTypeAsync(db, "cart", (id, tab) => BuildCartPresets(id, tab));
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildFramePresets(long id, string? tab)
{
    // ── QUOTE ──────────────────────────────────────────────────────────────────
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Quote xanh sáng", TabName = "Quote", Order = 1,
            DefaultWidth = 400, DefaultHeight = 220,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"quote\",\"padding\":20,\"background\":\"linear-gradient(180deg,#ffffff 0%,#f0f7ff 100%)\",\"quoteMarkColor\":\"#0044ff\",\"quoteTextColor\":\"#334155\",\"quoteText\":\"Sản phẩm tuyệt vời, dịch vụ chuyên nghiệp và hỗ trợ nhiệt tình. Tôi đã mua lại nhiều lần và sẽ tiếp tục!\",\"quoteFooter\":\"Nguyễn Thị Lan — Khách hàng thân thiết\",\"quoteFooterColor\":\"#0044ff\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Quote tối gradient tím", TabName = "Quote", Order = 2,
            DefaultWidth = 400, DefaultHeight = 220,
            StylesJson = "{\"borderRadius\":16}",
            DefaultContent = "{\"variant\":\"quote\",\"padding\":24,\"background\":\"linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4c1d95 100%)\",\"quoteMarkColor\":\"#a78bfa\",\"quoteTextColor\":\"#e0e7ff\",\"quoteText\":\"Trải nghiệm tuyệt vời từ đầu đến cuối. Đội ngũ hỗ trợ luôn sẵn sàng giải đáp mọi thắc mắc của tôi.\",\"quoteFooter\":\"Trần Minh Đức — CEO StartUp Tech\",\"quoteFooterColor\":\"#c4b5fd\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Quote cam nắng", TabName = "Quote", Order = 3,
            DefaultWidth = 400, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"quote\",\"padding\":20,\"background\":\"linear-gradient(160deg,#fff7ed 0%,#ffedd5 100%)\",\"quoteMarkColor\":\"#ea580c\",\"quoteTextColor\":\"#431407\",\"quoteText\":\"Chất lượng vượt ngoài mong đợi. Giao hàng nhanh, đóng gói cẩn thận. Sẽ giới thiệu cho bạn bè!\",\"quoteFooter\":\"Lê Bảo Châu — Designer\",\"quoteFooterColor\":\"#ea580c\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Quote xanh lá tối giản", TabName = "Quote", Order = 4,
            DefaultWidth = 400, DefaultHeight = 190,
            StylesJson = "{\"borderRadius\":12,\"borderWidth\":1,\"borderColor\":\"#bbf7d0\"}",
            DefaultContent = "{\"variant\":\"quote\",\"padding\":18,\"background\":\"#f0fdf4\",\"quoteMarkColor\":\"#16a34a\",\"quoteTextColor\":\"#14532d\",\"quoteText\":\"Dịch vụ đáng tin cậy, giá cả hợp lý. Tôi đặc biệt ấn tượng với sự chuyên nghiệp của đội ngũ.\",\"quoteFooter\":\"Phạm Thu Hà — Chuyên gia tư vấn\",\"quoteFooterColor\":\"#16a34a\"}"
        },

        // ── SPLIT FEATURE ─────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Feature ảnh trái", TabName = "Feature", Order = 5,
            DefaultWidth = 560, DefaultHeight = 240,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"split-feature\",\"padding\":16,\"background\":\"#ffffff\",\"splitImagePosition\":\"left\",\"splitImage\":\"https://images.unsplash.com/photo-1551434678-e076c223a692?w=480&h=480&fit=crop\",\"splitImageRadius\":10,\"splitTitle\":\"Giải pháp toàn diện cho doanh nghiệp\",\"splitTitleColor\":\"#0f172a\",\"splitBody\":\"Tối ưu quy trình, tăng doanh thu và cải thiện trải nghiệm khách hàng với nền tảng thông minh của chúng tôi.\",\"splitBodyColor\":\"#64748b\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Feature ảnh phải", TabName = "Feature", Order = 6,
            DefaultWidth = 560, DefaultHeight = 240,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"split-feature\",\"padding\":16,\"background\":\"#ffffff\",\"splitImagePosition\":\"right\",\"splitImage\":\"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=480&h=480&fit=crop\",\"splitImageRadius\":10,\"splitTitle\":\"Tăng trưởng vượt bậc với dữ liệu thực\",\"splitTitleColor\":\"#1e40af\",\"splitBody\":\"Dashboard trực quan, báo cáo tự động và phân tích chuyên sâu giúp bạn đưa ra quyết định nhanh hơn.\",\"splitBodyColor\":\"#64748b\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Feature nền tím", TabName = "Feature", Order = 7,
            DefaultWidth = 560, DefaultHeight = 250,
            StylesJson = "{\"borderRadius\":16}",
            DefaultContent = "{\"variant\":\"split-feature\",\"padding\":20,\"background\":\"linear-gradient(135deg,#1e1b4b 0%,#3730a3 100%)\",\"splitImagePosition\":\"left\",\"splitImage\":\"https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=480&h=480&fit=crop\",\"splitImageRadius\":12,\"splitTitle\":\"Hiệu suất đỉnh cao\",\"splitTitleColor\":\"#e0e7ff\",\"splitBody\":\"Xử lý hàng triệu yêu cầu mỗi ngày với độ trễ dưới 100ms. Hạ tầng đám mây mở rộng tự động.\",\"splitBodyColor\":\"#a5b4fc\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Feature nền cam", TabName = "Feature", Order = 8,
            DefaultWidth = 560, DefaultHeight = 240,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"split-feature\",\"padding\":18,\"background\":\"linear-gradient(135deg,#fff7ed,#ffedd5)\",\"splitImagePosition\":\"right\",\"splitImage\":\"https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=480&h=480&fit=crop\",\"splitImageRadius\":8,\"splitTitle\":\"Chuyển đổi khách hàng hiệu quả\",\"splitTitleColor\":\"#9a3412\",\"splitBody\":\"Landing page tối ưu, A/B testing thông minh giúp tỷ lệ chuyển đổi tăng trung bình 40%.\",\"splitBodyColor\":\"#c2410c\"}"
        },

        // ── PROFILE CTA ───────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Profile dọc - avatar tròn", TabName = "Profile", Order = 9,
            DefaultWidth = 280, DefaultHeight = 340,
            StylesJson = "{\"borderRadius\":16,\"boxShadow\":\"0 4px 24px rgba(15,23,42,0.08)\"}",
            DefaultContent = "{\"variant\":\"profile-cta\",\"padding\":20,\"background\":\"#ffffff\",\"profileLayout\":\"vertical\",\"profileImage\":\"https://picsum.photos/seed/pf1/400/400\",\"profileImageRound\":true,\"profileImageSize\":100,\"profileName\":\"Nguyễn Minh Tuấn\",\"profileNameColor\":\"#0f172a\",\"profileRole\":\"Senior Product Manager\",\"profileRoleColor\":\"#64748b\",\"profileTitle\":\"12+ năm kinh nghiệm\",\"profileTitleColor\":\"#0d9488\",\"profileBody\":\"Chuyên gia tư vấn chiến lược sản phẩm và tăng trưởng cho các startup và doanh nghiệp SME tại Việt Nam.\",\"profileBodyColor\":\"#475569\",\"profileBtnText\":\"Đặt lịch tư vấn\",\"profileBtnBg\":\"#0d9488\",\"profileBtnColor\":\"#ffffff\",\"profileBtnRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Profile ngang - CTA tím", TabName = "Profile", Order = 10,
            DefaultWidth = 420, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":14,\"boxShadow\":\"0 2px 16px rgba(15,23,42,0.07)\"}",
            DefaultContent = "{\"variant\":\"profile-cta\",\"padding\":18,\"background\":\"#ffffff\",\"profileLayout\":\"horizontal\",\"profileImage\":\"https://picsum.photos/seed/pf2/400/400\",\"profileImageRound\":true,\"profileImageSize\":88,\"profileName\":\"Trần Thu Hương\",\"profileNameColor\":\"#0f172a\",\"profileRole\":\"Marketing Director\",\"profileRoleColor\":\"#6366f1\",\"profileTitle\":\"Chuyên gia Digital Marketing\",\"profileTitleColor\":\"#6366f1\",\"profileBody\":\"Hơn 8 năm xây dựng chiến lược thương hiệu và tăng trưởng cho hơn 50 doanh nghiệp.\",\"profileBodyColor\":\"#64748b\",\"profileBtnText\":\"Liên hệ ngay\",\"profileBtnBg\":\"#6366f1\",\"profileBtnColor\":\"#ffffff\",\"profileBtnRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Profile tối - CTA trắng", TabName = "Profile", Order = 11,
            DefaultWidth = 420, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":16}",
            DefaultContent = "{\"variant\":\"profile-cta\",\"padding\":20,\"background\":\"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)\",\"profileLayout\":\"horizontal\",\"profileImage\":\"https://picsum.photos/seed/pf3/400/400\",\"profileImageRound\":true,\"profileImageSize\":84,\"profileName\":\"Lý Hoàng Nam\",\"profileNameColor\":\"#f1f5f9\",\"profileRole\":\"Tech Lead\",\"profileRoleColor\":\"#94a3b8\",\"profileTitle\":\"Kiến trúc sư giải pháp cloud\",\"profileTitleColor\":\"#7dd3fc\",\"profileBody\":\"Xây dựng hệ thống phân tán cho hàng triệu người dùng với uptime 99.99%.\",\"profileBodyColor\":\"#94a3b8\",\"profileBtnText\":\"Xem portfolio\",\"profileBtnBg\":\"#ffffff\",\"profileBtnColor\":\"#0f172a\",\"profileBtnRadius\":8}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Profile dọc - nền tím", TabName = "Profile", Order = 12,
            DefaultWidth = 260, DefaultHeight = 360,
            StylesJson = "{\"borderRadius\":20}",
            DefaultContent = "{\"variant\":\"profile-cta\",\"padding\":22,\"background\":\"linear-gradient(180deg,#4f46e5 0%,#7c3aed 100%)\",\"profileLayout\":\"vertical\",\"profileImage\":\"https://picsum.photos/seed/pf4/400/400\",\"profileImageRound\":true,\"profileImageSize\":96,\"profileName\":\"Phùng Ngọc Anh\",\"profileNameColor\":\"#ffffff\",\"profileRole\":\"UI/UX Lead Designer\",\"profileRoleColor\":\"#c4b5fd\",\"profileTitle\":\"Award-winning Designer\",\"profileTitleColor\":\"#fde68a\",\"profileBody\":\"Thiết kế sản phẩm đẹp không chỉ là thẩm mỹ — đó là giải quyết bài toán người dùng.\",\"profileBodyColor\":\"#ddd6fe\",\"profileBtnText\":\"Xem tác phẩm\",\"profileBtnBg\":\"#ffffff\",\"profileBtnColor\":\"#4f46e5\",\"profileBtnRadius\":50}"
        },

        // ── NUMBERED ─────────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Số liệu tím", TabName = "Số liệu", Order = 13,
            DefaultWidth = 260, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"numbered\",\"padding\":20,\"background\":\"#ffffff\",\"numValue\":\"10K+\",\"numValueColor\":\"#4c1d95\",\"numName\":\"Khách hàng tin tưởng\",\"numNameColor\":\"#0f172a\",\"numRole\":\"Toàn quốc\",\"numRoleColor\":\"#6366f1\",\"numBody\":\"Hơn 10.000 doanh nghiệp đang sử dụng nền tảng của chúng tôi để xây dựng landing page chuyên nghiệp.\",\"numBodyColor\":\"#64748b\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Số liệu cam", TabName = "Số liệu", Order = 14,
            DefaultWidth = 260, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"numbered\",\"padding\":20,\"background\":\"linear-gradient(160deg,#fff7ed,#ffedd5)\",\"numValue\":\"98%\",\"numValueColor\":\"#ea580c\",\"numName\":\"Tỷ lệ hài lòng\",\"numNameColor\":\"#9a3412\",\"numRole\":\"Khảo sát Q1/2025\",\"numRoleColor\":\"#c2410c\",\"numBody\":\"Khách hàng đánh giá 4.9/5 sao về chất lượng dịch vụ và thái độ hỗ trợ của đội ngũ.\",\"numBodyColor\":\"#7c2d12\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Số liệu tối gradient", TabName = "Số liệu", Order = 15,
            DefaultWidth = 280, DefaultHeight = 210,
            StylesJson = "{\"borderRadius\":16}",
            DefaultContent = "{\"variant\":\"numbered\",\"padding\":22,\"background\":\"linear-gradient(135deg,#0f172a,#1e293b)\",\"numValue\":\"500+\",\"numValueColor\":\"#38bdf8\",\"numName\":\"Dự án hoàn thành\",\"numNameColor\":\"#f1f5f9\",\"numRole\":\"Từ 2019 đến nay\",\"numRoleColor\":\"#64748b\",\"numBody\":\"Đội ngũ 40+ chuyên gia thiết kế và phát triển đã hoàn thành hơn 500 dự án lớn nhỏ.\",\"numBodyColor\":\"#94a3b8\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Số liệu xanh teal", TabName = "Số liệu", Order = 16,
            DefaultWidth = 260, DefaultHeight = 190,
            StylesJson = "{\"borderRadius\":14}",
            DefaultContent = "{\"variant\":\"numbered\",\"padding\":18,\"background\":\"linear-gradient(160deg,#f0fdfa,#ccfbf1)\",\"numValue\":\"15+\",\"numValueColor\":\"#0d9488\",\"numName\":\"Năm kinh nghiệm\",\"numNameColor\":\"#134e4a\",\"numRole\":\"Từ 2009\",\"numRoleColor\":\"#0f766e\",\"numBody\":\"Chúng tôi tích lũy kinh nghiệm trong lĩnh vực công nghệ và tư vấn chiến lược số hóa doanh nghiệp.\",\"numBodyColor\":\"#115e59\"}"
        },

        // ── BLANK ─────────────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Khung trống - nền trắng", TabName = "Trống", Order = 17,
            DefaultWidth = 400, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":12,\"borderWidth\":2,\"borderColor\":\"#e2e8f0\"}",
            DefaultContent = "{\"variant\":\"blank\",\"padding\":16,\"background\":\"#ffffff\",\"blankHint\":\"Kéo và thả phần tử vào đây hoặc chỉnh nội dung từ panel bên phải.\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Khung trống - nền xám", TabName = "Trống", Order = 18,
            DefaultWidth = 400, DefaultHeight = 200,
            StylesJson = "{\"borderRadius\":12}",
            DefaultContent = "{\"variant\":\"blank\",\"padding\":20,\"background\":\"#f8fafc\",\"blankHint\":\"Khung nội dung linh hoạt — thêm văn bản, ảnh, hoặc CTA bên trong.\"}"
        },
    };
}

static async System.Threading.Tasks.Task SeedPresetsForTypeAsync(
    LadiPage.Infrastructure.Data.AppDbContext db,
    string elementType,
    Func<long, string?, IEnumerable<LadiPage.Domain.Entities.ElementPreset>> builder,
    bool forceReseed = false)
{
    var toolItems = await db.ToolItems.Where(x => x.ElementType == elementType).ToListAsync();
    foreach (var ti in toolItems)
    {
        var existing = await db.ElementPresets.Where(x => x.ToolItemId == ti.Id).ToListAsync();
        if (!forceReseed && existing.Count >= 2) continue;
        if (existing.Count > 0) { db.ElementPresets.RemoveRange(existing); await db.SaveChangesAsync(); }
        db.ElementPresets.AddRange(builder(ti.Id, ti.HasSubTabs ? ParseFirstTab(ti.SubTabsJson) : null));
        await db.SaveChangesAsync();
    }
}

static string? ParseFirstTab(string? subTabsJson)
{
    if (string.IsNullOrEmpty(subTabsJson)) return null;
    try { var t = System.Text.Json.JsonSerializer.Deserialize<string[]>(subTabsJson); return t?.Length > 0 ? t[0] : null; }
    catch { return null; }
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildCarouselPresets(long id, string? tab)
{
    return new[]
    {
        // ── PRODUCT / multi-slide presets ────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Gallery ảnh sản phẩm (3/view)", TabName = "Product", Order = 1,
            DefaultWidth = 660, DefaultHeight = 220,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12}",
            DefaultContent = "{\"layoutType\":\"product\",\"carouselStyle\":{\"autoplayMs\":3000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"pill\",\"dotActiveColor\":\"#6366f1\",\"dotColor\":\"#ddd6fe\",\"slidesPerView\":3,\"slideGap\":12,\"showCaption\":false,\"cardBg\":\"#ffffff\",\"cardRadius\":10},\"items\":[{\"image\":\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop\",\"title\":\"Tai nghe ANC Pro\"},{\"image\":\"https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop\",\"title\":\"Đồng hồ thể thao\"},{\"image\":\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop\",\"title\":\"Đồng hồ minimalist\"},{\"image\":\"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop\",\"title\":\"Nước hoa cao cấp\"},{\"image\":\"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop\",\"title\":\"Giày thể thao\"},{\"image\":\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop\",\"title\":\"Giày sneaker\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Gallery ảnh 4/view có caption", TabName = "Product", Order = 2,
            DefaultWidth = 700, DefaultHeight = 240,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":10}",
            DefaultContent = "{\"layoutType\":\"product\",\"carouselStyle\":{\"autoplayMs\":4000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":false,\"slidesPerView\":4,\"slideGap\":10,\"showCaption\":true,\"cardBg\":\"#f8fafc\",\"cardRadius\":8,\"titleFontSize\":12,\"titleColor\":\"#1e293b\",\"descFontSize\":11,\"descColor\":\"#64748b\"},\"items\":[{\"image\":\"https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=300&h=300&fit=crop\",\"title\":\"Áo thun nam\",\"desc\":\"299.000đ\"},{\"image\":\"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop\",\"title\":\"Túi da cao cấp\",\"desc\":\"1.290.000đ\"},{\"image\":\"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=300&fit=crop\",\"title\":\"Ví nam slim\",\"desc\":\"450.000đ\"},{\"image\":\"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=300&fit=crop\",\"title\":\"Mũ cap unisex\",\"desc\":\"199.000đ\"},{\"image\":\"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=300&fit=crop\",\"title\":\"Áo hoodie basic\",\"desc\":\"590.000đ\"},{\"image\":\"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&h=300&fit=crop\",\"title\":\"Áo khoác bomber\",\"desc\":\"890.000đ\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Gallery 2/view lớn có chú thích", TabName = "Product", Order = 3,
            DefaultWidth = 620, DefaultHeight = 300,
            StylesJson = "{\"backgroundColor\":\"#f1f5f9\",\"borderRadius\":14}",
            DefaultContent = "{\"layoutType\":\"product\",\"carouselStyle\":{\"autoplayMs\":5000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"circle\",\"dotActiveColor\":\"#f97316\",\"slidesPerView\":2,\"slideGap\":16,\"showCaption\":true,\"cardBg\":\"#ffffff\",\"cardRadius\":12,\"titleFontSize\":13,\"titleColor\":\"#0f172a\",\"descFontSize\":12,\"descColor\":\"#64748b\"},\"items\":[{\"image\":\"https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop\",\"title\":\"Laptop văn phòng 14 inch\",\"desc\":\"Mỏng nhẹ, pin 12h, màn hình 2K\"},{\"image\":\"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=400&fit=crop\",\"title\":\"Macbook Pro M3\",\"desc\":\"Hiệu năng vượt trội, retina display\"},{\"image\":\"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop\",\"title\":\"Ultrabook siêu mỏng\",\"desc\":\"920g, sạc nhanh 65W USB-C\"}]}"
        },

        // ── TESTIMONIAL presets ──────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Nhận xét có sao", TabName = "Testimonial", Order = 4,
            DefaultWidth = 580, DefaultHeight = 280,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":16}",
            DefaultContent = "{\"layoutType\":\"testimonial\",\"carouselStyle\":{\"autoplayMs\":5000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"pill\",\"dotActiveColor\":\"#6366f1\",\"dotColor\":\"#ddd6fe\",\"quoteFontSize\":13,\"quoteColor\":\"#374151\",\"quoteAlign\":\"center\",\"nameFontSize\":13,\"nameColor\":\"#111827\",\"nameAlign\":\"center\",\"roleFontSize\":11,\"roleColor\":\"#6b7280\",\"roleAlign\":\"center\",\"showRating\":true,\"ratingColor\":\"#f59e0b\"},\"items\":[{\"avatar\":\"https://picsum.photos/seed/av1/120/120\",\"quote\":\"Sản phẩm chất lượng tuyệt vời, giao hàng nhanh và đóng gói cẩn thận. Tôi đã mua nhiều lần!\",\"name\":\"Nguyễn Thị Lan\",\"role\":\"Khách hàng thân thiết\",\"rating\":5},{\"avatar\":\"https://picsum.photos/seed/av2/120/120\",\"quote\":\"Dịch vụ hỗ trợ rất nhiệt tình, phản hồi nhanh và giải quyết vấn đề triệt để. Rất hài lòng!\",\"name\":\"Trần Văn Minh\",\"role\":\"CEO — StartUp ABC\",\"rating\":5},{\"avatar\":\"https://picsum.photos/seed/av3/120/120\",\"quote\":\"UX/UI rất dễ dùng ngay cả với người mới. Tôi đặc biệt ấn tượng với sự tối giản mà đẹp.\",\"name\":\"Phạm Hoàng Yến\",\"role\":\"Designer tự do\",\"rating\":4}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Nhận xét nền tối", TabName = "Testimonial", Order = 5,
            DefaultWidth = 580, DefaultHeight = 240,
            StylesJson = "{\"backgroundColor\":\"#0f172a\",\"borderRadius\":16}",
            DefaultContent = "{\"layoutType\":\"testimonial\",\"carouselStyle\":{\"autoplayMs\":5500,\"transitionType\":\"fade\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"pill\",\"dotActiveColor\":\"#a78bfa\",\"dotColor\":\"#334155\",\"arrowBg\":\"rgba(255,255,255,0.1)\",\"arrowColor\":\"#e2e8f0\",\"quoteFontSize\":13,\"quoteColor\":\"#e2e8f0\",\"nameFontSize\":13,\"nameColor\":\"#a78bfa\",\"roleFontSize\":11,\"roleColor\":\"#94a3b8\",\"showRating\":true,\"ratingColor\":\"#f59e0b\"},\"items\":[{\"avatar\":\"https://picsum.photos/seed/dk1/120/120\",\"quote\":\"Trải nghiệm sử dụng vượt ngoài mong đợi. Tôi đặc biệt ấn tượng với tốc độ hỗ trợ.\",\"name\":\"Lý Bảo Châu\",\"role\":\"Product Manager\",\"rating\":5},{\"avatar\":\"https://picsum.photos/seed/dk2/120/120\",\"quote\":\"Chất lượng dịch vụ nhất quán qua từng lần hợp tác. Đội ngũ chuyên nghiệp, đúng hẹn.\",\"name\":\"Phú Đông Hải\",\"role\":\"Startup Founder\",\"rating\":5}]}"
        },

        // ── MEDIA presets ────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Banner sản phẩm", TabName = "Media", Order = 6,
            DefaultWidth = 600, DefaultHeight = 280,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12}",
            DefaultContent = "{\"layoutType\":\"media\",\"carouselStyle\":{\"autoplayMs\":3500,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"pill\",\"dotActiveColor\":\"#f97316\",\"titleFontSize\":15,\"titleColor\":\"#111827\",\"titleAlign\":\"center\",\"descFontSize\":12,\"descColor\":\"#64748b\",\"descAlign\":\"center\"},\"items\":[{\"image\":\"https://picsum.photos/seed/cp1/800/400\",\"title\":\"Bộ sưu tập Xuân Hè 2025\",\"desc\":\"Nhẹ nhàng, tươi sáng — ra mắt 01/05\"},{\"image\":\"https://picsum.photos/seed/cp2/800/400\",\"title\":\"Flash Sale cuối tuần\",\"desc\":\"Giảm đến 50% — chỉ thứ Sáu đến Chủ Nhật\"},{\"image\":\"https://picsum.photos/seed/cp3/800/400\",\"title\":\"Freeship toàn quốc\",\"desc\":\"Đơn hàng từ 300.000đ — không cần mã\"}]}"
        },

        // ── HERO presets ─────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Hero banner CTA", TabName = "Hero", Order = 7,
            DefaultWidth = 660, DefaultHeight = 320,
            StylesJson = "{\"backgroundColor\":\"#1e293b\",\"borderRadius\":14}",
            DefaultContent = "{\"layoutType\":\"hero\",\"carouselStyle\":{\"autoplayMs\":5000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"pill\",\"titleFontSize\":20,\"titleAlign\":\"center\",\"descFontSize\":13,\"descAlign\":\"center\",\"overlayColor\":\"#000000\",\"overlayOpacity\":0.35,\"btnBg\":\"#6366f1\",\"btnColor\":\"#ffffff\",\"btnRadius\":8},\"items\":[{\"bgImage\":\"https://picsum.photos/seed/h1/900/500\",\"title\":\"Chào mừng đến với dịch vụ của chúng tôi\",\"subtitle\":\"Giải pháp toàn diện cho doanh nghiệp hiện đại\",\"btnText\":\"Khám phá ngay\",\"btnUrl\":\"#\"},{\"bgImage\":\"https://picsum.photos/seed/h2/900/500\",\"title\":\"Flash Sale — Giảm đến 60%\",\"subtitle\":\"Ưu đãi có hạn, nhanh tay kẻo lỡ!\",\"btnText\":\"Mua ngay\",\"btnUrl\":\"#\"},{\"bgImage\":\"https://picsum.photos/seed/h3/900/500\",\"title\":\"Freeship toàn quốc hôm nay\",\"subtitle\":\"Đặt hàng từ 199.000đ — miễn phí giao hàng\",\"btnText\":\"Xem sản phẩm\",\"btnUrl\":\"#\"}]}"
        },

        // ── CARDS presets ────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Tính năng / Feature Cards", TabName = "Cards", Order = 8,
            DefaultWidth = 560, DefaultHeight = 280,
            StylesJson = "{\"backgroundColor\":\"#f1f5f9\",\"borderRadius\":14}",
            DefaultContent = "{\"layoutType\":\"cards\",\"carouselStyle\":{\"autoplayMs\":5000,\"transitionType\":\"slide\",\"showArrows\":true,\"showDots\":true,\"dotStyle\":\"circle\",\"dotActiveColor\":\"#6366f1\",\"cardBg\":\"#ffffff\",\"cardRadius\":12,\"titleFontSize\":14,\"titleColor\":\"#1e293b\",\"titleAlign\":\"left\",\"descFontSize\":12,\"descColor\":\"#64748b\",\"descAlign\":\"left\"},\"items\":[{\"image\":\"https://picsum.photos/seed/ft1/400/220\",\"title\":\"Kéo thả trực quan\",\"desc\":\"Thiết kế trang đơn giản bằng giao diện kéo thả không cần code.\"},{\"image\":\"https://picsum.photos/seed/ft2/400/220\",\"title\":\"SEO tối ưu sẵn\",\"desc\":\"Meta tags, schema, tốc độ tải — được cấu hình tự động.\"},{\"image\":\"https://picsum.photos/seed/ft3/400/220\",\"title\":\"Tích hợp form & CRM\",\"desc\":\"Thu thập lead và đồng bộ dữ liệu về hệ thống CRM ngay lập tức.\"}]}"
        },

        // ── LOGOS presets ────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Đối tác / Partners", TabName = "Logos", Order = 9,
            DefaultWidth = 580, DefaultHeight = 120,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":10}",
            DefaultContent = "{\"layoutType\":\"logos\",\"carouselStyle\":{\"autoplayMs\":0,\"showArrows\":false,\"showDots\":false,\"logoHeight\":44,\"logoGrayscale\":true},\"items\":[{\"image\":\"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png\",\"name\":\"Google\"},{\"image\":\"https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1200px-Netflix_2015_logo.svg.png\",\"name\":\"Netflix\"},{\"image\":\"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1200px-Amazon_logo.svg.png\",\"name\":\"Amazon\"},{\"image\":\"https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1200px-Microsoft_logo.svg.png\",\"name\":\"Microsoft\"},{\"image\":\"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/1200px-Slack_Technologies_Logo.svg.png\",\"name\":\"Slack\"}]}"
        },

        // ── STATS presets ────────────────────────────────────────────────────
        new LadiPage.Domain.Entities.ElementPreset {
            ToolItemId = id, Name = "Thống kê thành tích", TabName = "Stats", Order = 10,
            DefaultWidth = 600, DefaultHeight = 140,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":14}",
            DefaultContent = "{\"layoutType\":\"stats\",\"carouselStyle\":{\"autoplayMs\":0,\"showArrows\":false,\"showDots\":false,\"numberFontSize\":32,\"numberColor\":\"#6366f1\",\"labelColor\":\"#64748b\"},\"items\":[{\"number\":\"10K+\",\"label\":\"Khách hàng\"},{\"number\":\"98%\",\"label\":\"Hài lòng\"},{\"number\":\"500+\",\"label\":\"Dự án\"},{\"number\":\"15+\",\"label\":\"Năm kinh nghiệm\"}]}"
        }
    };
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildBlogListPresets(long id, string? tab)
{
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Magazine 3 cột", TabName = tab, Order = 1, DefaultWidth = 700, DefaultHeight = 320,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":14,\"fontSize\":14}",
            DefaultContent = "{\"columns\":3,\"posts\":[{\"image\":\"https://picsum.photos/seed/blm1/500/320\",\"title\":\"10 xu hướng landing page 2025\",\"excerpt\":\"Tối ưu chuyển đổi với layout rõ ràng và CTA đơn giản.\",\"date\":\"12/03/2025\"},{\"image\":\"https://picsum.photos/seed/blm2/500/320\",\"title\":\"Cách viết headline không bị sáo\",\"excerpt\":\"Gợi ý công thức AIDA áp dụng cho từng ngành.\",\"date\":\"08/03/2025\"},{\"image\":\"https://picsum.photos/seed/blm3/500/320\",\"title\":\"Checklist SEO trước khi publish\",\"excerpt\":\"Meta, schema, tốc độ tải — làm từng bước.\",\"date\":\"01/03/2025\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Tin tức 2 cột", TabName = tab, Order = 2, DefaultWidth = 700, DefaultHeight = 420,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"fontSize\":14}",
            DefaultContent = "{\"columns\":2,\"posts\":[{\"image\":\"https://picsum.photos/seed/bln1/480/280\",\"title\":\"Cập nhật sản phẩm tháng 3\",\"excerpt\":\"Tính năng mới và lộ trình phát hành.\",\"date\":\"18/03/2025\"},{\"image\":\"https://picsum.photos/seed/bln2/480/280\",\"title\":\"Mở đăng ký webinar miễn phí\",\"excerpt\":\"Chủ đề: tăng lead với form đa bước.\",\"date\":\"15/03/2025\"},{\"image\":\"https://picsum.photos/seed/bln3/480/280\",\"title\":\"Chính sách bảo mật — có gì mới?\",\"excerpt\":\"Tóm tắt thay đổi cho người dùng.\",\"date\":\"10/03/2025\"},{\"image\":\"https://picsum.photos/seed/bln4/480/280\",\"title\":\"Đối tác & khách hàng tiêu biểu\",\"excerpt\":\"Case study ngắn từ 3 doanh nghiệp.\",\"date\":\"05/03/2025\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Tối giản 1 cột", TabName = tab, Order = 3, DefaultWidth = 600, DefaultHeight = 380,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"fontSize\":15}",
            DefaultContent = "{\"columns\":1,\"posts\":[{\"image\":\"https://picsum.photos/seed/bls1/800/360\",\"title\":\"Góc nhìn: vì sao ít chữ lại bán được hơn?\",\"excerpt\":\"Khi người đọc chỉ lướt 8 giây, bạn cần một thông điệp trụ cột.\",\"date\":\"20/03/2025\"},{\"image\":\"https://picsum.photos/seed/bls2/800/360\",\"title\":\"Case study: tăng 40% đơn hàng chỉ trong 2 tuần\",\"excerpt\":\"Chiến lược thay đổi CTA và ảnh hero quyết định.\",\"date\":\"14/03/2025\"}]}"
        }
    };
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildBlogDetailPresets(long id, string? tab)
{
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Bài dài / có HTML", TabName = tab, Order = 1, DefaultWidth = 700, DefaultHeight = 400,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12,\"fontSize\":15}",
            DefaultContent = "{\"title\":\"Hướng dẫn tối ưu trang đích cho chiến dịch quảng cáo\",\"author\":\"Team Marketing\",\"date\":\"19/03/2025\",\"body\":\"<p>Đoạn mở đầu thu hút: nêu vấn đề và lợi ích trong 2–3 câu.</p><p><strong>Mục 1.</strong> Phân tích đối tượng và thông điệp chính.</p><p><strong>Mục 2.</strong> Cấu trúc section: hero → bằng chứng → CTA.</p><p>Kết luận: kêu gọi hành động rõ ràng (đăng ký / tải / mua).</p>\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Tin ngắn", TabName = tab, Order = 2, DefaultWidth = 600, DefaultHeight = 300,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":12,\"fontSize\":14}",
            DefaultContent = "{\"title\":\"Ra mắt tính năng xuất PDF từ editor\",\"author\":\"Sản phẩm\",\"date\":\"17/03/2025\",\"body\":\"Chúng tôi vừa bổ sung xuất PDF một click cho bản preview trang.\\n\\n• Giữ nguyên font và khoảng cách\\n• Hỗ trợ khổ A4 và letter\\n• Tối ưu dung lượng file\"}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Tối giản", TabName = tab, Order = 3, DefaultWidth = 600, DefaultHeight = 260,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":8,\"fontSize\":15}",
            DefaultContent = "{\"title\":\"Tiêu đề bài viết của bạn\",\"author\":\"Tác giả\",\"date\":\"—\",\"body\":\"Thay đoạn dẫn và nội dung chi tiết tại đây. Có thể dùng văn bản thuần hoặc HTML tùy nhu cầu.\"}"
        }
    };
}

static IEnumerable<LadiPage.Domain.Entities.ElementPreset> BuildCartPresets(long id, string? tab)
{
    return new[]
    {
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Giỏ demo", TabName = tab, Order = 1, DefaultWidth = 500, DefaultHeight = 280,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12}",
            DefaultContent = "{\"dataSource\":\"static\",\"emptyMessage\":\"Giỏ hàng trống\",\"checkoutButtonText\":\"Thanh toán\",\"currency\":\"VND\",\"showThumbnail\":true,\"showQty\":true,\"items\":[{\"title\":\"Sản phẩm A\",\"price\":\"299.000đ\",\"qty\":1,\"image\":\"https://picsum.photos/seed/ca1/80/80\"},{\"title\":\"Sản phẩm B\",\"price\":\"150.000đ\",\"qty\":2,\"image\":\"https://picsum.photos/seed/ca2/80/80\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Mini giỏ", TabName = tab, Order = 2, DefaultWidth = 420, DefaultHeight = 200,
            StylesJson = "{\"backgroundColor\":\"#f8fafc\",\"borderRadius\":10}",
            DefaultContent = "{\"dataSource\":\"static\",\"emptyMessage\":\"Chưa có món\",\"checkoutButtonText\":\"Xem giỏ\",\"currency\":\"VND\",\"showThumbnail\":true,\"showQty\":true,\"items\":[{\"title\":\"Túi tote canvas\",\"price\":\"189.000đ\",\"qty\":1,\"image\":\"https://picsum.photos/seed/ca3/80/80\"}]}"
        },
        new LadiPage.Domain.Entities.ElementPreset { ToolItemId = id, Name = "Giỏ trống", TabName = tab, Order = 3, DefaultWidth = 420, DefaultHeight = 180,
            StylesJson = "{\"backgroundColor\":\"#ffffff\",\"borderRadius\":12}",
            DefaultContent = "{\"dataSource\":\"static\",\"emptyMessage\":\"Bạn chưa thêm sản phẩm nào.\",\"checkoutButtonText\":\"Tiếp tục mua sắm\",\"currency\":\"VND\",\"showThumbnail\":true,\"showQty\":true,\"items\":[]}"
        }
    };
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
