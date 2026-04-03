using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CreateSanPhamTableIfNotExists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Code-first: tạo đủ bảng SanPham khi DB mới / chưa có bảng (migration cũ không có CreateTable).
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'dbo.SanPham', N'U') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[SanPham] (
                        [MaSanPham] BIGINT IDENTITY(1,1) NOT NULL,
                        [MaKhongGian] BIGINT NOT NULL,
                        [TenSanPham] NVARCHAR(300) NOT NULL,
                        [GiaTien] DECIMAL(12,2) NOT NULL CONSTRAINT [DF_SanPham_GiaTien] DEFAULT (0),
                        [GiaKhuyenMai] DECIMAL(12,2) NULL,
                        [MoTa] NVARCHAR(MAX) NULL,
                        [AnhSanPham] NVARCHAR(500) NULL,
                        [DanhMuc] NVARCHAR(100) NULL,
                        [TonKho] INT NOT NULL CONSTRAINT [DF_SanPham_TonKho] DEFAULT (0),
                        [TrangThai] NVARCHAR(20) NOT NULL CONSTRAINT [DF_SanPham_TrangThai] DEFAULT (N'active'),
                        [NgayTao] DATETIME2 NOT NULL CONSTRAINT [DF_SanPham_NgayTao] DEFAULT (SYSUTCDATETIME()),
                        CONSTRAINT [PK_SanPham] PRIMARY KEY ([MaSanPham])
                    );
                    ALTER TABLE [dbo].[SanPham] WITH CHECK ADD CONSTRAINT [FK_SanPham_KhongGianLamViec] FOREIGN KEY([MaKhongGian])
                        REFERENCES [dbo].[KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE;
                    CREATE NONCLUSTERED INDEX [IX_SanPham_MaKhongGian] ON [dbo].[SanPham]([MaKhongGian]);
                END

                IF OBJECT_ID(N'dbo.SanPham', N'U') IS NOT NULL
                   AND OBJECT_ID(N'dbo.DonHang', N'U') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DonHang_SanPham_MaSanPham')
                   AND EXISTS (
                       SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID(N'dbo.DonHang') AND name = N'MaSanPham')
                    ALTER TABLE [dbo].[DonHang] ADD CONSTRAINT [FK_DonHang_SanPham_MaSanPham]
                    FOREIGN KEY ([MaSanPham]) REFERENCES [dbo].[SanPham]([MaSanPham]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
