using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddMomoPaymentOrders : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.GiaoDichThanhToanMoMo', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[GiaoDichThanhToanMoMo] (
                    [MaGiaoDich] bigint IDENTITY(1,1) NOT NULL,
                    [MaNguoiDung] bigint NOT NULL,
                    [MaGoi] int NOT NULL,
                    [SoTien] bigint NOT NULL,
                    [MaDonHang] nvarchar(50) NOT NULL,
                    [MaYeuCau] nvarchar(50) NOT NULL,
                    [TrangThai] nvarchar(20) NOT NULL,
                    [MaGiaoDichMoMo] nvarchar(100) NULL,
                    [NgayTao] datetime2 NOT NULL,
                    [NgayHoanThanh] datetime2 NULL,
                    CONSTRAINT [PK_GiaoDichThanhToanMoMo] PRIMARY KEY ([MaGiaoDich]),
                    CONSTRAINT [FK_GiaoDichThanhToanMoMo_NguoiDung] FOREIGN KEY ([MaNguoiDung]) REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]) ON DELETE CASCADE,
                    CONSTRAINT [FK_GiaoDichThanhToanMoMo_GoiDichVu] FOREIGN KEY ([MaGoi]) REFERENCES [dbo].[GoiDichVu] ([MaGoi])
                );
                CREATE UNIQUE INDEX [IX_GiaoDichThanhToanMoMo_MaDonHang] ON [dbo].[GiaoDichThanhToanMoMo] ([MaDonHang]);
                CREATE INDEX [IX_GiaoDichThanhToanMoMo_MaGoi] ON [dbo].[GiaoDichThanhToanMoMo] ([MaGoi]);
                CREATE INDEX [IX_GiaoDichThanhToanMoMo_MaNguoiDung] ON [dbo].[GiaoDichThanhToanMoMo] ([MaNguoiDung]);
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GiaoDichThanhToanMoMo_MaGoi' AND object_id = OBJECT_ID(N'dbo.GiaoDichThanhToanMoMo'))
                    CREATE INDEX [IX_GiaoDichThanhToanMoMo_MaGoi] ON [dbo].[GiaoDichThanhToanMoMo] ([MaGoi]);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GiaoDichThanhToanMoMo_MaNguoiDung' AND object_id = OBJECT_ID(N'dbo.GiaoDichThanhToanMoMo'))
                    CREATE INDEX [IX_GiaoDichThanhToanMoMo_MaNguoiDung] ON [dbo].[GiaoDichThanhToanMoMo] ([MaNguoiDung]);
            END
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.GiaoDichThanhToanMoMo', N'U') IS NOT NULL
                DROP TABLE [dbo].[GiaoDichThanhToanMoMo];
            """);
    }
}
