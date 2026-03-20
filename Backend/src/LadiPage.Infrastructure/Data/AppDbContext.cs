using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Infrastructure.Data;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Plan> Plans { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<PlanSubscription> PlanSubscriptions { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<WorkspaceMember> WorkspaceMembers { get; set; }
    public DbSet<Template> Templates { get; set; }
    public DbSet<Page> Pages { get; set; }
    public DbSet<PageSection> PageSections { get; set; }
    public DbSet<PageElement> PageElements { get; set; }
    public DbSet<ToolCategory> ToolCategories { get; set; }
    public DbSet<ToolItem> ToolItems { get; set; }
    public DbSet<ElementPreset> ElementPresets { get; set; }
    public DbSet<Media> Medias { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<CustomDomain> Domains { get; set; }
    public DbSet<FormConfig> FormConfigs { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Lead> Leads { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Plan -> GoiDichVu
        modelBuilder.Entity<Plan>(e =>
        {
            e.ToTable("GoiDichVu");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaGoi");
            e.Property(x => x.Name).HasColumnName("TenGoi").HasMaxLength(100);
            e.Property(x => x.Code).HasColumnName("MaCode").HasMaxLength(50);
            e.Property(x => x.Price).HasColumnName("GiaTien").HasPrecision(12, 2);
            e.Property(x => x.BillingCycle).HasColumnName("ChuKyThanhToan").HasMaxLength(20);
            e.Property(x => x.MaxPages).HasColumnName("SoTrangToiDa");
            e.Property(x => x.MaxMembers).HasColumnName("SoThanhVienToiDa");
            e.Property(x => x.MaxPageViews).HasColumnName("SoLuotTruyCapToiDa");
            e.Property(x => x.StorageGb).HasColumnName("DungLuongGB").HasPrecision(6, 2);
            e.Property(x => x.HasAi).HasColumnName("CoAI");
            e.Property(x => x.HasEcommerce).HasColumnName("CoBanHang");
            e.Property(x => x.HasAutomation).HasColumnName("CoTuDongHoa");
            e.Property(x => x.HasAbTest).HasColumnName("CoABTest");
            e.Property(x => x.HasCustomDomain).HasColumnName("CoTenMienRieng");
            e.Property(x => x.IsActive).HasColumnName("DangHoatDong");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
        });

        // User -> NguoiDung
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("NguoiDung");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaNguoiDung");
            e.Property(x => x.Email).HasColumnName("Email").HasMaxLength(255);
            e.Property(x => x.PasswordHash).HasColumnName("MatKhauMaHoa").HasMaxLength(512);
            e.Property(x => x.FullName).HasColumnName("HoTen").HasMaxLength(200);
            e.Property(x => x.Phone).HasColumnName("SoDienThoai").HasMaxLength(20);
            e.Property(x => x.AvatarUrl).HasColumnName("AnhDaiDien").HasMaxLength(500);
            e.Property(x => x.Role).HasColumnName("VaiTro").HasMaxLength(20);
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.EmailConfirmed).HasColumnName("EmailDaXacNhan");
            e.Property(x => x.EmailVerificationToken).HasColumnName("MaXacThucEmail").HasMaxLength(200);
            e.Property(x => x.EmailVerificationSentAt).HasColumnName("NgayGuiXacThucEmail");
            e.Property(x => x.PhoneConfirmed).HasColumnName("SdtDaXacNhan");
            e.Property(x => x.CurrentPlanId).HasColumnName("MaGoiHienTai");
            e.Property(x => x.PlanExpiresAt).HasColumnName("NgayHetHanGoi");
            e.Property(x => x.ReferralCode).HasColumnName("MaGioiThieu").HasMaxLength(50);
            e.Property(x => x.ReferredByUserId).HasColumnName("DuocGioiThieuBoi");
            e.Property(x => x.LastLoginAt).HasColumnName("LanDangNhapCuoi");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            e.HasOne(x => x.CurrentPlan).WithMany().HasForeignKey(x => x.CurrentPlanId);
        });

        // Session -> PhienDangNhap
        modelBuilder.Entity<Session>(e =>
        {
            e.ToTable("PhienDangNhap");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaPhien");
            e.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            e.Property(x => x.Token).HasColumnName("Token").HasMaxLength(512);
            e.Property(x => x.RefreshToken).HasColumnName("TokenLamMoi").HasMaxLength(512);
            e.Property(x => x.IpAddress).HasColumnName("DiaChiIP").HasMaxLength(45);
            e.Property(x => x.UserAgent).HasColumnName("ThongTinTrinh").HasMaxLength(500);
            e.Property(x => x.ExpiresAt).HasColumnName("NgayHetHan");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // PlanSubscription -> DangKyGoi
        modelBuilder.Entity<PlanSubscription>(e =>
        {
            e.ToTable("DangKyGoi");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaDangKy");
            e.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            e.Property(x => x.PlanId).HasColumnName("MaGoi");
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.StartDate).HasColumnName("NgayBatDau");
            e.Property(x => x.EndDate).HasColumnName("NgayKetThuc");
            e.Property(x => x.AutoRenew).HasColumnName("TuDongGiaHan");
            e.Property(x => x.PaymentMethod).HasColumnName("PhuongThucThanhToan").HasMaxLength(50);
            e.Property(x => x.TransactionId).HasColumnName("MaGiaoDich").HasMaxLength(200);
            e.Property(x => x.AmountPaid).HasColumnName("SoTienDaThanhToan").HasPrecision(12, 2);
            e.Property(x => x.Currency).HasColumnName("DonViTien").HasMaxLength(10);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId);
        });

        // Workspace -> KhongGianLamViec
        modelBuilder.Entity<Workspace>(e =>
        {
            e.ToTable("KhongGianLamViec");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaKhongGian");
            e.Property(x => x.OwnerId).HasColumnName("MaChuSoHuu");
            e.Property(x => x.Name).HasColumnName("TenKhongGian").HasMaxLength(200);
            e.Property(x => x.Slug).HasColumnName("DuongDan").HasMaxLength(100);
            e.Property(x => x.LogoUrl).HasColumnName("Logo").HasMaxLength(500);
            e.Property(x => x.PlanId).HasColumnName("MaGoiDichVu");
            e.Property(x => x.IsDefault).HasColumnName("LaMacDinh");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            // Tranh loi "multiple cascade paths": khong cascade delete Workspace khi xoa User (owner)
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        // WorkspaceMember -> ThanhVienKhongGian
        modelBuilder.Entity<WorkspaceMember>(e =>
        {
            e.ToTable("ThanhVienKhongGian");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaThanhVien");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            e.Property(x => x.Role).HasColumnName("VaiTro").HasMaxLength(20);
            e.Property(x => x.InvitedByUserId).HasColumnName("DuocMoiBoi");
            e.Property(x => x.JoinedAt).HasColumnName("NgayThamGia");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
            // Tranh multiple cascade paths: khong cascade tu User -> WorkspaceMember
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => new { x.WorkspaceId, x.UserId }).IsUnique();
        });

        // Template -> MauGiaoDien (new, simplified)
        modelBuilder.Entity<Template>(e =>
        {
            e.ToTable("MauGiaoDien");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaMau");
            e.Property(x => x.Name).HasColumnName("TenMau").HasMaxLength(200);
            e.Property(x => x.Category).HasColumnName("DanhMuc").HasMaxLength(100);
            e.Property(x => x.ThumbnailUrl).HasColumnName("AnhDaiDien").HasMaxLength(500);
            e.Property(x => x.JsonContent).HasColumnName("NoiDungJson");
            e.Property(x => x.Description).HasColumnName("MoTa").HasMaxLength(500);
            e.Property(x => x.DesignType).HasColumnName("LoaiThietKe").HasMaxLength(30).HasDefaultValue("responsive");
            e.Property(x => x.IsFeatured).HasColumnName("NoiBat").HasDefaultValue(false);
            e.Property(x => x.UsageCount).HasColumnName("SoLuotDung").HasDefaultValue(0);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasIndex(x => x.Category);
        });

        // Page -> Trang
        modelBuilder.Entity<Page>(e =>
        {
            e.ToTable("Trang");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaTrang");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.CreatorId).HasColumnName("MaNguoiTao");
            e.Property(x => x.TemplateId).HasColumnName("MaMauTrang");
            e.Property(x => x.Name).HasColumnName("TenTrang").HasMaxLength(300);
            e.Property(x => x.Slug).HasColumnName("DuongDan").HasMaxLength(300);
            e.Property(x => x.PageType).HasColumnName("LoaiTrang").HasMaxLength(30);
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.JsonContent).HasColumnName("NoiDungTrang");
            e.Property(x => x.HtmlContent).HasColumnName("NoiDungHtml");
            e.Property(x => x.MetaTitle).HasColumnName("TieuDeMetaTag").HasMaxLength(300);
            e.Property(x => x.MetaDescription).HasColumnName("MoTaMetaTag").HasMaxLength(500);
            e.Property(x => x.MetaKeywords).HasColumnName("TuKhoaMetaTag").HasMaxLength(500);
            e.Property(x => x.Favicon).HasColumnName("Favicon").HasMaxLength(500);
            e.Property(x => x.PagePassword).HasColumnName("MatKhauTrang").HasMaxLength(200);
            e.Property(x => x.SeoScore).HasColumnName("DiemSEO");
            e.Property(x => x.MobileFriendly).HasColumnName("ThuanThietBiDiDong");
            e.Property(x => x.PublishedAt).HasColumnName("NgayDang");
            e.Property(x => x.ExpiresAt).HasColumnName("NgayHetHan");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.Property(x => x.UpdatedAt).HasColumnName("NgayCapNhat");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.WorkspaceId, x.Slug }).IsUnique();
        });

        // PageSection -> TrangSection
        modelBuilder.Entity<PageSection>(e =>
        {
            e.ToTable("TrangSection");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaSection");
            e.Property(x => x.PageId).HasColumnName("MaTrang");
            e.Property(x => x.Order).HasColumnName("ThuTu");
            e.Property(x => x.Name).HasColumnName("TenSection").HasMaxLength(200);
            e.Property(x => x.BackgroundColor).HasColumnName("MauNen").HasMaxLength(50);
            e.Property(x => x.BackgroundImageUrl).HasColumnName("AnhNen").HasMaxLength(500);
            e.Property(x => x.Height).HasColumnName("ChieuCao");
            e.Property(x => x.IsVisible).HasColumnName("HienThi");
            e.Property(x => x.IsLocked).HasColumnName("DaKhoa");
            e.Property(x => x.CustomClass).HasColumnName("LopTuyChinh").HasMaxLength(200);
            e.HasOne(x => x.Page).WithMany(p => p.Sections).HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.PageId, x.Order });
        });

        // PageElement -> TrangPhanTu
        modelBuilder.Entity<PageElement>(e =>
        {
            e.ToTable("TrangPhanTu");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaPhanTu");
            e.Property(x => x.SectionId).HasColumnName("MaSection");
            e.Property(x => x.Type).HasColumnName("Loai").HasMaxLength(50);
            e.Property(x => x.Order).HasColumnName("ThuTu");
            e.Property(x => x.X).HasColumnName("ViTriX");
            e.Property(x => x.Y).HasColumnName("ViTriY");
            e.Property(x => x.Width).HasColumnName("ChieuRong");
            e.Property(x => x.Height).HasColumnName("ChieuCao");
            e.Property(x => x.ZIndex).HasColumnName("ZIndex");
            e.Property(x => x.Rotation).HasColumnName("GocXoay");
            e.Property(x => x.Opacity).HasColumnName("DoMo");
            e.Property(x => x.IsLocked).HasColumnName("DaKhoa");
            e.Property(x => x.IsHidden).HasColumnName("DaAn");
            e.Property(x => x.Content).HasColumnName("NoiDung");
            e.Property(x => x.Href).HasColumnName("LienKet").HasMaxLength(500);
            e.Property(x => x.Target).HasColumnName("Target").HasMaxLength(20);
            e.Property(x => x.ImageUrl).HasColumnName("DuongDanAnh").HasMaxLength(500);
            e.Property(x => x.VideoUrl).HasColumnName("DuongDanVideo").HasMaxLength(500);
            e.Property(x => x.StylesJson).HasColumnName("KieuDangJson");
            e.HasOne(x => x.Section).WithMany(s => s.Elements).HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.SectionId, x.Order });
        });

        // ToolCategory -> CongCuDanhMuc
        modelBuilder.Entity<ToolCategory>(e =>
        {
            e.ToTable("CongCuDanhMuc");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaDanhMuc");
            e.Property(x => x.Name).HasColumnName("TenDanhMuc").HasMaxLength(100);
            e.Property(x => x.Icon).HasColumnName("BieuTuong").HasMaxLength(100);
            e.Property(x => x.Order).HasColumnName("ThuTu");
            e.Property(x => x.IsActive).HasColumnName("HoatDong");
        });

        // ToolItem -> CongCuMuc
        modelBuilder.Entity<ToolItem>(e =>
        {
            e.ToTable("CongCuMuc");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaMuc");
            e.Property(x => x.CategoryId).HasColumnName("MaDanhMuc");
            e.Property(x => x.Name).HasColumnName("TenMuc").HasMaxLength(100);
            e.Property(x => x.Icon).HasColumnName("BieuTuong").HasMaxLength(100);
            e.Property(x => x.ElementType).HasColumnName("LoaiPhanTu").HasMaxLength(50);
            e.Property(x => x.Order).HasColumnName("ThuTu");
            e.Property(x => x.IsActive).HasColumnName("HoatDong");
            e.Property(x => x.HasSubTabs).HasColumnName("CoTabCon");
            e.Property(x => x.SubTabsJson).HasColumnName("TabConJson").HasMaxLength(500);
            e.HasOne(x => x.Category).WithMany(c => c.Items).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        // ElementPreset -> MauPhanTuMacDinh
        modelBuilder.Entity<ElementPreset>(e =>
        {
            e.ToTable("MauPhanTuMacDinh");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaMau");
            e.Property(x => x.ToolItemId).HasColumnName("MaMuc");
            e.Property(x => x.Name).HasColumnName("TenMau").HasMaxLength(200);
            e.Property(x => x.TabName).HasColumnName("TenTab").HasMaxLength(50);
            e.Property(x => x.DefaultContent).HasColumnName("NoiDungMacDinh");
            e.Property(x => x.StylesJson).HasColumnName("KieuDangJson");
            e.Property(x => x.DefaultWidth).HasColumnName("ChieuRongMacDinh");
            e.Property(x => x.DefaultHeight).HasColumnName("ChieuCaoMacDinh");
            e.Property(x => x.Order).HasColumnName("ThuTu");
            e.HasOne(x => x.ToolItem).WithMany(t => t.Presets).HasForeignKey(x => x.ToolItemId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Tag>(e =>
        {
            e.ToTable("NhanDan");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaNhan");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.Name).HasColumnName("TenNhan").HasMaxLength(100);
            e.Property(x => x.Color).HasColumnName("MauSac").HasMaxLength(20);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomDomain>(e =>
        {
            e.ToTable("TenMien");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaTenMien");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.DomainName).HasColumnName("TenMien").HasMaxLength(255);
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.VerifiedAt).HasColumnName("NgayXacMinh");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FormConfig>(e =>
        {
            e.ToTable("CauHinhForm");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaForm");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.Name).HasColumnName("TenForm").HasMaxLength(200);
            e.Property(x => x.FieldsJson).HasColumnName("TruongDuLieuJson");
            e.Property(x => x.WebhookUrl).HasColumnName("WebhookUrl").HasMaxLength(500);
            e.Property(x => x.EmailNotify).HasColumnName("ThongBaoEmail");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("ThongBao");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaThongBao");
            e.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            e.Property(x => x.Title).HasColumnName("TieuDe").HasMaxLength(200);
            e.Property(x => x.Message).HasColumnName("NoiDung").HasMaxLength(1000);
            e.Property(x => x.Type).HasColumnName("Loai").HasMaxLength(20);
            e.Property(x => x.IsRead).HasColumnName("DaDoc");
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("SanPham");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaSanPham");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.Name).HasColumnName("TenSanPham").HasMaxLength(300);
            e.Property(x => x.Price).HasColumnName("GiaTien").HasPrecision(12, 2);
            e.Property(x => x.Description).HasColumnName("MoTa");
            e.Property(x => x.ImageUrl).HasColumnName("AnhSanPham").HasMaxLength(500);
            e.Property(x => x.Category).HasColumnName("DanhMuc").HasMaxLength(100);
            e.Property(x => x.Stock).HasColumnName("TonKho");
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("DonHang");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaDonHang");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.CustomerName).HasColumnName("TenKhachHang").HasMaxLength(200);
            e.Property(x => x.Email).HasColumnName("Email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("SoDienThoai").HasMaxLength(20);
            e.Property(x => x.ProductId).HasColumnName("MaSanPham");
            e.Property(x => x.Amount).HasColumnName("TongTien").HasPrecision(12, 2);
            e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.ToTable("KhachHang");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaKhachHang");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.Name).HasColumnName("TenKhachHang").HasMaxLength(200);
            e.Property(x => x.Email).HasColumnName("Email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("SoDienThoai").HasMaxLength(20);
            e.Property(x => x.Group).HasColumnName("NhomKhach").HasMaxLength(100);
            e.Property(x => x.Source).HasColumnName("NguonKhach").HasMaxLength(100);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lead>(e =>
        {
            e.ToTable("DuLieuLead");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaLead");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.PageId).HasColumnName("MaTrang");
            e.Property(x => x.FormId).HasColumnName("MaForm");
            e.Property(x => x.DataJson).HasColumnName("DuLieuJson");
            e.Property(x => x.IpAddress).HasColumnName("DiaChiIP").HasMaxLength(45);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Page).WithMany().HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.Form).WithMany().HasForeignKey(x => x.FormId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Media>(e =>
        {
            e.ToTable("TaiNguyen");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("MaTaiNguyen");
            e.Property(x => x.UserId).HasColumnName("MaNguoiDung");
            e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
            e.Property(x => x.FileName).HasColumnName("TenFile").HasMaxLength(500);
            e.Property(x => x.OriginalName).HasColumnName("TenGoc").HasMaxLength(500);
            e.Property(x => x.ContentType).HasColumnName("LoaiNoiDung").HasMaxLength(100);
            e.Property(x => x.FileSize).HasColumnName("KichThuoc");
            e.Property(x => x.Width).HasColumnName("ChieuRong");
            e.Property(x => x.Height).HasColumnName("ChieuCao");
            e.Property(x => x.Url).HasColumnName("DuongDan").HasMaxLength(1000);
            e.Property(x => x.ThumbnailUrl).HasColumnName("AnhThuNho").HasMaxLength(1000);
            e.Property(x => x.AltText).HasColumnName("MoTaAlt").HasMaxLength(500);
            e.Property(x => x.Folder).HasColumnName("ThuMuc").HasMaxLength(200);
            e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => new { x.UserId, x.CreatedAt }).IsDescending(false, true);
        });
    }
}
