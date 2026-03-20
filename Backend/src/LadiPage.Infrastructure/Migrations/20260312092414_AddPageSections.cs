using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LadiPage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPageSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GoiDichVu",
                columns: table => new
                {
                    MaGoi = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenGoi = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    GiaTien = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    ChuKyThanhToan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SoTrangToiDa = table.Column<int>(type: "int", nullable: false),
                    SoThanhVienToiDa = table.Column<int>(type: "int", nullable: false),
                    SoLuotTruyCapToiDa = table.Column<long>(type: "bigint", nullable: true),
                    DungLuongGB = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    CoAI = table.Column<bool>(type: "bit", nullable: false),
                    CoBanHang = table.Column<bool>(type: "bit", nullable: false),
                    CoTuDongHoa = table.Column<bool>(type: "bit", nullable: false),
                    CoABTest = table.Column<bool>(type: "bit", nullable: false),
                    CoTenMienRieng = table.Column<bool>(type: "bit", nullable: false),
                    DangHoatDong = table.Column<bool>(type: "bit", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoiDichVu", x => x.MaGoi);
                });

            migrationBuilder.CreateTable(
                name: "MauGiaoDien",
                columns: table => new
                {
                    MaMau = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenMau = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DanhMuc = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AnhDaiDien = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    NoiDungJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MauGiaoDien", x => x.MaMau);
                });

            migrationBuilder.CreateTable(
                name: "NguoiDung",
                columns: table => new
                {
                    MaNguoiDung = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    MatKhauMaHoa = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    HoTen = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SoDienThoai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    AnhDaiDien = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VaiTro = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EmailDaXacNhan = table.Column<bool>(type: "bit", nullable: false),
                    SdtDaXacNhan = table.Column<bool>(type: "bit", nullable: false),
                    MaGoiHienTai = table.Column<int>(type: "int", nullable: true),
                    NgayHetHanGoi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MaGioiThieu = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DuocGioiThieuBoi = table.Column<long>(type: "bigint", nullable: true),
                    LanDangNhapCuoi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguoiDung", x => x.MaNguoiDung);
                    table.ForeignKey(
                        name: "FK_NguoiDung_GoiDichVu_MaGoiHienTai",
                        column: x => x.MaGoiHienTai,
                        principalTable: "GoiDichVu",
                        principalColumn: "MaGoi");
                });

            migrationBuilder.CreateTable(
                name: "DangKyGoi",
                columns: table => new
                {
                    MaDangKy = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<long>(type: "bigint", nullable: false),
                    MaGoi = table.Column<int>(type: "int", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NgayBatDau = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayKetThuc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TuDongGiaHan = table.Column<bool>(type: "bit", nullable: false),
                    PhuongThucThanhToan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MaGiaoDich = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SoTienDaThanhToan = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    DonViTien = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DangKyGoi", x => x.MaDangKy);
                    table.ForeignKey(
                        name: "FK_DangKyGoi_GoiDichVu_MaGoi",
                        column: x => x.MaGoi,
                        principalTable: "GoiDichVu",
                        principalColumn: "MaGoi",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DangKyGoi_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KhongGianLamViec",
                columns: table => new
                {
                    MaKhongGian = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaChuSoHuu = table.Column<long>(type: "bigint", nullable: false),
                    TenKhongGian = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DuongDan = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Logo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    MaGoiDichVu = table.Column<int>(type: "int", nullable: true),
                    LaMacDinh = table.Column<bool>(type: "bit", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhongGianLamViec", x => x.MaKhongGian);
                    table.ForeignKey(
                        name: "FK_KhongGianLamViec_GoiDichVu_MaGoiDichVu",
                        column: x => x.MaGoiDichVu,
                        principalTable: "GoiDichVu",
                        principalColumn: "MaGoi");
                    table.ForeignKey(
                        name: "FK_KhongGianLamViec_NguoiDung_MaChuSoHuu",
                        column: x => x.MaChuSoHuu,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung");
                });

            migrationBuilder.CreateTable(
                name: "PhienDangNhap",
                columns: table => new
                {
                    MaPhien = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNguoiDung = table.Column<long>(type: "bigint", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    TokenLamMoi = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    DiaChiIP = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    ThongTinTrinh = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    NgayHetHan = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhienDangNhap", x => x.MaPhien);
                    table.ForeignKey(
                        name: "FK_PhienDangNhap_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ThanhVienKhongGian",
                columns: table => new
                {
                    MaThanhVien = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaKhongGian = table.Column<long>(type: "bigint", nullable: false),
                    MaNguoiDung = table.Column<long>(type: "bigint", nullable: false),
                    VaiTro = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DuocMoiBoi = table.Column<long>(type: "bigint", nullable: true),
                    NgayThamGia = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThanhVienKhongGian", x => x.MaThanhVien);
                    table.ForeignKey(
                        name: "FK_ThanhVienKhongGian_KhongGianLamViec_MaKhongGian",
                        column: x => x.MaKhongGian,
                        principalTable: "KhongGianLamViec",
                        principalColumn: "MaKhongGian",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ThanhVienKhongGian_NguoiDung_MaNguoiDung",
                        column: x => x.MaNguoiDung,
                        principalTable: "NguoiDung",
                        principalColumn: "MaNguoiDung");
                });

            migrationBuilder.CreateTable(
                name: "Trang",
                columns: table => new
                {
                    MaTrang = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaKhongGian = table.Column<long>(type: "bigint", nullable: false),
                    TenTrang = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DuongDan = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NoiDungJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NoiDungHtml = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trang", x => x.MaTrang);
                    table.ForeignKey(
                        name: "FK_Trang_KhongGianLamViec_MaKhongGian",
                        column: x => x.MaKhongGian,
                        principalTable: "KhongGianLamViec",
                        principalColumn: "MaKhongGian",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrangSection",
                columns: table => new
                {
                    MaSection = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaTrang = table.Column<long>(type: "bigint", nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    MauNen = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ChieuCao = table.Column<int>(type: "int", nullable: true),
                    HienThi = table.Column<bool>(type: "bit", nullable: false),
                    LopTuyChinh = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrangSection", x => x.MaSection);
                    table.ForeignKey(
                        name: "FK_TrangSection_Trang_MaTrang",
                        column: x => x.MaTrang,
                        principalTable: "Trang",
                        principalColumn: "MaTrang",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrangPhanTu",
                columns: table => new
                {
                    MaPhanTu = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaSection = table.Column<long>(type: "bigint", nullable: false),
                    Loai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ThuTu = table.Column<int>(type: "int", nullable: false),
                    ViTriX = table.Column<int>(type: "int", nullable: false),
                    ViTriY = table.Column<int>(type: "int", nullable: false),
                    ChieuRong = table.Column<int>(type: "int", nullable: true),
                    ChieuCao = table.Column<int>(type: "int", nullable: true),
                    ZIndex = table.Column<int>(type: "int", nullable: false),
                    NoiDung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LienKet = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Target = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    KieuDangJson = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrangPhanTu", x => x.MaPhanTu);
                    table.ForeignKey(
                        name: "FK_TrangPhanTu_TrangSection_MaSection",
                        column: x => x.MaSection,
                        principalTable: "TrangSection",
                        principalColumn: "MaSection",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DangKyGoi_MaGoi",
                table: "DangKyGoi",
                column: "MaGoi");

            migrationBuilder.CreateIndex(
                name: "IX_DangKyGoi_MaNguoiDung",
                table: "DangKyGoi",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_KhongGianLamViec_DuongDan",
                table: "KhongGianLamViec",
                column: "DuongDan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KhongGianLamViec_MaChuSoHuu",
                table: "KhongGianLamViec",
                column: "MaChuSoHuu");

            migrationBuilder.CreateIndex(
                name: "IX_KhongGianLamViec_MaGoiDichVu",
                table: "KhongGianLamViec",
                column: "MaGoiDichVu");

            migrationBuilder.CreateIndex(
                name: "IX_MauGiaoDien_DanhMuc",
                table: "MauGiaoDien",
                column: "DanhMuc");

            migrationBuilder.CreateIndex(
                name: "IX_NguoiDung_MaGoiHienTai",
                table: "NguoiDung",
                column: "MaGoiHienTai");

            migrationBuilder.CreateIndex(
                name: "IX_PhienDangNhap_MaNguoiDung",
                table: "PhienDangNhap",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_ThanhVienKhongGian_MaKhongGian_MaNguoiDung",
                table: "ThanhVienKhongGian",
                columns: new[] { "MaKhongGian", "MaNguoiDung" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ThanhVienKhongGian_MaNguoiDung",
                table: "ThanhVienKhongGian",
                column: "MaNguoiDung");

            migrationBuilder.CreateIndex(
                name: "IX_Trang_MaKhongGian_DuongDan",
                table: "Trang",
                columns: new[] { "MaKhongGian", "DuongDan" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrangPhanTu_MaSection_ThuTu",
                table: "TrangPhanTu",
                columns: new[] { "MaSection", "ThuTu" });

            migrationBuilder.CreateIndex(
                name: "IX_TrangSection_MaTrang_ThuTu",
                table: "TrangSection",
                columns: new[] { "MaTrang", "ThuTu" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DangKyGoi");

            migrationBuilder.DropTable(
                name: "MauGiaoDien");

            migrationBuilder.DropTable(
                name: "PhienDangNhap");

            migrationBuilder.DropTable(
                name: "ThanhVienKhongGian");

            migrationBuilder.DropTable(
                name: "TrangPhanTu");

            migrationBuilder.DropTable(
                name: "TrangSection");

            migrationBuilder.DropTable(
                name: "Trang");

            migrationBuilder.DropTable(
                name: "KhongGianLamViec");

            migrationBuilder.DropTable(
                name: "NguoiDung");

            migrationBuilder.DropTable(
                name: "GoiDichVu");
        }
    }
}
