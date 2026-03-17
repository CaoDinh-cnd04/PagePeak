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
        var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
        if (allowedOrigins != null && allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
        }
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
    .AddCookie("ExternalCookie", options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

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
builder.Services.AddResponseCompression();
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("PlansCache", policy => policy.Expire(TimeSpan.FromMinutes(5)));
    options.AddPolicy("TemplatesCache", policy => policy.Expire(TimeSpan.FromMinutes(2)));
});

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
    [MoTa] NVARCHAR(500) NULL,
    [LoaiThietKe] NVARCHAR(30) NOT NULL DEFAULT 'responsive',
    [NoiBat] BIT NOT NULL DEFAULT 0,
    [SoLuotDung] INT NOT NULL DEFAULT 0,
    [NgayTao] DATETIME2 NOT NULL
  );
  CREATE INDEX [IX_MauGiaoDien_DanhMuc] ON [MauGiaoDien]([DanhMuc]);
END

IF COL_LENGTH('MauGiaoDien','MoTa') IS NULL ALTER TABLE [MauGiaoDien] ADD [MoTa] NVARCHAR(500) NULL;
IF COL_LENGTH('MauGiaoDien','LoaiThietKe') IS NULL ALTER TABLE [MauGiaoDien] ADD [LoaiThietKe] NVARCHAR(30) NOT NULL DEFAULT 'responsive';
IF COL_LENGTH('MauGiaoDien','NoiBat') IS NULL ALTER TABLE [MauGiaoDien] ADD [NoiBat] BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('MauGiaoDien','SoLuotDung') IS NULL ALTER TABLE [MauGiaoDien] ADD [SoLuotDung] INT NOT NULL DEFAULT 0;

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

-- Add email verification columns to NguoiDung
IF COL_LENGTH('NguoiDung','MaXacThucEmail') IS NULL ALTER TABLE [NguoiDung] ADD [MaXacThucEmail] NVARCHAR(200) NULL;
IF COL_LENGTH('NguoiDung','NgayGuiXacThucEmail') IS NULL ALTER TABLE [NguoiDung] ADD [NgayGuiXacThucEmail] DATETIME2 NULL;

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

IF OBJECT_ID(N'TaiNguyen', N'U') IS NULL
BEGIN
  CREATE TABLE [TaiNguyen] (
    [MaTaiNguyen] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaNguoiDung] BIGINT NOT NULL,
    [MaKhongGian] BIGINT NULL,
    [TenFile] NVARCHAR(500) NOT NULL,
    [TenGoc] NVARCHAR(500) NOT NULL,
    [LoaiNoiDung] NVARCHAR(100) NOT NULL DEFAULT 'image/png',
    [KichThuoc] BIGINT NOT NULL DEFAULT 0,
    [ChieuRong] INT NULL,
    [ChieuCao] INT NULL,
    [DuongDan] NVARCHAR(1000) NOT NULL,
    [AnhThuNho] NVARCHAR(1000) NULL,
    [MoTaAlt] NVARCHAR(500) NULL,
    [ThuMuc] NVARCHAR(200) NULL,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_TaiNguyen_NguoiDung] FOREIGN KEY ([MaNguoiDung]) REFERENCES [NguoiDung]([MaNguoiDung]) ON DELETE CASCADE
  );
  CREATE INDEX [IX_TaiNguyen_User_Date] ON [TaiNguyen]([MaNguoiDung], [NgayTao] DESC);
END

IF OBJECT_ID(N'NhanDan', N'U') IS NULL
BEGIN
  CREATE TABLE [NhanDan] (
    [MaNhan] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenNhan] NVARCHAR(100) NOT NULL,
    [MauSac] NVARCHAR(20) NULL,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_NhanDan_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'TenMien', N'U') IS NULL
BEGIN
  CREATE TABLE [TenMien] (
    [MaTenMien] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenMien] NVARCHAR(255) NOT NULL,
    [TrangThai] NVARCHAR(20) NOT NULL DEFAULT 'pending',
    [NgayXacMinh] DATETIME2 NULL,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_TenMien_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'CauHinhForm', N'U') IS NULL
BEGIN
  CREATE TABLE [CauHinhForm] (
    [MaForm] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenForm] NVARCHAR(200) NOT NULL,
    [TruongDuLieuJson] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    [WebhookUrl] NVARCHAR(500) NULL,
    [ThongBaoEmail] BIT NOT NULL DEFAULT 0,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_CauHinhForm_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'ThongBao', N'U') IS NULL
BEGIN
  CREATE TABLE [ThongBao] (
    [MaThongBao] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaNguoiDung] BIGINT NOT NULL,
    [TieuDe] NVARCHAR(200) NOT NULL,
    [NoiDung] NVARCHAR(1000) NOT NULL,
    [Loai] NVARCHAR(20) NOT NULL DEFAULT 'info',
    [DaDoc] BIT NOT NULL DEFAULT 0,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_ThongBao_NguoiDung] FOREIGN KEY ([MaNguoiDung]) REFERENCES [NguoiDung]([MaNguoiDung]) ON DELETE CASCADE
  );
END
IF COL_LENGTH('ThongBao','Loai') IS NULL ALTER TABLE [ThongBao] ADD [Loai] NVARCHAR(20) NOT NULL DEFAULT 'info';

IF OBJECT_ID(N'SanPham', N'U') IS NULL
BEGIN
  CREATE TABLE [SanPham] (
    [MaSanPham] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenSanPham] NVARCHAR(300) NOT NULL,
    [GiaTien] DECIMAL(12,2) NOT NULL DEFAULT 0,
    [MoTa] NVARCHAR(MAX) NULL,
    [AnhSanPham] NVARCHAR(500) NULL,
    [DanhMuc] NVARCHAR(100) NULL,
    [TonKho] INT NOT NULL DEFAULT 0,
    [TrangThai] NVARCHAR(20) NOT NULL DEFAULT 'active',
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_SanPham_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'DonHang', N'U') IS NULL
BEGIN
  CREATE TABLE [DonHang] (
    [MaDonHang] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenKhachHang] NVARCHAR(200) NOT NULL,
    [Email] NVARCHAR(255) NULL,
    [SoDienThoai] NVARCHAR(20) NULL,
    [MaSanPham] BIGINT NULL,
    [TongTien] DECIMAL(12,2) NOT NULL DEFAULT 0,
    [TrangThai] NVARCHAR(20) NOT NULL DEFAULT 'pending',
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_DonHang_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'KhachHang', N'U') IS NULL
BEGIN
  CREATE TABLE [KhachHang] (
    [MaKhachHang] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [TenKhachHang] NVARCHAR(200) NOT NULL,
    [Email] NVARCHAR(255) NULL,
    [SoDienThoai] NVARCHAR(20) NULL,
    [NhomKhach] NVARCHAR(100) NULL,
    [NguonKhach] NVARCHAR(100) NULL,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_KhachHang_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END

IF OBJECT_ID(N'DuLieuLead', N'U') IS NULL
BEGIN
  CREATE TABLE [DuLieuLead] (
    [MaLead] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MaKhongGian] BIGINT NOT NULL,
    [MaTrang] BIGINT NULL,
    [MaForm] BIGINT NULL,
    [DuLieuJson] NVARCHAR(MAX) NOT NULL DEFAULT '{{}}',
    [DiaChiIP] NVARCHAR(45) NULL,
    [NgayTao] DATETIME2 NOT NULL,
    CONSTRAINT [FK_DuLieuLead_KhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
  );
END
");

        // Seed editor tools - reseed if preset count is low (updated presets)
        var presetCount = await db.ElementPresets.CountAsync();
        if (!await db.ToolCategories.AnyAsync() || presetCount < 35)
        {
            db.ElementPresets.RemoveRange(await db.ElementPresets.ToListAsync());
            db.ToolItems.RemoveRange(await db.ToolItems.ToListAsync());
            db.ToolCategories.RemoveRange(await db.ToolCategories.ToListAsync());
            await db.SaveChangesAsync();
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
            var tiAntigravity = new LadiPage.Core.Entities.ToolItem { CategoryId = catPhanTu.Id, Name = "Antigravity UI", Icon = "rocket", ElementType = "antigravity", Order = 17, HasSubTabs = false };

            db.ToolItems.AddRange(tiVanBan, tiNutBam, tiAnh, tiGallery, tiHinhHop, tiBieuTuong, tiDuongKe, tiForm, tiSanPhamMau, tiVideo, tiCollectionList, tiCarousel, tiTabs, tiFrame, tiAccordion, tiTable, tiAntigravity);

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

            // Presets for Biểu tượng (icon)
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Ngôi sao", TabName = null, DefaultContent = "★", StylesJson = "{\"color\":\"#f59e0b\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Trái tim", TabName = null, DefaultContent = "❤", StylesJson = "{\"color\":\"#ef4444\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Dấu tick", TabName = null, DefaultContent = "✔", StylesJson = "{\"color\":\"#16a34a\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 3 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Thông tin", TabName = null, DefaultContent = "ℹ", StylesJson = "{\"color\":\"#3b82f6\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 4 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiBieuTuong.Id, Name = "Cảnh báo", TabName = null, DefaultContent = "⚠", StylesJson = "{\"color\":\"#eab308\"}", DefaultWidth = 48, DefaultHeight = 48, Order = 5 }
            );

            // Presets for Ảnh
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh mặc định", TabName = null, DefaultContent = "Image", StylesJson = "{\"borderRadius\":0}", DefaultWidth = 400, DefaultHeight = 260, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh bo góc", TabName = null, DefaultContent = "Image", StylesJson = "{\"borderRadius\":16,\"shadow\":\"0 10px 30px rgba(15,23,42,0.21)\"}", DefaultWidth = 420, DefaultHeight = 280, Order = 2 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiAnh.Id, Name = "Ảnh avatar tròn", TabName = null, DefaultContent = "Avatar", StylesJson = "{\"borderRadius\":9999}", DefaultWidth = 160, DefaultHeight = 160, Order = 3 }
            );

            // Presets for Video
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVideo.Id, Name = "Video 16:9", TabName = null, DefaultContent = "https://www.youtube.com/embed/dQw4w9WgXcQ", StylesJson = "{\"borderRadius\":12}", DefaultWidth = 560, DefaultHeight = 315, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiVideo.Id, Name = "Video 4:3", TabName = null, DefaultContent = "https://www.youtube.com/embed/jNQXAC9IVRw", StylesJson = "{\"borderRadius\":8}", DefaultWidth = 480, DefaultHeight = 360, Order = 2 }
            );

            // Presets for Form
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form 2 trường", TabName = null, DefaultContent = "name,email", StylesJson = "{\"fontSize\":14}", DefaultWidth = 400, DefaultHeight = 260, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiForm.Id, Name = "Form đăng ký", TabName = null, DefaultContent = "name,phone,email", StylesJson = "{\"fontSize\":14}", DefaultWidth = 420, DefaultHeight = 300, Order = 2 }
            );

            // Presets for Sản phẩm mẫu
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiSanPhamMau.Id, Name = "Card sản phẩm", TabName = null, DefaultContent = "Sản phẩm mẫu", StylesJson = "{\"fontSize\":16,\"fontWeight\":600}", DefaultWidth = 260, DefaultHeight = 340, Order = 1 }
            );

            // Presets for tiện ích: Countdown, HTML, Map, Social share, Rating, Progress
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiCountdown.Id, Name = "Đếm ngược mặc định", TabName = null, DefaultContent = "", StylesJson = "{\"fontSize\":24}", DefaultWidth = 320, DefaultHeight = 80, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiHtml.Id, Name = "Khối HTML trống", TabName = null, DefaultContent = "<div>HTML tùy chỉnh</div>", StylesJson = "{}", DefaultWidth = 400, DefaultHeight = 200, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiMap.Id, Name = "Google Maps mặc định", TabName = null, DefaultContent = "10.762622,106.660172", StylesJson = "{}", DefaultWidth = 500, DefaultHeight = 300, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiSocialShare.Id, Name = "Thanh chia sẻ", TabName = null, DefaultContent = "facebook,zalo,linkedin", StylesJson = "{\"fontSize\":14}", DefaultWidth = 260, DefaultHeight = 40, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiRating.Id, Name = "5 sao", TabName = null, DefaultContent = "5", StylesJson = "{\"color\":\"#f59e0b\"}", DefaultWidth = 200, DefaultHeight = 40, Order = 1 },
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiProgress.Id, Name = "Tiến trình 75%", TabName = null, DefaultContent = "75", StylesJson = "{\"backgroundColor\":\"#e2e8f0\"}", DefaultWidth = 400, DefaultHeight = 24, Order = 1 }
            );

            // Presets for Antigravity UI
            db.ElementPresets.AddRange(
                new LadiPage.Core.Entities.ElementPreset { ToolItemId = tiAntigravity.Id, Name = "Antigravity UI", TabName = null, DefaultContent = "Antigravity UI Component", StylesJson = "{}", DefaultWidth = 800, DefaultHeight = 600, Order = 1 }
            );

            await db.SaveChangesAsync();
        }

        if (!await db.Plans.AnyAsync())
        {
            db.Plans.AddRange(
                new LadiPage.Core.Entities.Plan { Name = "Miễn phí", Code = "free", Price = 0, BillingCycle = "thang", MaxPages = 10, MaxMembers = 1, StorageGb = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Core.Entities.Plan { Name = "Pro", Code = "pro", Price = 299000, BillingCycle = "thang", MaxPages = 100, MaxMembers = 5, MaxPageViews = 100000, StorageGb = 10, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new LadiPage.Core.Entities.Plan { Name = "Enterprise", Code = "enterprise", Price = 999000, BillingCycle = "thang", MaxPages = 9999, MaxMembers = 50, MaxPageViews = 1000000, StorageGb = 100, HasAi = true, HasEcommerce = true, HasAutomation = true, HasAbTest = true, HasCustomDomain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        // Seed sample notifications for every user who has none
        var usersWithoutNotifs = await db.Users.Where(u => !db.Notifications.Any(n => n.UserId == u.Id)).Select(u => u.Id).ToListAsync();
        foreach (var uid in usersWithoutNotifs)
        {
            db.Notifications.AddRange(
                new LadiPage.Core.Entities.Notification { UserId = uid, Title = "Chào mừng đến PagePeak!", Message = "Bạn đã đăng ký thành công. Hãy bắt đầu tạo landing page đầu tiên.", Type = "success", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
                new LadiPage.Core.Entities.Notification { UserId = uid, Title = "Hướng dẫn sử dụng", Message = "Xem hướng dẫn tạo landing page chuyên nghiệp trong 5 phút.", Type = "info", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
                new LadiPage.Core.Entities.Notification { UserId = uid, Title = "Mẫu giao diện mới", Message = "30+ mẫu landing page mới đã được thêm vào thư viện.", Type = "info", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
            );
        }
        if (usersWithoutNotifs.Count > 0) await db.SaveChangesAsync();

        // Seed templates mau neu chua co
        if (await db.Templates.CountAsync() < 30)
        {
            db.Templates.RemoveRange(await db.Templates.ToListAsync());
            await db.SaveChangesAsync();

            var tpl = (string name, string cat, string thumb, string desc, bool featured, int usage) =>
                new LadiPage.Core.Entities.Template
                {
                    Name = name, Category = cat, ThumbnailUrl = thumb,
                    Description = desc, IsFeatured = featured, UsageCount = usage,
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
                tpl("Black Friday Sale", "Thương mại điện tử", "https://images.unsplash.com/photo-1573855619003-97b4799dcd8b?w=600&h=400&fit=crop", "Template giảm giá Black Friday hoành tráng", true, 15600),
                tpl("Thực phẩm sạch - Organic", "Thương mại điện tử", "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop", "Landing page thực phẩm organic, healthy", false, 4150),
                tpl("Đồ handmade - Craft", "Thương mại điện tử", "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop", "Giao diện bán đồ thủ công mỹ nghệ", false, 2900),

                // Dịch vụ
                tpl("Dịch vụ tư vấn tài chính", "Dịch vụ", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop", "Landing page tư vấn đầu tư, bảo hiểm", true, 7640),
                tpl("Spa & Massage", "Dịch vụ", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop", "Giao diện spa thư giãn sang trọng", false, 6120),
                tpl("Dịch vụ vận chuyển", "Dịch vụ", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop", "Landing page logistics, giao hàng nhanh", false, 3890),
                tpl("Studio chụp ảnh cưới", "Dịch vụ", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop", "Giao diện studio ảnh cưới lãng mạn", true, 8900),
                tpl("Dịch vụ sửa chữa nhà", "Dịch vụ", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop", "Landing page dịch vụ sửa nhà, nội thất", false, 2340),
                tpl("Agency Marketing", "Dịch vụ", "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop", "Giao diện agency digital marketing", true, 11200),

                // Giáo dục
                tpl("Khóa học Online", "Giáo dục", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop", "Landing page khóa học trực tuyến chuyên nghiệp", true, 14500),
                tpl("Trung tâm tiếng Anh", "Giáo dục", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop", "Landing page trung tâm ngoại ngữ", false, 5670),
                tpl("Tuyển sinh đại học", "Giáo dục", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop", "Giao diện tuyển sinh, xét tuyển 2025", false, 4200),
                tpl("Workshop kỹ năng", "Giáo dục", "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop", "Landing page workshop, khoá học ngắn hạn", false, 3450),

                // Sự kiện
                tpl("Webinar đăng ký", "Sự kiện", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", "Landing page đăng ký webinar chuyên ngành", true, 10200),
                tpl("Hội nghị thượng đỉnh", "Sự kiện", "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop", "Giao diện hội nghị, summit doanh nghiệp", false, 6780),
                tpl("Music Festival", "Sự kiện", "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop", "Landing page sự kiện âm nhạc sôi động", true, 7890),
                tpl("Sự kiện ra mắt sản phẩm", "Sự kiện", "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop", "Giao diện launch event hoành tráng", false, 5430),

                // Bất động sản
                tpl("Dự án căn hộ cao cấp", "Bất động sản", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop", "Landing page bất động sản hạng sang", true, 13400),
                tpl("Biệt thự nghỉ dưỡng", "Bất động sản", "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop", "Giao diện biệt thự, resort cao cấp", false, 6200),
                tpl("Chung cư mini", "Bất động sản", "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop", "Landing page dự án chung cư tầm trung", false, 4500),
                tpl("Đất nền dự án", "Bất động sản", "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop", "Giao diện bán đất nền, phân lô", false, 3100),

                // Sức khỏe
                tpl("Fitness & Gym", "Sức khỏe", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop", "Landing page phòng gym, PT cá nhân", true, 9300),
                tpl("Phòng khám nha khoa", "Sức khỏe", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop", "Giao diện phòng khám răng hiện đại", false, 4800),
                tpl("Thực phẩm chức năng", "Sức khỏe", "https://images.unsplash.com/photo-1505576399279-0d309eed513e?w=600&h=400&fit=crop", "Landing page TPCN, vitamin, bổ sung", false, 5600),
                tpl("Yoga & Thiền", "Sức khỏe", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop", "Giao diện lớp yoga, thiền định online", false, 3700),

                // Nhà hàng & F&B
                tpl("Nhà hàng - Restaurant", "Nhà hàng", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop", "Landing page nhà hàng sang trọng", true, 8700),
                tpl("Quán cà phê", "Nhà hàng", "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop", "Giao diện quán café phong cách", false, 6300),
                tpl("Đặt đồ ăn Online", "Nhà hàng", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop", "Landing page order food delivery", false, 4100),
                tpl("Tiệm bánh - Bakery", "Nhà hàng", "https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=600&h=400&fit=crop", "Giao diện tiệm bánh ngọt đẹp mắt", false, 3500),

                // Công nghệ
                tpl("SaaS Landing Page", "Công nghệ", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop", "Landing page sản phẩm SaaS chuyên nghiệp", true, 16200),
                tpl("App Mobile Download", "Công nghệ", "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop", "Giao diện giới thiệu ứng dụng mobile", true, 11800),
                tpl("Startup - Pitch", "Công nghệ", "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop", "Landing page startup gọi vốn đầu tư", false, 7400),

                // Tiện ích
                tpl("Coming Soon", "Tiện ích", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop", "Trang sắp ra mắt với đếm ngược", false, 8900),
                tpl("Thank You Page", "Tiện ích", "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?w=600&h=400&fit=crop", "Trang cảm ơn sau chuyển đổi", false, 7200),
                tpl("Thu Lead - Ebook", "Tiện ích", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=400&fit=crop", "Landing page tải ebook miễn phí", true, 10500),
                tpl("Đăng ký tư vấn", "Tiện ích", "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop", "Landing page form đăng ký tư vấn", false, 6800)
            );
            await db.SaveChangesAsync();
        }
    }
}

app.UseResponseCompression();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();

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
        return Results.Ok(new { result.UserId, result.EmailVerificationRequired, message = "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản." });
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
    try
    {
        var cmd = new LoginCommand(req.Email, req.Password,
            ctx.Connection.RemoteIpAddress?.ToString(),
            ctx.Request.Headers.UserAgent);
        var result = await mediator.Send(cmd);
        if (result == null)
            return Results.Unauthorized();
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex) when (ex.Message == "EMAIL_NOT_VERIFIED")
    {
        return Results.Json(new { error = "EMAIL_NOT_VERIFIED", message = "Email chưa được xác thực. Vui lòng kiểm tra hộp thư." }, statusCode: 403);
    }
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

app.MapGet("/api/auth/verify-email", async (string token, IAuthService authService) =>
{
    var ok = await authService.VerifyEmailAsync(token);
    if (!ok) return Results.BadRequest(new { error = "Token không hợp lệ hoặc đã hết hạn." });
    return Results.Ok(new { ok = true, message = "Email đã được xác thực thành công!" });
}).AllowAnonymous();

app.MapPost("/api/auth/resend-verification", async (ResendVerificationRequest req, IAuthService authService) =>
{
    var ok = await authService.ResendVerificationEmailAsync(req.Email);
    return Results.Ok(new { ok, message = ok ? "Email xác thực đã được gửi lại." : "Email không tồn tại hoặc đã được xác thực." });
}).AllowAnonymous();

app.MapGet("/api/auth/me", async (IMediator mediator) =>
{
    var result = await mediator.Send(new GetProfileQuery());
    if (result == null)
        return Results.Unauthorized();
    return Results.Ok(result);
}).RequireAuthorization();

// Profile update
app.MapPut("/api/auth/profile", async (
    UpdateProfileRequest req,
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var user = await db.Users.FindAsync(currentUser.UserId.Value);
    if (user == null) return Results.Unauthorized();

    if (!string.IsNullOrWhiteSpace(req.FullName))
        user.FullName = req.FullName.Trim();
    if (req.Phone != null)
        user.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
    if (req.AvatarUrl != null)
        user.AvatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl.Trim();

    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        id = user.Id,
        email = user.Email,
        fullName = user.FullName,
        phone = user.Phone,
        avatarUrl = user.AvatarUrl,
        role = user.Role,
        currentPlanId = user.CurrentPlanId,
        planExpiresAt = user.PlanExpiresAt
    });
}).RequireAuthorization();

// Change password
app.MapPut("/api/auth/change-password", async (
    ChangePasswordRequest req,
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var user = await db.Users.FindAsync(currentUser.UserId.Value);
    if (user == null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(req?.CurrentPassword))
        return Results.BadRequest(new { error = "Vui lòng nhập mật khẩu hiện tại." });

    if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
        return Results.BadRequest(new { error = "Mật khẩu hiện tại không đúng." });

    if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
        return Results.BadRequest(new { error = "Mật khẩu mới phải có ít nhất 6 ký tự." });

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// Sessions list
app.MapGet("/api/auth/sessions", async (
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var sessions = await db.Sessions
        .Where(s => s.UserId == currentUser.UserId.Value)
        .OrderByDescending(s => s.CreatedAt)
        .Select(s => new
        {
            id = s.Id,
            ipAddress = s.IpAddress,
            userAgent = s.UserAgent,
            createdAt = s.CreatedAt,
            expiresAt = s.ExpiresAt,
            isExpired = s.ExpiresAt < DateTime.UtcNow
        })
        .ToListAsync();
    return Results.Ok(sessions);
}).RequireAuthorization();

// Revoke specific session
app.MapDelete("/api/auth/sessions/{id:long}", async (
    long id,
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var session = await db.Sessions.FirstOrDefaultAsync(
        s => s.Id == id && s.UserId == currentUser.UserId.Value);
    if (session == null) return Results.NotFound();
    db.Sessions.Remove(session);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// Settings: plan info + usage stats
app.MapGet("/api/settings/plan", async (
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var user = await db.Users
        .AsNoTracking()
        .Include(u => u.CurrentPlan)
        .FirstOrDefaultAsync(u => u.Id == currentUser.UserId.Value);
    if (user == null) return Results.Unauthorized();

    var workspaceIds = await db.Workspaces
        .Where(w => w.OwnerId == user.Id)
        .Select(w => w.Id)
        .ToListAsync();

    var totalPages = workspaceIds.Count > 0
        ? await db.Pages.CountAsync(p => workspaceIds.Contains(p.WorkspaceId))
        : 0;
    var publishedPages = workspaceIds.Count > 0
        ? await db.Pages.CountAsync(p => workspaceIds.Contains(p.WorkspaceId) && p.Status == "published")
        : 0;

    var totalMembers = workspaceIds.Count > 0
        ? await db.WorkspaceMembers.CountAsync(m => workspaceIds.Contains(m.WorkspaceId))
        : 0;

    var plan = user.CurrentPlan;
    return Results.Ok(new
    {
        plan = plan == null ? null : new
        {
            id = plan.Id,
            name = plan.Name,
            code = plan.Code,
            price = plan.Price,
            billingCycle = plan.BillingCycle,
            maxPages = plan.MaxPages,
            maxMembers = plan.MaxMembers,
            maxPageViews = plan.MaxPageViews,
            storageGb = plan.StorageGb,
            hasAi = plan.HasAi,
            hasEcommerce = plan.HasEcommerce,
            hasAutomation = plan.HasAutomation,
            hasAbTest = plan.HasAbTest,
            hasCustomDomain = plan.HasCustomDomain
        },
        usage = new
        {
            totalPages,
            publishedPages,
            totalMembers
        },
        planExpiresAt = user.PlanExpiresAt,
        emailConfirmed = user.EmailConfirmed,
        phoneConfirmed = user.PhoneConfirmed,
        createdAt = user.CreatedAt,
        lastLoginAt = user.LastLoginAt,
        referralCode = user.ReferralCode
    });
}).RequireAuthorization();

// Upgrade plan (chế độ test: cho phép nâng cấp trực tiếp không cần thanh toán)
app.MapPost("/api/plans/upgrade", async (
    UpgradePlanRequest req,
    LadiPage.Infrastructure.Data.AppDbContext db,
    ICurrentUser currentUser,
    IConfiguration config) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var allowTestUpgrade = config.GetValue<bool>("AllowTestUpgrade");
    if (!allowTestUpgrade)
        return Results.BadRequest(new { error = "Chức năng nâng cấp đang bảo trì. Vui lòng liên hệ hỗ trợ." });

    var plan = await db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.PlanId && p.IsActive);
    if (plan == null)
        return Results.BadRequest(new { error = "Gói không tồn tại hoặc không khả dụng." });

    var user = await db.Users.FindAsync(currentUser.UserId.Value);
    if (user == null) return Results.Unauthorized();

    user.CurrentPlanId = plan.Id;
    user.PlanExpiresAt = DateTime.UtcNow.AddYears(1); // Test: 1 năm
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { ok = true, planName = plan.Name });
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
app.MapGet("/api/templates", async (string? category, string? search, string? designType, bool? featured, IMediator mediator) =>
{
    var list = await mediator.Send(new GetTemplatesQuery(category, search, designType, featured));
    return Results.Ok(list);
}).RequireAuthorization();

app.MapGet("/api/templates/categories", async (IMediator mediator) =>
{
    var all = await mediator.Send(new GetTemplatesQuery());
    var cats = all.Select(t => t.Category).Distinct().OrderBy(c => c).ToList();
    return Results.Ok(cats);
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
    var result = await mediator.Send(new PublishPageCommand(id));
    if (result.Error == "Page not found") return Results.NotFound();
    return result.Success
        ? Results.Ok(new { ok = true, checks = result.Checks })
        : Results.Json(new { ok = false, error = result.Error, checks = result.Checks }, statusCode: 422);
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

// ===== Media API =====
app.MapPost("/api/media/upload", async (HttpRequest request, IAppDbContext db, IWebHostEnvironment env) =>
{
    var userIdClaim = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    if (!request.HasFormContentType) return Results.BadRequest(new { error = "Form content required" });

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file == null || file.Length == 0) return Results.BadRequest(new { error = "No file uploaded" });

    var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "video/mp4", "video/webm" };
    if (!allowedTypes.Contains(file.ContentType))
        return Results.BadRequest(new { error = $"File type '{file.ContentType}' not allowed" });

    if (file.Length > 10 * 1024 * 1024)
        return Results.BadRequest(new { error = "File too large (max 10MB)" });

    var uploadsDir = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", userId.ToString());
    Directory.CreateDirectory(uploadsDir);

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (string.IsNullOrEmpty(ext)) ext = ".png";
    var fileName = $"{Guid.NewGuid():N}{ext}";
    var filePath = Path.Combine(uploadsDir, fileName);

    await using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var wsId = form.ContainsKey("workspaceId") && long.TryParse(form["workspaceId"], out var wid) ? (long?)wid : null;
    var folder = form.ContainsKey("folder") ? form["folder"].ToString() : null;

    var media = new LadiPage.Core.Entities.Media
    {
        UserId = userId,
        WorkspaceId = wsId,
        FileName = fileName,
        OriginalName = file.FileName,
        ContentType = file.ContentType,
        FileSize = file.Length,
        Url = $"/uploads/{userId}/{fileName}",
        Folder = folder,
        CreatedAt = DateTime.UtcNow,
    };
    db.Medias.Add(media);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        media.Id,
        media.FileName,
        media.OriginalName,
        media.ContentType,
        media.FileSize,
        media.Width,
        media.Height,
        media.Url,
        media.Folder,
        media.CreatedAt,
    });
}).RequireAuthorization().DisableAntiforgery();

app.MapGet("/api/media", async (HttpRequest request, IAppDbContext db, string? folder, int page = 1, int pageSize = 40) =>
{
    var userIdClaim = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var query = db.Medias.Where(m => m.UserId == userId);
    if (!string.IsNullOrEmpty(folder)) query = query.Where(m => m.Folder == folder);

    var total = await query.CountAsync();
    var items = await query
        .OrderByDescending(m => m.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(m => new
        {
            m.Id,
            m.FileName,
            m.OriginalName,
            m.ContentType,
            m.FileSize,
            m.Width,
            m.Height,
            m.Url,
            m.ThumbnailUrl,
            m.AltText,
            m.Folder,
            m.CreatedAt,
        })
        .ToListAsync();

    return Results.Ok(new { total, page, pageSize, items });
}).RequireAuthorization();

app.MapDelete("/api/media/{id:long}", async (long id, HttpRequest request, IAppDbContext db, IWebHostEnvironment env) =>
{
    var userIdClaim = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var media = await db.Medias.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
    if (media == null) return Results.NotFound();

    var filePath = Path.Combine(env.ContentRootPath, "wwwroot", media.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    if (File.Exists(filePath)) File.Delete(filePath);

    db.Medias.Remove(media);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Tags API =====
app.MapGet("/api/tags", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var items = await db.Tags.Where(t => t.WorkspaceId == workspaceId).OrderBy(t => t.Name).Select(t => new { t.Id, t.Name, t.Color, t.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/tags", async (CreateTagRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var tag = new LadiPage.Core.Entities.Tag { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), Color = req.Color, CreatedAt = DateTime.UtcNow };
    db.Tags.Add(tag);
    await db.SaveChangesAsync();
    return Results.Ok(new { tag.Id, tag.Name, tag.Color, tag.CreatedAt });
}).RequireAuthorization();

app.MapPut("/api/tags/{id:long}", async (long id, UpdateTagRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var tag = await db.Tags.FindAsync(id);
    if (tag == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, tag.WorkspaceId)) return Results.NotFound();
    if (!string.IsNullOrWhiteSpace(req.Name)) tag.Name = req.Name.Trim();
    if (req.Color != null) tag.Color = req.Color;
    await db.SaveChangesAsync();
    return Results.Ok(new { tag.Id, tag.Name, tag.Color });
}).RequireAuthorization();

app.MapDelete("/api/tags/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var tag = await db.Tags.FindAsync(id);
    if (tag == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, tag.WorkspaceId)) return Results.NotFound();
    db.Tags.Remove(tag);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Domains API =====
app.MapGet("/api/domains", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var items = await db.Domains.Where(d => d.WorkspaceId == workspaceId).OrderByDescending(d => d.CreatedAt).Select(d => new { d.Id, d.DomainName, d.Status, d.VerifiedAt, d.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/domains", async (CreateDomainRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var domain = new LadiPage.Core.Entities.Domain { WorkspaceId = req.WorkspaceId, DomainName = req.DomainName.Trim().ToLowerInvariant(), Status = "pending", CreatedAt = DateTime.UtcNow };
    db.Domains.Add(domain);
    await db.SaveChangesAsync();
    return Results.Ok(new { domain.Id, domain.DomainName, domain.Status, domain.CreatedAt });
}).RequireAuthorization();

app.MapDelete("/api/domains/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var domain = await db.Domains.FindAsync(id);
    if (domain == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, domain.WorkspaceId)) return Results.NotFound();
    db.Domains.Remove(domain);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Forms API =====
app.MapGet("/api/forms", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var items = await db.FormConfigs.Where(f => f.WorkspaceId == workspaceId).OrderByDescending(f => f.CreatedAt).Select(f => new { f.Id, f.Name, f.FieldsJson, f.WebhookUrl, f.EmailNotify, f.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/forms", async (CreateFormRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var form = new LadiPage.Core.Entities.FormConfig { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), FieldsJson = req.FieldsJson ?? "[]", WebhookUrl = req.WebhookUrl, EmailNotify = req.EmailNotify, CreatedAt = DateTime.UtcNow };
    db.FormConfigs.Add(form);
    await db.SaveChangesAsync();
    return Results.Ok(new { form.Id, form.Name, form.FieldsJson, form.WebhookUrl, form.EmailNotify, form.CreatedAt });
}).RequireAuthorization();

app.MapPut("/api/forms/{id:long}", async (long id, UpdateFormRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var form = await db.FormConfigs.FindAsync(id);
    if (form == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, form.WorkspaceId)) return Results.NotFound();
    if (!string.IsNullOrWhiteSpace(req.Name)) form.Name = req.Name.Trim();
    if (req.FieldsJson != null) form.FieldsJson = req.FieldsJson;
    if (req.WebhookUrl != null) form.WebhookUrl = string.IsNullOrWhiteSpace(req.WebhookUrl) ? null : req.WebhookUrl.Trim();
    form.EmailNotify = req.EmailNotify;
    await db.SaveChangesAsync();
    return Results.Ok(new { form.Id, form.Name, form.FieldsJson, form.WebhookUrl, form.EmailNotify });
}).RequireAuthorization();

app.MapDelete("/api/forms/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var form = await db.FormConfigs.FindAsync(id);
    if (form == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, form.WorkspaceId)) return Results.NotFound();
    db.FormConfigs.Remove(form);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Notifications API =====
app.MapGet("/api/notifications", async (HttpRequest request, IAppDbContext db) =>
{
    var uid = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(uid) || !long.TryParse(uid, out var userId)) return Results.Unauthorized();
    var items = await db.Notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).Take(50).Select(n => new { n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt }).ToListAsync();
    var unread = await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
    return Results.Ok(new { unread, items });
}).RequireAuthorization();

app.MapPut("/api/notifications/{id:long}/read", async (long id, IAppDbContext db, HttpRequest request) =>
{
    var uid = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(uid) || !long.TryParse(uid, out var userId)) return Results.Unauthorized();
    var n = await db.Notifications.FindAsync(id);
    if (n == null) return Results.NotFound();
    if (n.UserId != userId) return Results.NotFound();
    n.IsRead = true;
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

app.MapPut("/api/notifications/mark-all-read", async (HttpRequest request, IAppDbContext db) =>
{
    var uid = request.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(uid) || !long.TryParse(uid, out var userId)) return Results.Unauthorized();
    var unread = await db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
    foreach (var n in unread) n.IsRead = true;
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true, count = unread.Count });
}).RequireAuthorization();

// ===== Products API =====
app.MapGet("/api/products", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var items = await db.Products.Where(p => p.WorkspaceId == workspaceId).OrderByDescending(p => p.CreatedAt).Select(p => new { p.Id, p.Name, p.Price, p.Description, p.ImageUrl, p.Category, p.Stock, p.Status, p.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/products", async (CreateProductRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var product = new LadiPage.Core.Entities.Product { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), Price = req.Price, Description = req.Description, ImageUrl = req.ImageUrl, Category = req.Category, Stock = req.Stock, CreatedAt = DateTime.UtcNow };
    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Ok(new { product.Id, product.Name, product.Price, product.Category, product.Stock, product.Status, product.CreatedAt });
}).RequireAuthorization();

app.MapPut("/api/products/{id:long}", async (long id, UpdateProductRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var p = await db.Products.FindAsync(id);
    if (p == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, p.WorkspaceId)) return Results.NotFound();
    if (!string.IsNullOrWhiteSpace(req.Name)) p.Name = req.Name.Trim();
    if (req.Price.HasValue) p.Price = req.Price.Value;
    if (req.Description != null) p.Description = req.Description;
    if (req.ImageUrl != null) p.ImageUrl = req.ImageUrl;
    if (req.Category != null) p.Category = req.Category;
    if (req.Stock.HasValue) p.Stock = req.Stock.Value;
    if (req.Status != null) p.Status = req.Status;
    await db.SaveChangesAsync();
    return Results.Ok(new { p.Id, p.Name, p.Price, p.Category, p.Stock, p.Status });
}).RequireAuthorization();

app.MapDelete("/api/products/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var p = await db.Products.FindAsync(id);
    if (p == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, p.WorkspaceId)) return Results.NotFound();
    db.Products.Remove(p);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Orders API =====
app.MapGet("/api/orders", async (long workspaceId, string? status, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var query = db.Orders.Where(o => o.WorkspaceId == workspaceId);
    if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
    var items = await query.OrderByDescending(o => o.CreatedAt).Select(o => new { o.Id, o.CustomerName, o.Email, o.Phone, o.ProductId, o.Amount, o.Status, o.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/orders", async (CreateOrderRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var order = new LadiPage.Core.Entities.Order { WorkspaceId = req.WorkspaceId, CustomerName = req.CustomerName.Trim(), Email = req.Email, Phone = req.Phone, ProductId = req.ProductId, Amount = req.Amount, CreatedAt = DateTime.UtcNow };
    db.Orders.Add(order);
    await db.SaveChangesAsync();
    return Results.Ok(new { order.Id, order.CustomerName, order.Amount, order.Status, order.CreatedAt });
}).RequireAuthorization();

app.MapPut("/api/orders/{id:long}", async (long id, UpdateOrderRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var o = await db.Orders.FindAsync(id);
    if (o == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, o.WorkspaceId)) return Results.NotFound();
    if (req.Status != null) o.Status = req.Status;
    if (req.CustomerName != null) o.CustomerName = req.CustomerName.Trim();
    if (req.Email != null) o.Email = req.Email;
    if (req.Phone != null) o.Phone = req.Phone;
    await db.SaveChangesAsync();
    return Results.Ok(new { o.Id, o.CustomerName, o.Status });
}).RequireAuthorization();

app.MapDelete("/api/orders/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var o = await db.Orders.FindAsync(id);
    if (o == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, o.WorkspaceId)) return Results.NotFound();
    db.Orders.Remove(o);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Customers API =====
app.MapGet("/api/customers", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var items = await db.Customers.Where(c => c.WorkspaceId == workspaceId).OrderByDescending(c => c.CreatedAt).Select(c => new { c.Id, c.Name, c.Email, c.Phone, c.Group, c.Source, c.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/customers", async (CreateCustomerRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, req.WorkspaceId)) return Results.NotFound();
    var c = new LadiPage.Core.Entities.Customer { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), Email = req.Email, Phone = req.Phone, Group = req.Group, Source = req.Source, CreatedAt = DateTime.UtcNow };
    db.Customers.Add(c);
    await db.SaveChangesAsync();
    return Results.Ok(new { c.Id, c.Name, c.Email, c.Phone, c.Group, c.Source, c.CreatedAt });
}).RequireAuthorization();

app.MapPut("/api/customers/{id:long}", async (long id, UpdateCustomerRequest req, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var c = await db.Customers.FindAsync(id);
    if (c == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, c.WorkspaceId)) return Results.NotFound();
    if (req.Name != null) c.Name = req.Name.Trim();
    if (req.Email != null) c.Email = req.Email;
    if (req.Phone != null) c.Phone = req.Phone;
    if (req.Group != null) c.Group = req.Group;
    if (req.Source != null) c.Source = req.Source;
    await db.SaveChangesAsync();
    return Results.Ok(new { c.Id, c.Name, c.Email, c.Phone, c.Group, c.Source });
}).RequireAuthorization();

app.MapDelete("/api/customers/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var c = await db.Customers.FindAsync(id);
    if (c == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, c.WorkspaceId)) return Results.NotFound();
    db.Customers.Remove(c);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Leads API =====
app.MapGet("/api/leads", async (long workspaceId, long? pageId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var query = db.Leads.Where(l => l.WorkspaceId == workspaceId);
    if (pageId.HasValue) query = query.Where(l => l.PageId == pageId.Value);
    var items = await query.OrderByDescending(l => l.CreatedAt).Select(l => new { l.Id, l.PageId, l.FormId, l.DataJson, l.IpAddress, l.CreatedAt }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapDelete("/api/leads/{id:long}", async (long id, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    var l = await db.Leads.FindAsync(id);
    if (l == null) return Results.NotFound();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId!.Value, l.WorkspaceId)) return Results.NotFound();
    db.Leads.Remove(l);
    await db.SaveChangesAsync();
    return Results.Ok(new { ok = true });
}).RequireAuthorization();

// ===== Reports API =====
app.MapGet("/api/reports/overview", async (long workspaceId, IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess) =>
{
    if (currentUser.UserId == null) return Results.Unauthorized();
    if (!await workspaceAccess.CanAccessWorkspaceAsync(currentUser.UserId.Value, workspaceId)) return Results.NotFound();
    var totalPages = await db.Pages.CountAsync(p => p.WorkspaceId == workspaceId);
    var publishedPages = await db.Pages.CountAsync(p => p.WorkspaceId == workspaceId && p.Status == "published");
    var draftPages = totalPages - publishedPages;
    var totalSections = await db.PageSections.CountAsync(s => db.Pages.Any(p => p.Id == s.PageId && p.WorkspaceId == workspaceId));
    var totalElements = await db.PageElements.CountAsync(e => db.PageSections.Any(s => s.Id == e.SectionId && db.Pages.Any(p => p.Id == s.PageId && p.WorkspaceId == workspaceId)));
    var totalProducts = await db.Products.CountAsync(p => p.WorkspaceId == workspaceId);
    var totalOrders = await db.Orders.CountAsync(o => o.WorkspaceId == workspaceId);
    var totalCustomers = await db.Customers.CountAsync(c => c.WorkspaceId == workspaceId);
    var totalLeads = await db.Leads.CountAsync(l => l.WorkspaceId == workspaceId);
    return Results.Ok(new { totalPages, publishedPages, draftPages, totalSections, totalElements, totalProducts, totalOrders, totalCustomers, totalLeads });
}).RequireAuthorization();

// ===== Plans API (for public pricing page) - cached 5 min =====
app.MapGet("/api/plans", async (IAppDbContext db) =>
{
    var plans = await db.Plans.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.Price).Select(p => new { p.Id, p.Name, p.Code, p.Price, p.BillingCycle, p.MaxPages, p.MaxMembers, p.MaxPageViews, p.StorageGb, p.HasAi, p.HasEcommerce, p.HasAutomation, p.HasAbTest, p.HasCustomDomain }).ToListAsync();
    return Results.Ok(plans);
}).AllowAnonymous().CacheOutput("PlansCache");

// Section templates API - cached 2 phút
app.MapGet("/api/section-templates", async (IAppDbContext db) =>
{
    var templates = await db.Templates
        .AsNoTracking()
        .Where(t => t.Category == "section")
        .OrderByDescending(t => t.CreatedAt)
        .Select(t => new { t.Id, t.Name, t.ThumbnailUrl, t.JsonContent })
        .ToListAsync();
    return Results.Ok(templates);
}).AllowAnonymous().CacheOutput("TemplatesCache");

app.MapPost("/api/section-templates", async (SectionTemplateCreateDto dto, IAppDbContext db) =>
{
    var template = new LadiPage.Core.Entities.Template
    {
        Name = dto.Name,
        Category = "section",
        ThumbnailUrl = dto.PreviewUrl,
        JsonContent = dto.JsonContent,
        CreatedAt = DateTime.UtcNow,
    };
    db.Templates.Add(template);
    await ((LadiPage.Infrastructure.Data.AppDbContext)db).SaveChangesAsync();
    return Results.Created($"/api/section-templates/{template.Id}", new { template.Id, template.Name });
}).RequireAuthorization();

// Fonts API
app.MapGet("/api/fonts", () =>
{
    var fonts = new[]
    {
        "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito",
        "Raleway", "Ubuntu", "Playfair Display", "Merriweather", "Source Sans 3",
        "Oswald", "Noto Sans", "PT Sans", "Roboto Condensed", "Roboto Slab",
        "Quicksand", "Work Sans", "Mulish", "Barlow", "DM Sans", "Rubik",
        "Manrope", "Karla", "Josefin Sans", "Libre Baskerville", "Space Grotesk",
        "Cabin", "Arimo", "Overpass", "Assistant", "Bitter", "Crimson Text",
        "Exo 2", "Fira Sans", "Heebo", "Inconsolata", "Kanit", "Lexend",
        "Libre Franklin", "Maven Pro", "Mukta", "Noto Serif", "Outfit",
        "Plus Jakarta Sans", "Prompt", "Public Sans", "Red Hat Display",
        "Signika", "Titillium Web", "Varela Round", "Yanone Kaffeesatz",
        "Abel", "Archivo", "Asap", "Bebas Neue", "Catamaran", "Comfortaa",
        "Cormorant Garamond", "Dancing Script", "EB Garamond", "Figtree",
        "Geologica", "Great Vibes", "Hind", "IBM Plex Sans", "Inter Tight",
        "Jost", "Kalam", "Lilita One", "Lobster", "Lora", "Nanum Gothic",
        "Nunito Sans", "Pacifico", "Patrick Hand", "Philosopher", "PT Serif",
        "Righteous", "Roboto Mono", "Saira", "Satisfy", "Sora", "Space Mono",
        "Spectral", "Teko", "Ubuntu Mono", "Urbanist", "Vollkorn", "Yantramanav",
        "Zilla Slab", "Abril Fatface", "Alegreya", "Amatic SC", "Archivo Narrow",
        "Barlow Condensed", "Be Vietnam Pro", "Cairo", "Chakra Petch",
        "Cinzel", "Courgette", "Domine", "Dosis", "Encode Sans",
        "Fira Code", "Fredoka", "Gloria Hallelujah", "Gudea",
    };
    return Results.Ok(fonts);
}).AllowAnonymous();

app.UseStaticFiles();

app.Run();

record SectionTemplateCreateDto(string Name, string JsonContent, string? PreviewUrl);

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
public record UpdateProfileRequest(string? FullName, string? Phone, string? AvatarUrl);
public record UpgradePlanRequest([property: System.Text.Json.Serialization.JsonPropertyName("planId")] int PlanId);
public record ChangePasswordRequest(
    [property: System.Text.Json.Serialization.JsonPropertyName("currentPassword")] string CurrentPassword,
    [property: System.Text.Json.Serialization.JsonPropertyName("newPassword")] string NewPassword);
public record ResendVerificationRequest(string Email);
public record CreateTagRequest(long WorkspaceId, string Name, string? Color);
public record UpdateTagRequest(string? Name, string? Color);
public record CreateDomainRequest(long WorkspaceId, string DomainName);
public record CreateFormRequest(long WorkspaceId, string Name, string? FieldsJson, string? WebhookUrl, bool EmailNotify);
public record UpdateFormRequest(string? Name, string? FieldsJson, string? WebhookUrl, bool EmailNotify);
public record CreateProductRequest(long WorkspaceId, string Name, decimal Price, string? Description, string? ImageUrl, string? Category, int Stock);
public record UpdateProductRequest(string? Name, decimal? Price, string? Description, string? ImageUrl, string? Category, int? Stock, string? Status);
public record CreateOrderRequest(long WorkspaceId, string CustomerName, string? Email, string? Phone, long? ProductId, decimal Amount);
public record UpdateOrderRequest(string? CustomerName, string? Email, string? Phone, string? Status);
public record CreateCustomerRequest(long WorkspaceId, string Name, string? Email, string? Phone, string? Group, string? Source);
public record UpdateCustomerRequest(string? Name, string? Email, string? Phone, string? Group, string? Source);
