using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSanPhamGiaKhuyenMaiIfMissing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // DB cũ có thể thiếu cột (EnsureCreated / tay chưa cập nhật) → EF truy vấn SalePrice/GiaKhuyenMai gây 500.
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'dbo.SanPham', N'U') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'GiaKhuyenMai')
                    ALTER TABLE [dbo].[SanPham] ADD [GiaKhuyenMai] DECIMAL(12,2) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
