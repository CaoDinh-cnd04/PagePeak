using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEditorDataTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnhMauCoBan",
                columns: table => new
                {
                    MaAnh = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DuongDan = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    TenAnh = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DanhMuc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChieuRong = table.Column<int>(type: "int", nullable: false),
                    ChieuCao = table.Column<int>(type: "int", nullable: false),
                    TacGia = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DuongDanTacGia = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    NguonAnh = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnhMauCoBan", x => x.MaAnh);
                });

            migrationBuilder.CreateTable(
                name: "BieuTuongEditor",
                columns: table => new
                {
                    MaBieuTuong = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaIcon = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TenBieuTuong = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DanhMuc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    KyTu = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MauSac = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BieuTuongEditor", x => x.MaBieuTuong);
                });

            migrationBuilder.CreateTable(
                name: "MauDuongKe",
                columns: table => new
                {
                    MaDuongKe = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaPreset = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TenMau = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    KieuDuong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MauSac = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DoDay = table.Column<int>(type: "int", nullable: false),
                    KieuGachJson = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Tab = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MauDuongKe", x => x.MaDuongKe);
                });

            migrationBuilder.CreateTable(
                name: "TinhNangDangNhap",
                columns: table => new
                {
                    MaTinhNang = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaSlide = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TieuDe = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MoTa = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TinhNangDangNhap", x => x.MaTinhNang);
                });

            migrationBuilder.CreateTable(
                name: "VideoMau",
                columns: table => new
                {
                    MaVideo = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenVideo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DuongDan = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DuongDanNhung = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AnhThuNho = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    NguonVideo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoMau", x => x.MaVideo);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BieuTuongEditor_MaIcon",
                table: "BieuTuongEditor",
                column: "MaIcon",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MauDuongKe_MaPreset",
                table: "MauDuongKe",
                column: "MaPreset",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnhMauCoBan");

            migrationBuilder.DropTable(
                name: "BieuTuongEditor");

            migrationBuilder.DropTable(
                name: "MauDuongKe");

            migrationBuilder.DropTable(
                name: "TinhNangDangNhap");

            migrationBuilder.DropTable(
                name: "VideoMau");
        }
    }
}
