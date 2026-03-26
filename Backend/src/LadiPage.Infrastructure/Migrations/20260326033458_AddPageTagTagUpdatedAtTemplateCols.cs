using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations;

/// <summary>
/// Đồng bộ schema an toàn khi DB đã có một phần bảng/cột.
/// Tách batch + EXEC cho UPDATE sau ALTER ADD (tránh SQL 207 cùng batch).
/// </summary>
public partial class AddPageTagTagUpdatedAtTemplateCols : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF COL_LENGTH('dbo.NguoiDung','MaXacThucEmail') IS NULL
                ALTER TABLE [dbo].[NguoiDung] ADD [MaXacThucEmail] nvarchar(200) NULL;
            IF COL_LENGTH('dbo.NguoiDung','NgayGuiXacThucEmail') IS NULL
                ALTER TABLE [dbo].[NguoiDung] ADD [NgayGuiXacThucEmail] datetime2 NULL;

            IF COL_LENGTH('dbo.MauGiaoDien','LaPro') IS NULL
                ALTER TABLE [dbo].[MauGiaoDien] ADD [LaPro] bit NOT NULL CONSTRAINT [DF_MauGiaoDien_LaPro_Mig] DEFAULT (0);
            IF COL_LENGTH('dbo.MauGiaoDien','LoaiThietKe') IS NULL
                ALTER TABLE [dbo].[MauGiaoDien] ADD [LoaiThietKe] nvarchar(30) NOT NULL CONSTRAINT [DF_MauGiaoDien_LoaiThietKe_Mig] DEFAULT (N'responsive');
            IF COL_LENGTH('dbo.MauGiaoDien','MoTa') IS NULL
                ALTER TABLE [dbo].[MauGiaoDien] ADD [MoTa] nvarchar(500) NULL;
            IF COL_LENGTH('dbo.MauGiaoDien','NoiBat') IS NULL
                ALTER TABLE [dbo].[MauGiaoDien] ADD [NoiBat] bit NOT NULL CONSTRAINT [DF_MauGiaoDien_NoiBat_Mig] DEFAULT (0);
            IF COL_LENGTH('dbo.MauGiaoDien','SoLuotDung') IS NULL
                ALTER TABLE [dbo].[MauGiaoDien] ADD [SoLuotDung] int NOT NULL CONSTRAINT [DF_MauGiaoDien_SoLuotDung_Mig] DEFAULT (0);
            """);

        migrationBuilder.Sql("""
            IF OBJECT_ID('dbo.NhanDan','U') IS NULL AND OBJECT_ID('dbo.KhongGianLamViec','U') IS NOT NULL
            BEGIN
                CREATE TABLE [dbo].[NhanDan] (
                    [MaNhan] bigint NOT NULL IDENTITY(1,1),
                    [MaKhongGian] bigint NOT NULL,
                    [TenNhan] nvarchar(100) NOT NULL,
                    [MauSac] nvarchar(20) NULL,
                    [NgayTao] datetime2 NOT NULL,
                    [NgayCapNhat] datetime2 NOT NULL,
                    CONSTRAINT [PK_NhanDan] PRIMARY KEY ([MaNhan]),
                    CONSTRAINT [FK_NhanDan_KhongGianLamViec_MaKhongGian] FOREIGN KEY ([MaKhongGian]) REFERENCES [dbo].[KhongGianLamViec]([MaKhongGian]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_NhanDan_MaKhongGian] ON [dbo].[NhanDan]([MaKhongGian]);
            END
            """);

        migrationBuilder.Sql("""
            IF OBJECT_ID('dbo.NhanDan','U') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.NhanDan') AND name = N'NgayCapNhat')
                ALTER TABLE [dbo].[NhanDan] ADD [NgayCapNhat] datetime2 NULL;
            """);

        migrationBuilder.Sql("""
            IF OBJECT_ID('dbo.NhanDan','U') IS NOT NULL
               AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.NhanDan') AND name = N'NgayCapNhat')
            BEGIN
                EXEC(N'
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N''dbo.NhanDan'') AND name = N''NgayTao'')
                    UPDATE [dbo].[NhanDan] SET [NgayCapNhat] = [NgayTao] WHERE [NgayCapNhat] IS NULL;
                ELSE
                    UPDATE [dbo].[NhanDan] SET [NgayCapNhat] = SYSUTCDATETIME() WHERE [NgayCapNhat] IS NULL;
                ');
            END
            """);

        migrationBuilder.Sql("""
            IF OBJECT_ID('dbo.NhanDan','U') IS NOT NULL
               AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.NhanDan') AND name = N'NgayCapNhat')
            BEGIN
                DECLARE @nullable int;
                SELECT @nullable = c.is_nullable FROM sys.columns c
                WHERE c.object_id = OBJECT_ID(N'dbo.NhanDan') AND c.name = N'NgayCapNhat';
                IF @nullable = 1
                    ALTER TABLE [dbo].[NhanDan] ALTER COLUMN [NgayCapNhat] datetime2 NOT NULL;
            END
            """);

        migrationBuilder.Sql("""
            IF OBJECT_ID('dbo.TrangNhan','U') IS NULL
               AND OBJECT_ID('dbo.Trang','U') IS NOT NULL
               AND OBJECT_ID('dbo.NhanDan','U') IS NOT NULL
            BEGIN
                CREATE TABLE [dbo].[TrangNhan] (
                    [MaTrang] bigint NOT NULL,
                    [MaNhan] bigint NOT NULL,
                    CONSTRAINT [PK_TrangNhan] PRIMARY KEY ([MaTrang],[MaNhan]),
                    CONSTRAINT [FK_TrangNhan_Trang_MaTrang] FOREIGN KEY ([MaTrang]) REFERENCES [dbo].[Trang]([MaTrang]) ON DELETE CASCADE,
                    CONSTRAINT [FK_TrangNhan_NhanDan_MaNhan] FOREIGN KEY ([MaNhan]) REFERENCES [dbo].[NhanDan]([MaNhan]) ON DELETE NO ACTION
                );
                CREATE INDEX [IX_TrangNhan_MaNhan] ON [dbo].[TrangNhan]([MaNhan]);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
