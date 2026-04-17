using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFormPresetsPopupTemplatesVnAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MauFormSanDung",
                columns: table => new
                {
                    MaMauForm = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaPreset = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TenMauForm = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LoaiForm = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TenTab = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TieuDe = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ChuNut = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CacTruongJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KieuInput = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ChieuRong = table.Column<int>(type: "int", nullable: false),
                    ChieuCao = table.Column<int>(type: "int", nullable: false),
                    MauNut = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    MauChuNut = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    MauNen = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    GocBoForm = table.Column<int>(type: "int", nullable: true),
                    MauTieuDe = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    GocBoInput = table.Column<int>(type: "int", nullable: true),
                    MauNhan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MauFormSanDung", x => x.MaMauForm);
                });

            migrationBuilder.CreateTable(
                name: "MauPopup",
                columns: table => new
                {
                    MaMauPopup = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaTemplate = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TenMauPopup = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DanhMuc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AnhThuNho = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    NoiDungJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChieuRong = table.Column<int>(type: "int", nullable: false),
                    ChieuCao = table.Column<int>(type: "int", nullable: false),
                    StylesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MauPopup", x => x.MaMauPopup);
                });

            migrationBuilder.CreateTable(
                name: "TinhThanh",
                columns: table => new
                {
                    MaTinh = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenTinh = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TinhThanh", x => x.MaTinh);
                });

            migrationBuilder.CreateTable(
                name: "QuanHuyen",
                columns: table => new
                {
                    MaQuan = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaTinh = table.Column<int>(type: "int", nullable: false),
                    TenQuan = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuanHuyen", x => x.MaQuan);
                    table.ForeignKey(
                        name: "FK_QuanHuyen_TinhThanh_MaTinh",
                        column: x => x.MaTinh,
                        principalTable: "TinhThanh",
                        principalColumn: "MaTinh",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PhuongXa",
                columns: table => new
                {
                    MaPhuong = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaQuan = table.Column<int>(type: "int", nullable: false),
                    TenPhuong = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhuongXa", x => x.MaPhuong);
                    table.ForeignKey(
                        name: "FK_PhuongXa_QuanHuyen_MaQuan",
                        column: x => x.MaQuan,
                        principalTable: "QuanHuyen",
                        principalColumn: "MaQuan",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MauFormSanDung_MaPreset",
                table: "MauFormSanDung",
                column: "MaPreset",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MauPopup_MaTemplate",
                table: "MauPopup",
                column: "MaTemplate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PhuongXa_MaQuan",
                table: "PhuongXa",
                column: "MaQuan");

            migrationBuilder.CreateIndex(
                name: "IX_QuanHuyen_MaTinh",
                table: "QuanHuyen",
                column: "MaTinh");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MauFormSanDung");

            migrationBuilder.DropTable(
                name: "MauPopup");

            migrationBuilder.DropTable(
                name: "PhuongXa");

            migrationBuilder.DropTable(
                name: "QuanHuyen");

            migrationBuilder.DropTable(
                name: "TinhThanh");
        }
    }
}
