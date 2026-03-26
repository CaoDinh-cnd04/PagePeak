using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <summary>
    /// Bổ sung cột [NgayXacMinh] trên [TenMien] nếu thiếu (idempotent, tương thích DB cũ).
    /// </summary>
    public partial class AddTenMienNgayXacMinh : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID('dbo.TenMien','U') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.columns
                       WHERE object_id = OBJECT_ID(N'dbo.TenMien') AND name = N'NgayXacMinh')
                    ALTER TABLE [dbo].[TenMien] ADD [NgayXacMinh] datetime2 NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
