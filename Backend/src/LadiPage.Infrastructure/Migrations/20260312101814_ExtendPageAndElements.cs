using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExtendPageAndElements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "NoiDungJson",
                table: "Trang",
                newName: "NoiDungTrang");

            migrationBuilder.AddColumn<string>(
                name: "AnhNen",
                table: "TrangSection",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DaKhoa",
                table: "TrangSection",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TenSection",
                table: "TrangSection",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DaAn",
                table: "TrangPhanTu",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "DaKhoa",
                table: "TrangPhanTu",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "DoMo",
                table: "TrangPhanTu",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "DuongDanAnh",
                table: "TrangPhanTu",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DuongDanVideo",
                table: "TrangPhanTu",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "GocXoay",
                table: "TrangPhanTu",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AlterColumn<string>(
                name: "TenTrang",
                table: "Trang",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "DuongDan",
                table: "Trang",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);

            migrationBuilder.AddColumn<byte>(
                name: "DiemSEO",
                table: "Trang",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Favicon",
                table: "Trang",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LoaiTrang",
                table: "Trang",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "MaMauTrang",
                table: "Trang",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "MaNguoiTao",
                table: "Trang",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MatKhauTrang",
                table: "Trang",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MoTaMetaTag",
                table: "Trang",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NgayDang",
                table: "Trang",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NgayHetHan",
                table: "Trang",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NgayTao",
                table: "Trang",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<bool>(
                name: "ThuanThietBiDiDong",
                table: "Trang",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TieuDeMetaTag",
                table: "Trang",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TuKhoaMetaTag",
                table: "Trang",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnhNen",
                table: "TrangSection");

            migrationBuilder.DropColumn(
                name: "DaKhoa",
                table: "TrangSection");

            migrationBuilder.DropColumn(
                name: "TenSection",
                table: "TrangSection");

            migrationBuilder.DropColumn(
                name: "DaAn",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "DaKhoa",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "DoMo",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "DuongDanAnh",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "DuongDanVideo",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "GocXoay",
                table: "TrangPhanTu");

            migrationBuilder.DropColumn(
                name: "DiemSEO",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "Favicon",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "LoaiTrang",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "MaMauTrang",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "MaNguoiTao",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "MatKhauTrang",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "MoTaMetaTag",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "NgayDang",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "NgayHetHan",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "NgayTao",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "ThuanThietBiDiDong",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "TieuDeMetaTag",
                table: "Trang");

            migrationBuilder.DropColumn(
                name: "TuKhoaMetaTag",
                table: "Trang");

            migrationBuilder.RenameColumn(
                name: "NoiDungTrang",
                table: "Trang",
                newName: "NoiDungJson");

            migrationBuilder.AlterColumn<string>(
                name: "TenTrang",
                table: "Trang",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300);

            migrationBuilder.AlterColumn<string>(
                name: "DuongDan",
                table: "Trang",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300);
        }
    }
}
