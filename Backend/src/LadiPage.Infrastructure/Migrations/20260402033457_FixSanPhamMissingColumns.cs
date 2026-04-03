using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSanPhamMissingColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // DB cũ có thể chỉ có vài cột trên SanPham (EnsureCreated / tạo tay) → EF map GiaTien, AnhSanPham, … gây 500.
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'dbo.SanPham', N'U') IS NOT NULL
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'GiaTien')
                        ALTER TABLE [dbo].[SanPham] ADD [GiaTien] DECIMAL(12,2) NOT NULL CONSTRAINT [DF_SanPham_GiaTien] DEFAULT (0);
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'MoTa')
                        ALTER TABLE [dbo].[SanPham] ADD [MoTa] NVARCHAR(MAX) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'AnhSanPham')
                        ALTER TABLE [dbo].[SanPham] ADD [AnhSanPham] NVARCHAR(500) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'DanhMuc')
                        ALTER TABLE [dbo].[SanPham] ADD [DanhMuc] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'TonKho')
                        ALTER TABLE [dbo].[SanPham] ADD [TonKho] INT NOT NULL CONSTRAINT [DF_SanPham_TonKho] DEFAULT (0);
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'TrangThai')
                        ALTER TABLE [dbo].[SanPham] ADD [TrangThai] NVARCHAR(20) NOT NULL CONSTRAINT [DF_SanPham_TrangThai] DEFAULT (N'active');
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'NgayTao')
                        ALTER TABLE [dbo].[SanPham] ADD [NgayTao] DATETIME2 NOT NULL CONSTRAINT [DF_SanPham_NgayTao] DEFAULT (SYSUTCDATETIME());
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'GiaKhuyenMai')
                        ALTER TABLE [dbo].[SanPham] ADD [GiaKhuyenMai] DECIMAL(12,2) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
