using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixDonHangOrderDbColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bổ sung [MaSanPham] trên [DonHang] nếu thiếu (FK tới SanPham; idempotent).
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'dbo.DonHang', N'U') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID(N'dbo.DonHang') AND name = N'MaSanPham')
                    ALTER TABLE [dbo].[DonHang] ADD [MaSanPham] bigint NULL;
                IF OBJECT_ID(N'dbo.DonHang', N'U') IS NOT NULL
                   AND OBJECT_ID(N'dbo.SanPham', N'U') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DonHang_SanPham_MaSanPham')
                    ALTER TABLE [dbo].[DonHang] ADD CONSTRAINT [FK_DonHang_SanPham_MaSanPham]
                    FOREIGN KEY ([MaSanPham]) REFERENCES [dbo].[SanPham]([MaSanPham]);
                IF OBJECT_ID(N'dbo.DonHang', N'U') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.indexes
                       WHERE object_id = OBJECT_ID(N'dbo.DonHang') AND name = N'IX_DonHang_MaSanPham')
                    CREATE NONCLUSTERED INDEX [IX_DonHang_MaSanPham] ON [dbo].[DonHang]([MaSanPham]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
