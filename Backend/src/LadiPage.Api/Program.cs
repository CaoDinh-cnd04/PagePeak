using System.Security.Claims;
using System.Text;
using LadiPage.Api.Services;
using LadiPage.Application.Features.Auth;
using LadiPage.Application.Features.Pages;
using LadiPage.Application.Features.Templates;
using LadiPage.Application.Features.Workspaces;
using LadiPage.Application;
using LadiPage.Core.Interfaces;
using LadiPage.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:3000" })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? throw new InvalidOperationException("JwtSettings:Secret is required.");
var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
var externalRegIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "LadiPageApi";
var externalRegAudience = builder.Configuration["JwtSettings:Audience"] ?? "LadiPageClient";

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    })
    .AddCookie("ExternalCookie", _ => { });

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authBuilder.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = "ExternalCookie";
        options.CallbackPath = "/signin-google";
    });
}

var fbAppId = builder.Configuration["Authentication:Facebook:AppId"];
var fbAppSecret = builder.Configuration["Authentication:Facebook:AppSecret"];
if (!string.IsNullOrWhiteSpace(fbAppId) && !string.IsNullOrWhiteSpace(fbAppSecret))
{
    authBuilder.AddFacebook(FacebookDefaults.AuthenticationScheme, options =>
    {
        options.AppId = fbAppId;
        options.AppSecret = fbAppSecret;
        options.SignInScheme = "ExternalCookie";
        options.CallbackPath = "/signin-facebook";
    });
}

builder.Services.AddAuthorization();

var app = builder.Build();

// Tao database LadiPageDB va cac bang (tu EF model) neu chua ton tai
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
        await db.Database.EnsureCreatedAsync();

        // Auto-add new columns/tables if they don't exist (idempotent)
        await db.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'MauGiaoDien', N'U') IS NULL
BEGIN
  CREATE TABLE [MauGiaoDien] (
    [MaMau] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [TenMau] NVARCHAR(200) NOT NULL,
    [DanhMuc] NVARCHAR(100) NOT NULL,
    [AnhDaiDien] NVARCHAR(500) NULL,
    [NoiDungJson] NVARCHAR(MAX) NOT NULL,
    [NgayTao] DATETIME2 NOT NULL
  );
  CREATE INDEX [IX_MauGiaoDien_DanhMuc] ON [MauGiaoDien]([DanhMuc]);
END

IF OBJECT_ID(N'Trang', N'U') IS NULL
BEGIN
  CREATE TABLE [Trang] (
    [MaTrang] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenTrang] NVARCHAR(300) NOT NULL,
    [DuongDan] NVARCHAR(300) NOT NULL,
    [TrangThai] NVARCHAR(20) NOT NULL,
    [NoiDungTrang] NVARCHAR(MAX) NOT NULL,
    [NoiDungHtml] NVARCHAR(MAX) NULL,
    [NgayCapNhat] DATETIME2 NOT NULL,
    CONSTRAINT [FK_Trang_KhongGianLamViec_MaKhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX [IX_Trang_MaKhongGian_DuongDan] ON [Trang]([MaKhongGian],[DuongDan]);
END

-- Rename column if old name exists
IF COL_LENGTH('Trang','NoiDungJson') IS NOT NULL AND COL_LENGTH('Trang','NoiDungTrang') IS NULL
  EXEC sp_rename N'[Trang].[NoiDungJson]', N'NoiDungTrang', 'COLUMN';

-- Add new Page columns
IF COL_LENGTH('Trang','LoaiTrang') IS NULL ALTER TABLE [Trang] ADD [LoaiTrang] NVARCHAR(30) NOT NULL DEFAULT 'trangdich';
IF COL_LENGTH('Trang','MaNguoiTao') IS NULL ALTER TABLE [Trang] ADD [MaNguoiTao] BIGINT NULL;
IF COL_LENGTH('Trang','MaMauTrang') IS NULL ALTER TABLE [Trang] ADD [MaMauTrang] BIGINT NULL;
IF COL_LENGTH('Trang','TieuDeMetaTag') IS NULL ALTER TABLE [Trang] ADD [TieuDeMetaTag] NVARCHAR(300) NULL;
IF COL_LENGTH('Trang','MoTaMetaTag') IS NULL ALTER TABLE [Trang] ADD [MoTaMetaTag] NVARCHAR(500) NULL;
IF COL_LENGTH('Trang','TuKhoaMetaTag') IS NULL ALTER TABLE [Trang] ADD [TuKhoaMetaTag] NVARCHAR(500) NULL;
IF COL_LENGTH('Trang','Favicon') IS NULL ALTER TABLE [Trang] ADD [Favicon] NVARCHAR(500) NULL;
IF COL_LENGTH('Trang','MatKhauTrang') IS NULL ALTER TABLE [Trang] ADD [MatKhauTrang] NVARCHAR(200) NULL;
IF COL_LENGTH('Trang','DiemSEO') IS NULL ALTER TABLE [Trang] ADD [DiemSEO] TINYINT NULL;
IF COL_LENGTH('Trang','ThuanThietBiDiDong') IS NULL ALTER TABLE [Trang] ADD [ThuanThietBiDiDong] BIT NOT NULL DEFAULT 1;
IF COL_LENGTH('Trang','NgayDang') IS NULL ALTER TABLE [Trang] ADD [NgayDang] DATETIME2 NULL;
IF COL_LENGTH('Trang','NgayHetHan') IS NULL ALTER TABLE [Trang] ADD [NgayHetHan] DATETIME2 NULL;
IF COL_LENGTH('Trang','NgayTao') IS NULL ALTER TABLE [Trang] ADD [NgayTao] DATETIME2 NOT NULL DEFAULT GETDATE();

-- Ensure TrangSection table and new columns
IF OBJECT_ID(N'TrangSection', N'U') IS NULL
BEGIN
  CREATE TABLE [TrangSection] (
    [MaSection] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaTrang] BIGINT NOT NULL,
    [ThuTu] INT NOT NULL,
    [TenSection] NVARCHAR(200) NULL,
    [MauNen] NVARCHAR(50) NULL,
    [AnhNen] NVARCHAR(500) NULL,
    [ChieuCao] INT NULL,
    [HienThi] BIT NOT NULL DEFAULT 1,
    [DaKhoa] BIT NOT NULL DEFAULT 0,
    [LopTuyChinh] NVARCHAR(200) NULL,
    CONSTRAINT [FK_TrangSection_Trang] FOREIGN KEY ([MaTrang]) REFERENCES [Trang]([MaTrang]) ON DELETE CASCADE
  );
  CREATE INDEX IX_TrangSection_MaTrang_ThuTu ON [TrangSection]([MaTrang],[ThuTu]);
END
IF COL_LENGTH('TrangSection','TenSection') IS NULL ALTER TABLE [TrangSection] ADD [TenSection] NVARCHAR(200) NULL;
IF COL_LENGTH('TrangSection','AnhNen') IS NULL ALTER TABLE [TrangSection] ADD [AnhNen] NVARCHAR(500) NULL;
IF COL_LENGTH('TrangSection','DaKhoa') IS NULL ALTER TABLE [TrangSection] ADD [DaKhoa] BIT NOT NULL DEFAULT 0;

-- Ensure TrangPhanTu table and new columns
IF OBJECT_ID(N'TrangPhanTu', N'U') IS NULL
BEGIN
  CREATE TABLE [TrangPhanTu] (
    [MaPhanTu] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaSection] BIGINT NOT NULL,
    [Loai] NVARCHAR(50) NOT NULL,
    [ThuTu] INT NOT NULL,
    [ViTriX] INT NOT NULL,
    [ViTriY] INT NOT NULL,
    [ChieuRong] INT NULL,
    [ChieuCao] INT NULL,
    [ZIndex] INT NOT NULL DEFAULT 0,
    [GocXoay] FLOAT NOT NULL DEFAULT 0,
    [DoMo] FLOAT NOT NULL DEFAULT 1,
    [DaKhoa] BIT NOT NULL DEFAULT 0,
    [DaAn] BIT NOT NULL DEFAULT 0,
    [NoiDung] NVARCHAR(MAX) NULL,
    [LienKet] NVARCHAR(500) NULL,
    [Target] NVARCHAR(20) NULL,
    [DuongDanAnh] NVARCHAR(500) NULL,
    [DuongDanVideo] NVARCHAR(500) NULL,
    [KieuDangJson] NVARCHAR(MAX) NOT NULL DEFAULT '{{}}',
    CONSTRAINT [FK_TrangPhanTu_TrangSection] FOREIGN KEY ([MaSection]) REFERENCES [TrangSection]([MaSection]) ON DELETE CASCADE
  );
  CREATE INDEX IX_TrangPhanTu_MaSection_ThuTu ON [TrangPhanTu]([MaSection],[ThuTu]);
END
IF COL_LENGTH('TrangPhanTu','GocXoay') IS NULL ALTER TABLE [TrangPhanTu] ADD [GocXoay] FLOAT NOT NULL DEFAULT 0;
IF COL_LENGTH('TrangPhanTu','DoMo') IS NULL ALTER TABLE [TrangPhanTu] ADD [DoMo] FLOAT NOT NULL DEFAULT 1;
IF COL_LENGTH('TrangPhanTu','DaKhoa') IS NULL ALTER TABLE [TrangPhanTu] ADD [DaKhoa] BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('TrangPhanTu','DaAn') IS NULL ALTER TABLE [TrangPhanTu] ADD [DaAn] BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('TrangPhanTu','DuongDanAnh') IS NULL ALTER TABLE [TrangPhanTu] ADD [DuongDanAnh] NVARCHAR(500) NULL;
IF COL_LENGTH('TrangPhanTu','DuongDanVideo') IS NULL ALTER TABLE [TrangPhanTu] ADD [DuongDanVideo] NVARCHAR(500) NULL;

-- ToolCategory -> CongCuDanhMuc
IF OBJECT_ID(N'CongCuDanhMuc', N'U') IS NULL
BEGIN
  CREATE TABLE [CongCuDanhMuc] (
    [MaDanhMuc] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [TenDanhMuc] NVARCHAR(100) NOT NULL,
    [BieuTuong] NVARCHAR(100) NOT NULL,
    [ThuTu] INT NOT NULL,
    [HoatDong] BIT NOT NULL DEFAULT 1
  );
END

-- ToolItem -> CongCuMuc
IF OBJECT_ID(N'CongCuMuc', N'U') IS NULL
BEGIN
  CREATE TABLE [CongCuMuc] (
    [MaMuc] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaDanhMuc] BIGINT NOT NULL,
    [TenMuc] NVARCHAR(100) NOT NULL,
    [BieuTuong] NVARCHAR(100) NOT NULL,
    [LoaiPhanTu] NVARCHAR(50) NOT NULL,
    [ThuTu] INT NOT NULL,
    [HoatDong] BIT NOT NULL DEFAULT 1,
    [CoTabCon] BIT NOT NULL DEFAULT 0,
    [TabConJson] NVARCHAR(500) NULL,
    CONSTRAINT [FK_CongCuMuc_CongCuDanhMuc] FOREIGN KEY ([MaDanhMuc]) REFERENCES [CongCuDanhMuc]([MaDanhMuc]) ON DELETE CASCADE
  );
END

-- ElementPreset -> MauPhanTuMacDinh
IF OBJECT_ID(N'MauPhanTuMacDinh', N'U') IS NULL
BEGIN
  CREATE TABLE [MauPhanTuMacDinh] (
    [MaMau] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaMuc] BIGINT NOT NULL,
    [TenMau] NVARCHAR(200) NOT NULL,
    [TenTab] NVARCHAR(50) NULL,
    [NoiDungMacDinh] NVARCHAR(MAX) NULL,
    [KieuDangJson] NVARCHAR(MAX) NOT NULL DEFAULT '{{}}',
    [ChieuRongMacDinh] INT NULL,
    [ChieuCaoMacDinh] INT NULL,
    [ThuTu] INT NOT NULL,
    CONSTRAINT [FK_MauPhanTuMacDinh_CongCuMuc] FOREIGN KEY ([MaMuc]) REFERENCES [CongCuMuc]([MaMuc]) ON DELETE CASCADE
  );
END
");

        // Seed editor tools if empty
        if (!await db.ToolCategories.AnyAsync())
        {
            var catPhanTu = new LadiPage.Core.Entities.ToolCategory { Name = "Phần tử", Icon = "layout-grid", Order = 1, IsActive = true };
            var catAssets = new LadiPage.Core.Entities.ToolCategory { Name = "Assets", Icon = "image", Order = 2, IsActive = true };
            var catSection = new LadiPage.Core.Entities.ToolCategory { Name = "Section", Icon = "layers", Order = 3, IsActive = true };
            var catPopup = new LadiPage.Core.Entities.ToolCategory { Name = "Popup", Icon = "message-square", Order = 4, IsActive = true };
            var catDropbox = new LadiPage.Core.Entities.ToolCategory { Name = "Dropbox", Icon = "hard-drive", Order = 5, IsActive = true };
            var catSanPham = new LadiPage.Core.Entities.ToolCategory { Name = "Sản phẩm", Icon = "shopping-bag", Order = 6, IsActive = true };
            var catBlog = new LadiPage.Core.Entities.ToolCategory { Name = "Blog", Icon = "file-text", Order = 7, IsActive = true };
            var catTienIch = new LadiPage.Core.Entities.ToolCategory { Name = "Tiện ích", Icon = "puzzle", Order = 8, IsActive = true };
            var catNoiDung = new LadiPage.Core.Entities.ToolCategory { Name = "Quản lý nội dung", Icon = "folder", Order = 9, IsActive = true };
            var catMedia = new LadiPage.Core.Entities.ToolCategory { Name = "Quản lý Media", Icon = "film", Order = 10, IsActive = true };
            var catTaiLieu = new LadiPage.Core.Entities.ToolCategory { Name = "Quản lý tài liệu", Icon = "file-archive", Order = 11, IsActive = true };
            var catFont = new LadiPage.Core.Entities.ToolCategory { Name = "Quản lý Font", Icon = "type", Order = 12, IsActive = true };

            db.ToolCategories.AddRange(catPhanTu, catAssets, catSection, catPopup, catDropbox, catSanPham, catBlog, catTienIch, catNoiDung, catMedia, catTaiLieu, catFont);
            await db.SaveChangesAsync();

            // Tool Items for "Phần tử"
            var tiVanBan = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Văn bản", Icon = "type", ElementType = "text", Order = 1, HasSubTabs = true, SubTabsJson = "[\"Tiêu đề\",\"Đoạn văn\",\"Danh sách\"]" };
            var tiNutBam = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Nút bấm", Icon = "mouse-pointer-click", ElementType = "button", Order = 2, HasSubTabs = false };
            var tiAnh = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Ảnh", Icon = "image", ElementType = "image", Order = 3, HasSubTabs = false };
            var tiGallery = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Gallery", Icon = "layout-grid", ElementType = "gallery", Order = 4, HasSubTabs = false };
            var tiHinhHop = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Hình hộp", Icon = "square", ElementType = "shape", Order = 5, HasSubTabs = false };
            var tiBieuTuong = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Biểu tượng", Icon = "smile", ElementType = "icon", Order = 6, HasSubTabs = false };
            var tiDuongKe = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Đường kẻ", Icon = "minus", ElementType = "divider", Order = 7, HasSubTabs = false };
            var tiForm = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Form", Icon = "clipboard-list", ElementType = "form", Order = 8, HasSubTabs = false };
            var tiSanPhamMau = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Sản phẩm mẫu", Icon = "package", ElementType = "product", Order = 9, HasSubTabs = false };
            var tiVideo = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Video", Icon = "play", ElementType = "video", Order = 10, HasSubTabs = false };
            var tiCollectionList = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Collection List", Icon = "list", ElementType = "collection-list", Order = 11, HasSubTabs = false };
            var tiCarousel = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Carousel", Icon = "gallery-horizontal", ElementType = "carousel", Order = 12, HasSubTabs = false };
            var tiTabs = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Tabs", Icon = "panel-top", ElementType = "tabs", Order = 13, HasSubTabs = false };
            var tiFrame = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Frame", Icon = "frame", ElementType = "frame", Order = 14, HasSubTabs = false };
            var tiAccordion = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Accordion", Icon = "chevrons-down", ElementType = "accordion", Order = 15, HasSubTabs = false };
            var tiTable = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Table", Icon = "table", ElementType = "table", Order = 16, HasSubTabs = false };

            db.ToolItems.AddRange(tiVanBan, tiNutBam, tiAnh, tiGallery, tiHinhHop, tiBieuTuong, tiDuongKe, tiForm, tiSanPhamMau, tiVideo, tiCollectionList, tiCarousel, tiTabs, tiFrame, tiAccordion, tiTable);

            // Tool Items for "Section"
            var tiSectionBlank = new LadiPage.Core.Entities.ToolItem { CategoryId = catSection.Id, Name = "Section trống", Icon = "plus-square", ElementType = "section", Order = 1, HasSubTabs = false };
            var tiSectionPrebuilt = new LadiPage.Core.Entities.ToolItem { CategoryId = catSection.Id, Name = "Section có sẵn", Icon = "layout", ElementType = "section-preset", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiSectionBlank, tiSectionPrebuilt);

            // Tool Items for "Popup"
            var tiPopupBlank = new LadiPage.Core.Entities.ToolItem { CategoryId = catPopup.Id, Name = "Popup trống", Icon = "plus-square", ElementType = "popup", Order = 1, HasSubTabs = false };
            var tiPopupTemplate = new LadiPage.Core.Entities.ToolItem { CategoryId = catPopup.Id, Name = "Mẫu popup", Icon = "layout", ElementType = "popup-preset", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiPopupBlank, tiPopupTemplate);

            // Tool Items for "Sản phẩm"
            var tiSPDanhSach = new LadiPage.Core.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Danh sách SP", Icon = "list", ElementType = "product-list", Order = 1, HasSubTabs = false };
            var tiSPChiTiet = new LadiPage.Core.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Chi tiết SP", Icon = "package", ElementType = "product-detail", Order = 2, HasSubTabs = false };
            var tiSPGioHang = new LadiPage.Core.Entities.ToolItem { CategoryId = catSanPham.Id, Name = "Giỏ hàng", Icon = "shopping-cart", ElementType = "cart", Order = 3, HasSubTabs = false };
            db.ToolItems.AddRange(tiSPDanhSach, tiSPChiTiet, tiSPGioHang);

            // Tool Items for "Blog"
            var tiBlogList = new LadiPage.Core.Entities.ToolItem { CategoryId = catBlog.Id, Name = "Danh sách bài", Icon = "list", ElementType = "blog-list", Order = 1, HasSubTabs = false };
            var tiBlogDetail = new LadiPage.Core.Entities.ToolItem { CategoryId = catBlog.Id, Name = "Chi tiết bài", Icon = "file-text", ElementType = "blog-detail", Order = 2, HasSubTabs = false };
            db.ToolItems.AddRange(tiBlogList, tiBlogDetail);

            // Tool Items for "Tiện ích"
            var tiCountdown = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Đếm ngược", Icon = "timer", ElementType = "countdown", Order = 1, HasSubTabs = false };
            var tiHtml = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "HTML tùy chỉnh", Icon = "code", ElementType = "html", Order = 2, HasSubTabs = false };
            var tiMap = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Google Maps", Icon = "map-pin", ElementType = "map", Order = 3, HasSubTabs = false };
            var tiSocialShare = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Chia sẻ MXH", Icon = "share-2", ElementType = "social-share", Order = 4, HasSubTabs = false };
            var tiRating = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Đánh giá sao", Icon = "star", ElementType = "rating", Order = 5, HasSubTabs = false };
            var tiProgress = new LadiPage.Core.Entities.ToolItem { CategoryId = catTienIch.Id, Name = "Thanh tiến trình", Icon = "bar-chart-2", ElementType = "progress", Order = 6, HasSubTabs = false };
            db.ToolItems.AddRange(tiCountdown, tiHtml, tiMap, tiSocialShare, tiRating, tiProgress);

            await db.SaveChangesAsync();

            // Element Presets for "Văn bản" -> Tiêu đề tab
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 3", TabName = "Tiêu đề", DefaultContent = "Heading 3", StylesJson = "{\"fontSize\":18,\"fontWeight\":600,\"color\":\"#1e293b\"}", DefaultWidth = 400, DefaultHeight = 30, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 2", TabName = "Tiêu đề", DefaultContent = "Heading 2", StylesJson = "{\"fontSize\":24,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 500, DefaultHeight = 40, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Heading 1", TabName = "Tiêu đề", DefaultContent = "Heading 1", StylesJson = "{\"fontSize\":32,\"fontWeight\":700,\"color\":\"#1e293b\"}", DefaultWidth = 600, DefaultHeight = 50, Order = 3 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 1", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 1", StylesJson = "{\"fontSize\":20,\"fontWeight\":500,\"color\":\"#334155\"}", DefaultWidth = 400, DefaultHeight = 32, Order = 4 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 2", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 2", StylesJson = "{\"fontSize\":22,\"fontWeight\":600,\"color\":\"#ea580c\"}", DefaultWidth = 420, DefaultHeight = 35, Order = 5 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 3", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 3", StylesJson = "{\"fontSize\":28,\"fontWeight\":600,\"color\":\"#dc2626\"}", DefaultWidth = 450, DefaultHeight = 42, Order = 6 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 4", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 4", StylesJson = "{\"fontSize\":16,\"fontWeight\":400,\"color\":\"#475569\",\"fontStyle\":\"italic\"}", DefaultWidth = 380, DefaultHeight = 28, Order = 7 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Thêm tiêu đề 5", TabName = "Tiêu đề", DefaultContent = "Thêm tiêu đề 5", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#64748b\"}", DefaultWidth = 360, DefaultHeight = 24, Order = 8 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Big Title", TabName = "Tiêu đề", DefaultContent = "Big Title", StylesJson = "{\"fontSize\":48,\"fontWeight\":800,\"color\":\"#0f172a\"}", DefaultWidth = 600, DefaultHeight = 70, Order = 9 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "CAPS TITLE", TabName = "Tiêu đề", DefaultContent = "CAPS TITLE", StylesJson = "{\"fontSize\":28,\"fontWeight\":700,\"color\":\"#ea580c\",\"textTransform\":\"uppercase\",\"letterSpacing\":4}", DefaultWidth = 500, DefaultHeight = 42, Order = 10 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Small Title", TabName = "Tiêu đề", DefaultContent = "Small Title", StylesJson = "{\"fontSize\":13,\"fontWeight\":500,\"color\":\"#94a3b8\"}", DefaultWidth = 300, DefaultHeight = 22, Order = 11 }
            );

            // Element Presets for "Văn bản" -> Đoạn văn tab
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn lớn", TabName = "Đoạn văn", DefaultContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", StylesJson = "{\"fontSize\":18,\"fontWeight\":400,\"color\":\"#334155\",\"lineHeight\":1.8}", DefaultWidth = 600, DefaultHeight = 100, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn trung bình", TabName = "Đoạn văn", DefaultContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam.", StylesJson = "{\"fontSize\":15,\"fontWeight\":400,\"color\":\"#475569\",\"lineHeight\":1.7}", DefaultWidth = 500, DefaultHeight = 80, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Đoạn văn nhỏ", TabName = "Đoạn văn", DefaultContent = "Mô tả ngắn gọn sản phẩm hoặc dịch vụ của bạn.", StylesJson = "{\"fontSize\":13,\"fontWeight\":400,\"color\":\"#64748b\",\"lineHeight\":1.6}", DefaultWidth = 400, DefaultHeight = 50, Order = 3 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Trích dẫn", TabName = "Đoạn văn", DefaultContent = "\"Đây là một câu trích dẫn nổi bật để thu hút sự chú ý của khách hàng.\"", StylesJson = "{\"fontSize\":20,\"fontWeight\":500,\"color\":\"#7c3aed\",\"fontStyle\":\"italic\",\"lineHeight\":1.6}", DefaultWidth = 550, DefaultHeight = 80, Order = 4 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Chú thích", TabName = "Đoạn văn", DefaultContent = "* Điều kiện và điều khoản áp dụng", StylesJson = "{\"fontSize\":11,\"fontWeight\":400,\"color\":\"#94a3b8\",\"lineHeight\":1.5}", DefaultWidth = 300, DefaultHeight = 20, Order = 5 }
            );

            // Element Presets for "Văn bản" -> Danh sách tab
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách có dấu", TabName = "Danh sách", DefaultContent = "Tính năng thứ nhất\nTính năng thứ hai\nTính năng thứ ba", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#334155\",\"listStyle\":\"disc\"}", DefaultWidth = 400, DefaultHeight = 100, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách đánh số", TabName = "Danh sách", DefaultContent = "Bước 1: Đăng ký tài khoản\nBước 2: Chọn gói dịch vụ\nBước 3: Bắt đầu sử dụng", StylesJson = "{\"fontSize\":14,\"fontWeight\":400,\"color\":\"#334155\",\"listStyle\":\"decimal\"}", DefaultWidth = 400, DefaultHeight = 100, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVanBan.Id, Name = "Danh sách check", TabName = "Danh sách", DefaultContent = "✓ Miễn phí dùng thử 14 ngày\n✓ Không cần thẻ tín dụng\n✓ Hỗ trợ 24/7\n✓ Hủy bất kỳ lúc nào", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#16a34a\",\"lineHeight\":2}", DefaultWidth = 400, DefaultHeight = 140, Order = 3 }
            );

            // Element Presets for "Nút bấm"
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút chính", TabName = null, DefaultContent = "Bắt đầu ngay", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#4f46e5\",\"borderRadius\":8}", DefaultWidth = 200, DefaultHeight = 48, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút phụ", TabName = null, DefaultContent = "Tìm hiểu thêm", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#4f46e5\",\"backgroundColor\":\"#eef2ff\",\"borderRadius\":8}", DefaultWidth = 180, DefaultHeight = 44, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút viền", TabName = null, DefaultContent = "Liên hệ", StylesJson = "{\"fontSize\":14,\"fontWeight\":500,\"color\":\"#4f46e5\",\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"border\":\"2px solid #4f46e5\"}", DefaultWidth = 160, DefaultHeight = 44, Order = 3 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút tròn", TabName = null, DefaultContent = "Đăng ký", StylesJson = "{\"fontSize\":16,\"fontWeight\":600,\"color\":\"#ffffff\",\"backgroundColor\":\"#dc2626\",\"borderRadius\":50}", DefaultWidth = 200, DefaultHeight = 50, Order = 4 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút gradient", TabName = null, DefaultContent = "Mua ngay", StylesJson = "{\"fontSize\":16,\"fontWeight\":700,\"color\":\"#ffffff\",\"background\":\"linear-gradient(135deg,#6366f1,#a855f7)\",\"borderRadius\":12}", DefaultWidth = 220, DefaultHeight = 52, Order = 5 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiNutBam.Id, Name = "Nút CTA lớn", TabName = null, DefaultContent = "ĐĂNG KÝ MIỄN PHÍ", StylesJson = "{\"fontSize\":20,\"fontWeight\":800,\"color\":\"#ffffff\",\"backgroundColor\":\"#ea580c\",\"borderRadius\":10,\"letterSpacing\":2}", DefaultWidth = 320, DefaultHeight = 60, Order = 6 }
            );

            // Presets for Gallery
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Gallery 3 cột", TabName = null, DefaultContent = "", StylesJson = "{\"columns\":3,\"gap\":8}", DefaultWidth = 600, DefaultHeight = 400, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiGallery.Id, Name = "Gallery 4 cột", TabName = null, DefaultContent = "", StylesJson = "{\"columns\":4,\"gap\":6}", DefaultWidth = 700, DefaultHeight = 350, Order = 2 }
            );

            // Presets for Hình hộp
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp vuông", TabName = null, DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#e0e7ff\",\"borderRadius\":0}", DefaultWidth = 120, DefaultHeight = 120, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp tròn", TabName = null, DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#dbeafe\",\"borderRadius\":999}", DefaultWidth = 120, DefaultHeight = 120, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp bo góc", TabName = null, DefaultContent = "", StylesJson = "{\"backgroundColor\":\"#fef3c7\",\"borderRadius\":16}", DefaultWidth = 200, DefaultHeight = 150, Order = 3 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiHinhHop.Id, Name = "Hộp viền", TabName = null, DefaultContent = "", StylesJson = "{\"backgroundColor\":\"transparent\",\"borderRadius\":8,\"border\":\"2px solid #6366f1\"}", DefaultWidth = 200, DefaultHeight = 150, Order = 4 }
            );

            await db.SaveChangesAsync();
        }

        // Seed goi "free" neu chua co (can cho dang ky user)
        if (!await db.Plans.AnyAsync())
        {
            db.Plans.Add(new LadiPage.Core.Entities.Plan
            {
                Name = "Miễn phí",
                Code = "free",
                Price = 0,
                BillingCycle = "thang",
                MaxPages = 10,
                MaxMembers = 1,
                StorageGb = 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Seed templates mau neu chua co
        if (!await db.Templates.AnyAsync())
        {
            db.Templates.AddRange(
                new LadiPage.Core.Entities.Template
                {
                    Name = "Bán hàng - Flash sale",
                    Category = "Bán hàng",
                    ThumbnailUrl = null,
                    JsonContent = "{\"version\":1,\"blocks\":[{\"type\":\"hero\",\"title\":\"Flash Sale 50%\",\"subtitle\":\"Ưu đãi có hạn trong hôm nay\"}]}",
                    CreatedAt = DateTime.UtcNow
                },
                new LadiPage.Core.Entities.Template
                {
                    Name = "Sự kiện - Webinar",
                    Category = "Sự kiện",
                    ThumbnailUrl = null,
                    JsonContent = "{\"version\":1,\"blocks\":[{\"type\":\"hero\",\"title\":\"Đăng ký Webinar\",\"subtitle\":\"Chia sẻ kiến thức thực chiến\"}]}",
                    CreatedAt = DateTime.UtcNow
                },
                new LadiPage.Core.Entities.Template
                {
                    Name = "Thu lead - Ebook",
                    Category = "Lead",
                    ThumbnailUrl = null,
                    JsonContent = "{\"version\":1,\"blocks\":[{\"type\":\"hero\",\"title\":\"Tải Ebook miễn phí\",\"subtitle\":\"Nhận tài liệu qua email\"}]}",
                    CreatedAt = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// OAuth: redirect to Google/Facebook
app.MapGet("/api/auth/google", (HttpContext ctx, string? redirectUrl) =>
{
    var redirectUri = string.IsNullOrEmpty(redirectUrl) ? "/api/auth/external-done" : $"/api/auth/external-done?redirectUrl={Uri.EscapeDataString(redirectUrl)}";
    var props = new AuthenticationProperties { RedirectUri = redirectUri };
    return Results.Challenge(props, new[] { GoogleDefaults.AuthenticationScheme });
}).AllowAnonymous();

app.MapGet("/api/auth/facebook", (HttpContext ctx, string? redirectUrl) =>
{
    var redirectUri = string.IsNullOrEmpty(redirectUrl) ? "/api/auth/external-done" : $"/api/auth/external-done?redirectUrl={Uri.EscapeDataString(redirectUrl)}";
    var props = new AuthenticationProperties { RedirectUri = redirectUri };
    return Results.Challenge(props, new[] { FacebookDefaults.AuthenticationScheme });
}).AllowAnonymous();

// OAuth callback: read external user, issue JWT, redirect to frontend
app.MapGet("/api/auth/external-done", async (
    HttpContext ctx,
    IAuthService authService,
    LadiPage.Infrastructure.Data.AppDbContext db,
    IConfiguration config,
    string? redirectUrl) =>
{
    var result = await ctx.AuthenticateAsync("ExternalCookie");
    if (!result.Succeeded || result.Principal == null)
        return Results.Redirect($"{frontendBaseUrl}/login?error=external_signin_failed");

    var provider = result.Properties?.Items.TryGetValue(".AuthScheme", out var scheme) == true ? scheme : null;

    var email = result.Principal.FindFirstValue(ClaimTypes.Email)
        ?? result.Principal.FindFirstValue("email")
        ?? result.Principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
    var name = result.Principal.FindFirstValue(ClaimTypes.Name)
        ?? result.Principal.FindFirstValue("name")
        ?? email?.Split('@')[0] ?? "User";

    if (string.IsNullOrEmpty(email))
        return Results.Redirect($"{frontendBaseUrl}/login?error=no_email");

    // Neu user da ton tai -> login thang. Neu chua -> chuyen sang trang dang ky bo sung thong tin.
    var exists = await db.Users.AsNoTracking().AnyAsync(u => u.Email == email, ctx.RequestAborted);
    if (exists)
    {
        var tokens = await authService.LoginOrRegisterExternalAsync(
            email, name,
            ctx.Connection.RemoteIpAddress?.ToString(),
            ctx.Request.Headers.UserAgent);
        if (tokens == null)
            return Results.Redirect($"{frontendBaseUrl}/login?error=account_disabled");

        await ctx.SignOutAsync("ExternalCookie");

        var baseUrl = config["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var callbackUrl = $"{baseUrl.TrimEnd('/')}/auth/callback"
            + $"?accessToken={Uri.EscapeDataString(tokens.AccessToken)}"
            + $"&refreshToken={Uri.EscapeDataString(tokens.RefreshToken)}"
            + $"&expiresAt={Uri.EscapeDataString(tokens.ExpiresAt.ToString("O"))}";
        return Results.Redirect(callbackUrl);
    }

    // Create short-lived token to carry external identity to frontend registration form
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var now = DateTime.UtcNow;
    var extRegToken = tokenHandler.WriteToken(new JwtSecurityToken(
        issuer: externalRegIssuer,
        audience: externalRegAudience,
        claims: new[]
        {
            new Claim("typ","external_reg"),
            new Claim("email", email),
            new Claim("name", name),
            new Claim("provider", provider ?? "external")
        },
        notBefore: now,
        expires: now.AddMinutes(10),
        signingCredentials: creds
    ));

    await ctx.SignOutAsync("ExternalCookie");

    var regUrl = $"{frontendBaseUrl.TrimEnd('/')}/auth/external-register"
        + $"?token={Uri.EscapeDataString(extRegToken)}";
    return Results.Redirect(regUrl);
}).AllowAnonymous();

app.MapPost("/api/auth/external-register", async (
    ExternalRegisterRequest req,
    LadiPage.Infrastructure.Data.AppDbContext db,
    IAuthService authService) =>
{
    try
    {
        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(req.Token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = externalRegIssuer,
            ValidateAudience = true,
            ValidAudience = externalRegAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(10)
        }, out _);

        if (principal.FindFirstValue("typ") != "external_reg")
            return Results.BadRequest(new { error = "Invalid token type." });

        var email = principal.FindFirstValue("email")
            ?? principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
        var name = principal.FindFirstValue("name")
            ?? principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")
            ?? email?.Split('@')[0]
            ?? "User";
        if (string.IsNullOrWhiteSpace(email))
            return Results.BadRequest(new { error = "Missing email." });

        var existing = await db.Users.AsNoTracking().AnyAsync(u => u.Email == email);
        var tokens = await authService.LoginOrRegisterExternalAsync(email, name);
        if (tokens == null)
            return Results.BadRequest(new { error = "Account disabled." });

        if (!existing)
        {
            var user = await db.Users.FirstAsync(u => u.Email == email);
            if (!string.IsNullOrWhiteSpace(req.Phone))
                user.Phone = req.Phone.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            var ws = await db.Workspaces.FirstOrDefaultAsync(w => w.OwnerId == user.Id && w.IsDefault);
            if (ws != null && !string.IsNullOrWhiteSpace(req.WorkspaceName))
            {
                ws.Name = req.WorkspaceName.Trim();
                ws.UpdatedAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();
        }

        return Results.Ok(tokens);
    }
    catch (SecurityTokenException)
    {
        return Results.BadRequest(new { error = "Token hết hạn hoặc không hợp lệ." });
    }
}).AllowAnonymous();

// Editor Tools endpoints
app.MapGet("/api/editor-tools", async (LadiPage.Infrastructure.Data.AppDbContext db) =>
{
    var categories = await db.ToolCategories
        .Where(c => c.IsActive)
        .OrderBy(c => c.Order)
        .Select(c => new
        {
            id = c.Id,
            name = c.Name,
            icon = c.Icon,
            order = c.Order,
            items = c.Items
                .Where(i => i.IsActive)
                .OrderBy(i => i.Order)
                .Select(i => new
                {
                    id = i.Id,
                    name = i.Name,
                    icon = i.Icon,
                    elementType = i.ElementType,
                    order = i.Order,
                    hasSubTabs = i.HasSubTabs,
                    subTabs = i.SubTabsJson,
                    presets = i.Presets
                        .OrderBy(p => p.Order)
                        .Select(p => new
                        {
                            id = p.Id,
                            name = p.Name,
                            tabName = p.TabName,
                            defaultContent = p.DefaultContent,
                            stylesJson = p.StylesJson,
                            defaultWidth = p.DefaultWidth,
                            defaultHeight = p.DefaultHeight,
                            order = p.Order
                        }).ToList()
                }).ToList()
        }).ToListAsync();

    return Results.Ok(categories);
}).AllowAnonymous();

// Auth endpoints
app.MapPost("/api/auth/register", async (RegisterRequest req, IMediator mediator, IHttpClientFactory httpFactory, IConfiguration config) =>
{
    try
    {
        var recaptchaSecret = config["Recaptcha:SecretKey"];
        if (!string.IsNullOrEmpty(recaptchaSecret) && !string.IsNullOrEmpty(req.RecaptchaToken))
        {
            using var client = httpFactory.CreateClient();
            var verify = await client.PostAsync(
                "https://www.google.com/recaptcha/api/siteverify",
                new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string?, string?>("secret", recaptchaSecret),
                    new KeyValuePair<string?, string?>("response", req.RecaptchaToken)
                }));
            var json = await verify.Content.ReadFromJsonAsync<RecaptchaResponse>();
            if (json?.Success != true)
                return Results.BadRequest(new { error = "Xác thực reCAPTCHA không thành công." });
        }
        var result = await mediator.Send(new RegisterCommand(req.Email, req.Password, req.FullName, req.Phone, req.RecaptchaToken));
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex) when (ex.Message.Contains("already registered"))
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(ex.Errors);
    }
});

app.MapPost("/api/auth/login", async (LoginRequest req, IMediator mediator, HttpContext ctx) =>
{
    var cmd = new LoginCommand(req.Email, req.Password,
        ctx.Connection.RemoteIpAddress?.ToString(),
        ctx.Request.Headers.UserAgent);
    var result = await mediator.Send(cmd);
    if (result == null)
        return Results.Unauthorized();
    return Results.Ok(result);
}).WithName("Login");

app.MapPost("/api/auth/refresh", async (RefreshTokenRequest req, IMediator mediator) =>
{
    var result = await mediator.Send(new RefreshTokenCommand(req.RefreshToken));
    if (result == null)
        return Results.Unauthorized();
    return Results.Ok(result);
});

app.MapPost("/api/auth/revoke", async (RevokeTokenRequest req, IMediator mediator) =>
{
    var ok = await mediator.Send(new RevokeTokenCommand(req.RefreshToken));
    return ok ? Results.Ok() : Results.NotFound();
}).RequireAuthorization();

app.MapGet("/api/auth/me", async (IMediator mediator) =>
{
    var result = await mediator.Send(new GetProfileQuery());
    if (result == null)
        return Results.Unauthorized();
    return Results.Ok(result);
}).RequireAuthorization();

// Workspace endpoints
app.MapGet("/api/workspaces", async (IMediator mediator) =>
{
    var list = await mediator.Send(new GetWorkspacesQuery());
    return Results.Ok(list);
}).RequireAuthorization();

app.MapGet("/api/workspaces/{id:long}", async (long id, IMediator mediator) =>
{
    var w = await mediator.Send(new GetWorkspaceByIdQuery(id));
    if (w == null)
        return Results.NotFound();
    return Results.Ok(w);
}).RequireAuthorization();

app.MapPost("/api/workspaces", async (CreateWorkspaceRequest req, IMediator mediator) =>
{
    try
    {
        var result = await mediator.Send(new CreateWorkspaceCommand(req.Name, req.Slug));
        return Results.Created($"/api/workspaces/{result.Id}", result);
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Unauthorized();
    }
    catch (InvalidOperationException ex) when (ex.Message.Contains("Slug"))
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(ex.Errors);
    }
}).RequireAuthorization();

// Templates endpoints
app.MapGet("/api/templates", async (string? category, IMediator mediator) =>
{
    var list = await mediator.Send(new GetTemplatesQuery(category));
    return Results.Ok(list);
}).RequireAuthorization();

app.MapGet("/api/templates/{id:long}", async (long id, IMediator mediator) =>
{
    var tpl = await mediator.Send(new GetTemplateByIdQuery(id));
    return tpl == null ? Results.NotFound() : Results.Ok(tpl);
}).RequireAuthorization();

// Pages endpoints
app.MapGet("/api/pages", async (long workspaceId, IMediator mediator) =>
{
    var list = await mediator.Send(new GetPagesQuery(workspaceId));
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/api/pages", async (CreatePageRequest req, IMediator mediator) =>
{
    try
    {
        var created = await mediator.Send(new CreatePageCommand(req.WorkspaceId, req.Name, req.Slug, req.TemplateId));
        return Results.Ok(created);
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(ex.Errors);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization();

app.MapPost("/api/pages/{id:long}/publish", async (long id, IMediator mediator) =>
{
    var ok = await mediator.Send(new PublishPageCommand(id));
    return ok ? Results.Ok(new { ok = true }) : Results.NotFound();
}).RequireAuthorization();

app.MapGet("/api/pages/{id:long}/content", async (long id, IMediator mediator) =>
{
    var content = await mediator.Send(new GetPageContentQuery(id));
    return content is null ? Results.NotFound() : Results.Ok(content);
}).RequireAuthorization();

app.MapPut("/api/pages/{id:long}/content", async (long id, PageContentDto body, IMediator mediator) =>
{
    var ok = await mediator.Send(new UpdatePageContentCommand(id, body));
    return ok ? Results.Ok(new { ok = true }) : Results.NotFound();
}).RequireAuthorization();

app.MapPut("/api/pages/{id:long}", async (long id, UpdatePageRequest req, IMediator mediator) =>
{
    var result = await mediator.Send(new UpdatePageCommand(id, req.Name, req.Slug));
    return result != null ? Results.Ok(result) : Results.NotFound();
}).RequireAuthorization();

app.MapDelete("/api/pages/{id:long}", async (long id, IMediator mediator) =>
{
    var ok = await mediator.Send(new DeletePageCommand(id));
    return ok ? Results.Ok(new { ok = true }) : Results.NotFound();
}).RequireAuthorization();

app.MapPost("/api/pages/{id:long}/duplicate", async (long id, IMediator mediator) =>
{
    var result = await mediator.Send(new DuplicatePageCommand(id));
    return result != null ? Results.Ok(result) : Results.NotFound();
}).RequireAuthorization();

app.MapGet("/api/pages/{id:long}/stats", async (long id, IMediator mediator) =>
{
    var result = await mediator.Send(new GetPageStatsQuery(id));
    return result != null ? Results.Ok(result) : Results.NotFound();
}).RequireAuthorization();

// Debug: xem API dang ket noi toi SQL Server nao (giup tranh nham instance -> "khong thay du lieu")
app.MapGet("/api/debug/db", (LadiPage.Infrastructure.Data.AppDbContext db, IConfiguration cfg) =>
{
    var conn = db.Database.GetDbConnection();
    return Results.Ok(new
    {
        dataSource = conn.DataSource,
        database = conn.Database,
        environment = app.Environment.EnvironmentName,
        configured = cfg.GetConnectionString("DefaultConnection") is string cs && !string.IsNullOrWhiteSpace(cs)
    });
}).AllowAnonymous();

app.Run();

// Request DTOs for minimal API binding
public record RegisterRequest(string Email, string Password, string FullName, string? Phone, string? RecaptchaToken);
public record RecaptchaResponse(bool Success);
public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record RevokeTokenRequest(string RefreshToken);
public record CreateWorkspaceRequest(string Name, string Slug);
public record CreatePageRequest(long WorkspaceId, string Name, string Slug, long? TemplateId);
public record UpdatePageRequest(string Name, string Slug);
public record ExternalRegisterRequest(string Token, string? Phone, string? WorkspaceName);
