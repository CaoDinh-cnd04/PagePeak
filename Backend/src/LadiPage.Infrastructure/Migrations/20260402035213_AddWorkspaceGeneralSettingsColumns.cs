using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceGeneralSettingsColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'dbo.KhongGianLamViec', N'U') IS NOT NULL
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'DiaChiCuaHang')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [DiaChiCuaHang] NVARCHAR(500) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'SoDienThoaiCuaHang')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [SoDienThoaiCuaHang] NVARCHAR(30) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'MaBuuDien')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [MaBuuDien] NVARCHAR(20) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'QuocGia')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [QuocGia] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'TinhThanh')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [TinhThanh] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'QuanHuyen')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [QuanHuyen] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'PhuongXa')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [PhuongXa] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'MuiGio')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [MuiGio] NVARCHAR(100) NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.KhongGianLamViec') AND name = N'DonViTienKhongGian')
                        ALTER TABLE [dbo].[KhongGianLamViec] ADD [DonViTienKhongGian] NVARCHAR(10) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
