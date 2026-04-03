using LadiPage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LadiPage.Infrastructure.Data.Configurations;

/// <summary>
/// Code-first: mapping entity <see cref="Product"/> → bảng <c>SanPham</c> (SQL Server).
/// </summary>
public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> e)
    {
        e.ToTable("SanPham");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("MaSanPham");
        e.Property(x => x.WorkspaceId).HasColumnName("MaKhongGian");
        e.Property(x => x.Name).HasColumnName("TenSanPham").HasMaxLength(300);
        e.Property(x => x.Price).HasColumnName("GiaTien").HasPrecision(12, 2);
        e.Property(x => x.SalePrice).HasColumnName("GiaKhuyenMai").HasPrecision(12, 2);
        e.Property(x => x.Description).HasColumnName("MoTa");
        e.Property(x => x.ImageUrl).HasColumnName("AnhSanPham").HasMaxLength(500);
        e.Property(x => x.Category).HasColumnName("DanhMuc").HasMaxLength(100);
        e.Property(x => x.Stock).HasColumnName("TonKho");
        e.Property(x => x.Status).HasColumnName("TrangThai").HasMaxLength(20);
        e.Property(x => x.CreatedAt).HasColumnName("NgayTao");
        e.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
    }
}
