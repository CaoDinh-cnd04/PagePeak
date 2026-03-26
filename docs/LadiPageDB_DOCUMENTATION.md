# Tài liệu cơ sở dữ liệu LadiPageDB

**Nguồn schema (code-first):** EF Core `AppDbContext` + `LadiPage.Infrastructure/Migrations`  
**Hệ quản trị:** SQL Server  
**Mục đích:** Nền tảng Landing Page Builder, CRM, Thương mại điện tử, Tự động hóa, Phân tích (mô hình tương tự LadiPage).

**Quy ước:** Tên bảng và cột dùng tiếng Việt, bọc trong `[]` để tránh trùng từ khóa SQL.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Module 1: Người dùng & xác thực](#2-module-1-người-dùng--xác-thực)
3. [Module 2: Không gian làm việc & nhóm](#3-module-2-không-gian-làm-việc--nhóm)
4. [Module 3: Tên miền](#4-module-3-tên-miền)
5. [Module 4: Trang đích (Landing Page)](#5-module-4-trang-đích-landing-page)
6. [Module 5: Cửa sổ bật lên (Popup)](#6-module-5-cửa-sổ-bật-lên-popup)
7. [Module 6: Biểu mẫu & Khách hàng tiềm năng](#7-module-6-biểu-mẫu--khách-hàng-tiềm-năng)
8. [Module 7: Sản phẩm & Thương mại điện tử](#8-module-7-sản-phẩm--thương-mại-điện-tử)
9. [Module 8: Đơn hàng](#9-module-8-đơn-hàng)
10. [Module 9: Quản lý khách hàng (CRM)](#10-module-9-quản-lý-khách-hàng-crm)
11. [Module 10: Tự động hóa (Automation)](#11-module-10-tự-động-hóa-automation)
12. [Module 11: Email Marketing](#12-module-11-email-marketing)
13. [Module 12: Thử nghiệm A/B](#13-module-12-thử-nghiệm-ab)
14. [Module 13: Phân tích & Thống kê](#14-module-13-phân-tích--thống-kê)
15. [Module 14: Thư viện tài nguyên (Media)](#15-module-14-thư-viện-tài-nguyên-media)
16. [Module 15: Thông báo](#16-module-15-thông-báo)
17. [Module 16: Tích hợp bên ngoài](#17-module-16-tích-hợp-bên-ngoài)
18. [Module 17: Đối tác & Liên kết (Affiliate)](#18-module-17-đối-tác--liên-kết-affiliate)
19. [Chỉ mục (Indexes)](#19-chỉ-mục-indexes)
20. [Dữ liệu mẫu](#20-dữ-liệu-mẫu)
21. [Sơ đồ quan hệ chính](#21-sơ-đồ-quan-hệ-chính)

---

## 1. Tổng quan

| Thông tin | Giá trị |
|-----------|--------|
| Tên database | `LadiPageDB` |
| Số module | 17 |
| Số bảng | 40+ |
| Kiểu dữ liệu chính | `NVARCHAR`, `BIGINT`, `INT`, `DECIMAL`, `DATETIME2`, `BIT` |
| JSON fields | Nhiều cột dùng `NVARCHAR(MAX)` lưu cấu hình/trạng thái dạng JSON |

---

## 2. Module 1: Người dùng & xác thực

### 2.1. Bảng `[GoiDichVu]`

Định nghĩa các gói dịch vụ (Free, Starter, Pro, Business, Enterprise).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaGoi | INT, PK, IDENTITY | Mã gói |
| TenGoi | NVARCHAR(100) | Tên gói (Miễn phí, Starter, Pro, …) |
| MaCode | VARCHAR(50), UNIQUE | Mã code (free, starter, pro, …) |
| GiaTien | DECIMAL(12,2) | Giá tiền |
| ChuKyThanhToan | VARCHAR(20) | Chu kỳ: `thang`, `nam` |
| SoTrangToiDa | INT | Số trang tối đa (‑1 = không giới hạn) |
| SoThanhVienToiDa | INT | Số thành viên workspace tối đa |
| SoLuotTruyCapToiDa | BIGINT, NULL | Lượt truy cập tối đa; NULL = không giới hạn |
| DungLuongGB | DECIMAL(6,2) | Dung lượng lưu trữ (GB) |
| CoAI | BIT | Có tính năng AI |
| CoBanHang | BIT | Có bán hàng |
| CoTuDongHoa | BIT | Có tự động hóa |
| CoABTest | BIT | Có A/B test |
| CoTenMienRieng | BIT | Có tên miền riêng |
| DangHoatDong | BIT | Đang hoạt động |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 2.2. Bảng `[NguoiDung]`

Tài khoản người dùng hệ thống.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaNguoiDung | BIGINT, PK, IDENTITY | Mã người dùng |
| Email | NVARCHAR(255), UNIQUE | Email đăng nhập |
| MatKhauMaHoa | NVARCHAR(512) | Mật khẩu đã hash |
| HoTen | NVARCHAR(200) | Họ tên |
| SoDienThoai | VARCHAR(20) | Số điện thoại |
| AnhDaiDien | NVARCHAR(500) | URL ảnh đại diện |
| VaiTro | VARCHAR(20) | `quantri`, `nguoidung`, `agency`, `doitac` |
| TrangThai | VARCHAR(20) | `hoatdong`, `tamkhoa`, `bikhoa`, `choxacnhan` |
| EmailDaXacNhan, SdtDaXacNhan | BIT | Trạng thái xác thực |
| MaGoiHienTai | INT, FK → GoiDichVu | Gói đang dùng |
| NgayHetHanGoi | DATETIME2 | Ngày hết hạn gói |
| MaGioiThieu | VARCHAR(50), UNIQUE | Mã giới thiệu (affiliate) |
| DuocGioiThieuBoi | BIGINT, FK → NguoiDung | Người giới thiệu |
| LanDangNhapCuoi | DATETIME2 | Lần đăng nhập cuối |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 2.3. Bảng `[PhienDangNhap]`

Phiên đăng nhập (JWT / refresh token).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaPhien | BIGINT, PK | Mã phiên |
| MaNguoiDung | BIGINT, FK → NguoiDung, CASCADE | Người dùng |
| Token | NVARCHAR(512), UNIQUE | Access token (hoặc identifier) |
| TokenLamMoi | NVARCHAR(512) | Refresh token |
| DiaChiIP | VARCHAR(45) | IP |
| ThongTinTrinh | NVARCHAR(500) | User-Agent / thiết bị |
| NgayHetHan | DATETIME2 | Hết hạn token |
| NgayTao | DATETIME2 | Thời điểm tạo phiên |

---

### 2.4. Bảng `[DangKyGoi]`

Lịch sử đăng ký / gia hạn gói dịch vụ.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDangKy | BIGINT, PK | Mã đăng ký |
| MaNguoiDung | BIGINT, FK → NguoiDung | Người dùng |
| MaGoi | INT, FK → GoiDichVu | Gói dịch vụ |
| TrangThai | VARCHAR(20) | `hoatdong`, `dahuy`, `hethan`, `dung_thu` |
| NgayBatDau, NgayKetThuc | DATETIME2 | Khoảng thời gian gói |
| TuDongGiaHan | BIT | Tự động gia hạn |
| PhuongThucThanhToan | VARCHAR(50) | Phương thức thanh toán |
| MaGiaoDich | NVARCHAR(200) | Mã giao dịch (payment gateway) |
| SoTienDaThanhToan | DECIMAL(12,2) | Số tiền đã thanh toán |
| DonViTien | VARCHAR(10) | VND, USD, … |
| NgayTao | DATETIME2 | Audit |

---

## 3. Module 2: Không gian làm việc & nhóm

### 3.1. Bảng `[KhongGianLamViec]`

Workspace (multi-tenant): mỗi workspace thuộc một chủ sở hữu.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaKhongGian | BIGINT, PK | Mã workspace |
| MaChuSoHuu | BIGINT, FK → NguoiDung | Chủ sở hữu |
| TenKhongGian | NVARCHAR(200) | Tên workspace |
| DuongDan | VARCHAR(100), UNIQUE | Slug/đường dẫn (subdomain hoặc path) |
| Logo | NVARCHAR(500) | URL logo |
| MaGoiDichVu | INT, FK → GoiDichVu | Gói áp dụng cho workspace |
| LaMacDinh | BIT | Workspace mặc định của user |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 3.2. Bảng `[ThanhVienKhongGian]`

Thành viên trong workspace (phân quyền).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaThanhVien | BIGINT, PK | Mã thành viên |
| MaKhongGian | BIGINT, FK → KhongGianLamViec, CASCADE | Workspace |
| MaNguoiDung | BIGINT, FK → NguoiDung | Người dùng |
| VaiTro | VARCHAR(20) | `chunhom`, `quantri`, `biensoantho`, `xemthuong` |
| DuocMoiBoi | BIGINT, FK → NguoiDung | Người mời |
| NgayThamGia | DATETIME2 | Ngày tham gia |
| UNIQUE (MaKhongGian, MaNguoiDung) | | Một user chỉ có một vai trò trong một workspace |

---

## 4. Module 3: Tên miền

### 4.1. Bảng `[TenMien]`

Tên miền gắn với workspace (subdomain hoặc domain riêng).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaTenMien | BIGINT, PK | Mã tên miền |
| MaKhongGian | BIGINT, FK → KhongGianLamViec, CASCADE | Workspace |
| TenMien | NVARCHAR(255) | Tên miền (vd: shop.abc.com) |
| LoaiTenMien | VARCHAR(20) | `tenmienphu`, `rieng` |
| BatSSL | BIT | Bật SSL |
| NgayHetHanSSL | DATETIME2 | Hết hạn chứng chỉ SSL |
| NgayXacNhan | DATETIME2 | Ngày xác nhận DNS |
| TrangThai | VARCHAR(20) | `choxacnhan`, `hoatdong`, `hethan`, `loi` |
| BanGhiDNS | NVARCHAR(500) | Ghi chú bản ghi DNS (CNAME, A, …) |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

## 5. Module 4: Trang đích (Landing Page)

### 5.1. Bảng `[DanhMucTrang]`

Danh mục template (dùng cho thư viện mẫu).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDanhMuc | INT, PK | Mã danh mục |
| TenDanhMuc | NVARCHAR(100) | Tên (Tất cả, Thương mại điện tử, …) |
| MaDanhMucCha | INT, FK → DanhMucTrang | Danh mục cha (cây) |
| ThuTuSapXep | INT | Thứ tự hiển thị |

---

### 5.2. Bảng `[MauTrang]`

Template trang (mẫu dùng để tạo trang mới).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaMau | BIGINT, PK | Mã mẫu |
| MaDanhMuc | INT, FK → DanhMucTrang | Danh mục |
| TenMau | NVARCHAR(200) | Tên mẫu |
| AnhThumbnail | NVARCHAR(500) | Ảnh xem trước |
| URLXemTruoc | NVARCHAR(500) | Link xem trước |
| NoiDungTrang | NVARCHAR(MAX) | **JSON** cấu trúc trang (block/components) |
| NhanPhan | NVARCHAR(500) | Nhãn phân loại |
| NganhHang | NVARCHAR(100) | Ngành hàng (e-commerce, giao duc, …) |
| MienPhi | BIT | Miễn phí hay trả phí |
| GiaTien | DECIMAL(12,2) | Giá (nếu trả phí) |
| SoLanSuDung | BIGINT | Số lần được sử dụng |
| DangHoatDong | BIT | Đang hiển thị trong thư viện |
| NgayTao | DATETIME2 | Audit |

---

### 5.3. Bảng `[TrangDich]`

Landing page / trang đích do user tạo.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaTrang | BIGINT, PK | Mã trang |
| MaKhongGian | BIGINT, FK → KhongGianLamViec, CASCADE | Workspace |
| MaNguoiTao | BIGINT, FK → NguoiDung | Người tạo |
| MaMauTrang | BIGINT, FK → MauTrang | Mẫu gốc (nếu tạo từ template) |
| TenTrang | NVARCHAR(300) | Tên hiển thị |
| DuongDan | NVARCHAR(300) | Slug/đường dẫn (path) |
| MaTenMien | BIGINT, FK → TenMien | Tên miền gắn với trang |
| URLDayDu | NVARCHAR(500) | URL đầy đủ (sau khi publish) |
| LoaiTrang | VARCHAR(30) | `trangdich`, `popup`, `website`, `funnel` |
| TrangThai | VARCHAR(20) | `nhap`, `dadang`, `ngungdang`, `luutru` |
| NoiDungTrang | NVARCHAR(MAX) | **JSON** nội dung kéo-thả |
| TieuDeMetaTag, MoTaMetaTag, TuKhoaMetaTag | NVARCHAR | SEO |
| Favicon | NVARCHAR(500) | Favicon |
| MatKhauTrang | NVARCHAR(200) | Mật khẩu bảo vệ trang (nếu có) |
| DiemSEO | TINYINT | Điểm SEO (0–100) |
| ThuanThietBiDiDong | BIT | Responsive |
| NgayDang | DATETIME2 | Ngày publish |
| NgayHetHan | DATETIME2 | Ngày hết hạn (campaign) |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 5.4. Bảng `[LichSuPhienBanTrang]`

Version history của trang (undo/restore).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaPhienBan | BIGINT, PK | Mã phiên bản |
| MaTrang | BIGINT, FK → TrangDich, CASCADE | Trang |
| SoPhienBan | INT | Số thứ tự phiên bản |
| NoiDungTrang | NVARCHAR(MAX) | **JSON** snapshot nội dung |
| GhiChu | NVARCHAR(500) | Ghi chú phiên bản |
| MaNguoiTao | BIGINT, FK → NguoiDung | Người tạo phiên bản |
| NgayTao | DATETIME2 | Thời điểm |
| UNIQUE (MaTrang, SoPhienBan) | | Một trang có nhiều phiên bản, số PB duy nhất |

---

### 5.5. Bảng `[MaTheoDoiTrang]`

Mã tracking (Google Analytics, Facebook Pixel, TikTok, Zalo, Google Ads, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaTheoDoi | BIGINT, PK | Mã tracking |
| MaTrang | BIGINT, FK → TrangDich, CASCADE | Trang |
| NenTang | VARCHAR(50) | `google_analytics`, `facebook_pixel`, `tiktok`, `zalo`, `google_ads` |
| MaTrackingCode | NVARCHAR(500) | Nội dung script / ID |
| DangHoatDong | BIT | Bật/tắt |
| NgayTao | DATETIME2 | Audit |

---

## 6. Module 5: Cửa sổ bật lên (Popup)

### 6.1. Bảng `[CuaSoBatLen]`

Popup / thanh neo (sticky bar).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaCuaSo | BIGINT, PK | Mã popup |
| MaKhongGian | BIGINT, FK → KhongGianLamViec, CASCADE | Workspace |
| MaNguoiTao | BIGINT, FK → NguoiDung | Người tạo |
| TenCuaSo | NVARCHAR(300) | Tên |
| LoaiCuaSo | VARCHAR(30) | `popup`, `thanhneo` |
| NoiDung | NVARCHAR(MAX) | **JSON** nội dung |
| LoaiKichHoat | VARCHAR(50) | `thoigian`, `cuontrang`, `thoat`, `nhapchuot` |
| GiaTriKichHoat | NVARCHAR(200) | Giá trị (vd: số giây, % cuộn) |
| QuyTacHienThi | NVARCHAR(MAX) | **JSON** quy tắc hiển thị |
| TrangThai | VARCHAR(20) | `nhap`, … |
| MaNhung | NVARCHAR(MAX) | Mã nhúng (embed code) |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

## 7. Module 6: Biểu mẫu & Khách hàng tiềm năng

### 7.1. Bảng `[BieuMau]`

Form gắn với một trang (lead, đơn hàng, khảo sát, đăng ký).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaBieuMau | BIGINT, PK | Mã biểu mẫu |
| MaTrang | BIGINT, FK → TrangDich, CASCADE | Trang chứa form |
| TenBieuMau | NVARCHAR(200) | Tên form |
| LoaiBieuMau | VARCHAR(30) | `lead`, `donhang`, `khaosát`, `dangky` |
| ThongBaoThanhCong | NVARCHAR(500) | Thông báo sau khi gửi |
| URLChuyenHuong | NVARCHAR(500) | Redirect sau submit |
| EmailThongBao | NVARCHAR(500) | Danh sách email nhận thông báo (cách nhau dấu phẩy) |
| NgayTao | DATETIME2 | Audit |

---

### 7.2. Bảng `[TruongBieuMau]`

Các trường (field) của form.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaTruong | BIGINT, PK | Mã trường |
| MaBieuMau | BIGINT, FK → BieuMau, CASCADE | Biểu mẫu |
| TenTruong | VARCHAR(100) | Tên kỹ thuật (name) |
| NhanTruong | NVARCHAR(200) | Nhãn hiển thị |
| LoaiTruong | VARCHAR(30) | `vanban`, `email`, `dienthoai`, `so`, `chonlua`, `checkbox`, `radio`, `vanbandai`, `file` |
| BatBuoc | BIT | Bắt buộc |
| GiuCho | NVARCHAR(200) | Placeholder |
| GiaMacDinh | NVARCHAR(200) | Giá trị mặc định |
| LuaChon | NVARCHAR(MAX) | **JSON** mảng lựa chọn (dropdown/radio/checkbox) |
| QuyTacKiemTra | NVARCHAR(MAX) | **JSON** validation |
| ThuTuSapXep | INT | Thứ tự hiển thị |

---

### 7.3. Bảng `[KhachHangTiemNang]`

Lead / khách hàng tiềm năng từ form hoặc nhập tay.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaKhach | BIGINT, PK | Mã lead |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaBieuMau | BIGINT, FK → BieuMau | Form gửi (nếu có) |
| MaTrang | BIGINT, FK → TrangDich | Trang chứa form |
| HoTen, Email, SoDienThoai | NVARCHAR/VARCHAR | Thông tin cơ bản |
| DuLieuBieuMau | NVARCHAR(MAX) | **JSON** toàn bộ dữ liệu form |
| DiaChiIP, ThongTinTrinh | VARCHAR/NVARCHAR | IP, User-Agent |
| NguonUTM, KenhUTM, ChienDichUTM, NoiDungUTM, TuKhoaUTM | NVARCHAR(200) | UTM |
| TrangThaiKhach | VARCHAR(30) | `moi`, `dalienlac`, `tiennang`, `daconvert`, `matkhach` |
| NguoiPhuTrach | BIGINT, FK → NguoiDung | Owner (sales) |
| NhanPhan | NVARCHAR(500) | Tags |
| GhiChu | NVARCHAR(MAX) | Ghi chú |
| NgayGui | DATETIME2 | Thời điểm gửi form |
| NgayCapNhat | DATETIME2 | Audit |

---

## 8. Module 7: Sản phẩm & Thương mại điện tử

### 8.1. Bảng `[DanhMucSanPham]`

Danh mục sản phẩm trong workspace.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDanhMuc | INT, PK | Mã danh mục |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| TenDanhMuc | NVARCHAR(200) | Tên danh mục |
| MaDanhMucCha | INT, FK → DanhMucSanPham | Danh mục cha |
| ThuTuSapXep | INT | Thứ tự |

---

### 8.2. Bảng `[SanPham]`

Sản phẩm (vật lý, kỹ thuật số, dịch vụ).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaSanPham | BIGINT, PK | Mã sản phẩm |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaDanhMuc | INT, FK → DanhMucSanPham | Danh mục |
| MaSKU | NVARCHAR(100) | Mã SKU |
| TenSanPham | NVARCHAR(300) | Tên |
| LoaiSanPham | VARCHAR(20) | `vatly`, `kythuatso`, `dichvu` |
| MoTa, MoTaNgan | NVARCHAR(MAX), NVARCHAR(500) | Mô tả |
| GiaGoc | DECIMAL(14,2) | Giá gốc |
| GiaKhuyenMai | DECIMAL(14,2) | Giá khuyến mãi |
| DonViTien | VARCHAR(10) | VND, … |
| SoLuongTon | INT, NULL | Tồn kho; NULL = không giới hạn |
| TrongLuong | DECIMAL(8,2) | Cân nặng (kg) |
| AnhDaiDien | NVARCHAR(500) | Ảnh chính |
| DanhSachAnh | NVARCHAR(MAX) | **JSON** mảng ảnh |
| URLFile | NVARCHAR(500) | File (sản phẩm số) |
| TrangThai | VARCHAR(20) | `hoatdong`, … |
| ThuTuSapXep | INT | Thứ tự |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 8.3. Bảng `[BienTheSanPham]`

Biến thể (màu, size, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaBienThe | BIGINT, PK | Mã biến thể |
| MaSanPham | BIGINT, FK → SanPham, CASCADE | Sản phẩm |
| TenBienThe | NVARCHAR(200) | VD: "Đỏ - XL" |
| MaSKU | NVARCHAR(100) | SKU biến thể |
| Gia | DECIMAL(14,2) | Giá (nếu khác SP gốc) |
| SoLuongTon | INT | Tồn theo biến thể |
| ThuocTinh | NVARCHAR(MAX) | **JSON** (màu, size, …) |
| DangHoatDong | BIT | Ẩn/hiện |

---

## 9. Module 8: Đơn hàng

### 9.1. Bảng `[DonViVanChuyen]`

Đơn vị vận chuyển (GHN, GHTK, ViettelPost, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDonVi | INT, PK | Mã đơn vị |
| TenDonVi | NVARCHAR(100) | Tên (GHN, GHTK, …) |
| DangHoatDong | BIT | Bật/tắt |

---

### 9.2. Bảng `[DonHang]`

Đơn hàng.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDonHang | BIGINT, PK | Mã đơn |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaTrang | BIGINT, FK → TrangDich | Trang đặt hàng (nếu có) |
| MaKhachTiemNang | BIGINT, FK → KhachHangTiemNang | Lead (nếu có) |
| MaDonHangCode | NVARCHAR(50), UNIQUE | Mã đơn hiển thị (vd: #DH001) |
| TenKhachHang, EmailKhachHang, SdtKhachHang | NVARCHAR/VARCHAR | Thông tin khách |
| DiaChiGiaoHang, TinhThanh, QuanHuyen, PhuongXa | NVARCHAR | Địa chỉ |
| TamTinh | DECIMAL(14,2) | Tạm tính |
| PhiVanChuyen | DECIMAL(14,2) | Phí ship |
| SoTienGiam | DECIMAL(14,2) | Giảm giá |
| TongTien | DECIMAL(14,2) | Tổng thanh toán |
| DonViTien | VARCHAR(10) | VND |
| PhuongThucThanhToan | VARCHAR(50) | `cod`, `chuyenkhoan`, `momo`, `vnpay`, `zalopay` |
| TrangThaiThanhToan | VARCHAR(20) | `chothanhToan`, `dathanhtoan`, `thatbai`, `hoantien` |
| TrangThaiDonHang | VARCHAR(30) | `moi`, `xacnhan`, `xuly`, `dangvan`, `dagiao`, `dahuy`, `hoanhang` |
| MaDonViVanChuyen | INT, FK → DonViVanChuyen | Đơn vị ship |
| MaVanDon | NVARCHAR(200) | Mã vận đơn |
| GhiChu, LyDoHuy | NVARCHAR | Ghi chú / lý do hủy |
| NgayThanhToan, NgayGui, NgayGiaoHang | DATETIME2 | Các mốc thời gian |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 9.3. Bảng `[ChiTietDonHang]`

Chi tiết từng dòng trong đơn (sản phẩm + biến thể).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaChiTiet | BIGINT, PK | Mã dòng |
| MaDonHang | BIGINT, FK → DonHang, CASCADE | Đơn hàng |
| MaSanPham | BIGINT, FK → SanPham | Sản phẩm |
| MaBienThe | BIGINT, FK → BienTheSanPham | Biến thể (nếu có) |
| TenSanPham | NVARCHAR(300) | Snapshot tên lúc mua |
| TenBienThe | NVARCHAR(200) | Snapshot tên biến thể |
| DonGia | DECIMAL(14,2) | Đơn giá |
| SoLuong | INT | Số lượng |
| ThanhTien | DECIMAL(14,2) | Thành tiền |

---

### 9.4. Bảng `[MaGiamGia]`

Mã giảm giá / coupon.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaCoupon | BIGINT, PK | Mã coupon |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaCouponCode | NVARCHAR(50) | Code (SALE20, …) |
| LoaiGiam | VARCHAR(20) | `phantram`, `sotien` |
| GiaTriGiam | DECIMAL(12,2) | % hoặc số tiền |
| GiaTriDonToiThieu | DECIMAL(14,2) | Đơn tối thiểu được áp dụng |
| GiamToiDa | DECIMAL(12,2) | Giảm tối đa (với %) |
| GioiHanSuDung | INT | Số lần dùng tối đa |
| SoLanDaSuDung | INT | Đã dùng |
| NgayBatDau, NgayHetHan | DATETIME2 | Hiệu lực |
| DangHoatDong | BIT | Bật/tắt |
| NgayTao | DATETIME2 | Audit |
| UNIQUE (MaKhongGian, MaCouponCode) | | Code unique trong workspace |

---

## 10. Module 9: Quản lý khách hàng (CRM)

### 10.1. Bảng `[KhachHang]`

Hồ sơ khách hàng (từ lead convert hoặc nhập tay).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaKhachHang | BIGINT, PK | Mã khách |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaKhachTiemNang | BIGINT, FK → KhachHangTiemNang | Lead gốc (nếu có) |
| HoTen, Email, SoDienThoai | NVARCHAR/VARCHAR | Thông tin |
| GioiTinh | VARCHAR(10) | Giới tính |
| NgaySinh | DATE | Ngày sinh |
| DiaChi, TinhThanh | NVARCHAR | Địa chỉ |
| NguonKhach | VARCHAR(50) | `trangdich`, `thucong`, `nhapfile`, `api` |
| NhanPhan | NVARCHAR(500) | Tags |
| TruongTuyChon | NVARCHAR(MAX) | **JSON** trường tùy chỉnh |
| TongDonHang | INT | Tổng số đơn |
| TongChiTieu | DECIMAL(14,2) | Tổng chi tiêu |
| HoatDongCuoiCung | DATETIME2 | Hoạt động gần nhất |
| NguoiPhuTrach | BIGINT, FK → NguoiDung | Owner |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 10.2. Bảng `[LichSuHoatDong]`

Lịch sử tương tác (gọi điện, email, ghi chú, SMS, cuộc họp, đơn hàng).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaHoatDong | BIGINT, PK | Mã hoạt động |
| MaKhachHang | BIGINT, FK → KhachHang, CASCADE | Khách hàng |
| LoaiHoatDong | VARCHAR(50) | `goidien`, `email`, `ghichu`, `sms`, `cuochop`, `donhang` |
| TieuDe | NVARCHAR(300) | Tiêu đề |
| NoiDung | NVARCHAR(MAX) | Nội dung |
| NguoiThucHien | BIGINT, FK → NguoiDung | Người thực hiện |
| NgayTao | DATETIME2 | Thời điểm |

---

## 11. Module 10: Tự động hóa (Automation)

### 11.1. Bảng `[QuyTrinhTuDong]`

Workflow tự động (trigger + chuỗi bước).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaQuyTrinh | BIGINT, PK | Mã quy trình |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaNguoiTao | BIGINT, FK → NguoiDung | Người tạo |
| TenQuyTrinh | NVARCHAR(300) | Tên |
| LoaiKichHoat | VARCHAR(50) | `guibieumau`, `datdonhang`, `themnhan`, `lichhẹn`, `api` |
| CauHinhKichHoat | NVARCHAR(MAX) | **JSON** cấu hình trigger |
| TrangThai | VARCHAR(20) | `nhap`, `hoatdong`, `tamhoan` |
| SoLanThucThi | BIGINT | Số lần đã chạy |
| NgayTao, NgayCapNhat | DATETIME2 | Audit |

---

### 11.2. Bảng `[BuocTuDong]`

Từng bước trong quy trình (gửi email, SMS, Zalo, chờ, điều kiện, thêm nhãn, webhook, cập nhật khách).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaBuoc | BIGINT, PK | Mã bước |
| MaQuyTrinh | BIGINT, FK → QuyTrinhTuDong, CASCADE | Quy trình |
| LoaiBuoc | VARCHAR(50) | `guiemail`, `guisms`, `guizalo`, `cho`, `dieukien`, `themnhan`, `webhook`, `capnhatkhach` |
| CauHinhBuoc | NVARCHAR(MAX) | **JSON** cấu hình bước |
| ThoiGianCho | INT | Thời gian chờ (giây) trước bước tiếp |
| ThuTuSapXep | INT | Thứ tự trong quy trình |

---

### 11.3. Bảng `[NhatKyTuDong]`

Log mỗi lần automation chạy (cho contact/lead).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaNhatKy | BIGINT, PK | Mã log |
| MaQuyTrinh | BIGINT, FK → QuyTrinhTuDong | Quy trình |
| MaBuoc | BIGINT, FK → BuocTuDong | Bước (nếu log theo bước) |
| MaKhachHang | BIGINT, FK → KhachHang | Khách (nếu đã convert) |
| MaKhachTiemNang | BIGINT, FK → KhachHangTiemNang | Lead |
| TrangThai | VARCHAR(20) | `thanhcong`, `thatbai`, `boqua` |
| ThongBaoLoi | NVARCHAR(MAX) | Lỗi (nếu có) |
| NgayThucThi | DATETIME2 | Thời điểm chạy |

---

## 12. Module 11: Email Marketing

### 12.1. Bảng `[ChienDichEmail]`

Chiến dịch email (broadcast).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaChienDich | BIGINT, PK | Mã chiến dịch |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| TenChienDich | NVARCHAR(300) | Tên |
| TieuDe | NVARCHAR(500) | Tiêu đề email |
| TenNguoiGui, EmailNguoiGui | NVARCHAR | From name/email |
| NoiDungHTML, NoiDungVanBan | NVARCHAR(MAX) | Nội dung HTML & text |
| TrangThai | VARCHAR(20) | `nhap`, `lichhẹn`, `danggui`, `dagui`, `tamhoan` |
| NgayLichHen | DATETIME2 | Lịch gửi |
| NgayDaGui | DATETIME2 | Thời điểm đã gửi xong |
| TongDaGui | INT | Số email đã gửi |
| TongDaMo | INT | Số mở |
| TongDaNhapLink | INT | Số click |
| TongBiTra | INT | Bounce |
| TongHuyDangKy | INT | Unsubscribe |
| NgayTao | DATETIME2 | Audit |

---

### 12.2. Bảng `[DanhSachEmail]`

Danh sách email (list) để gửi campaign.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDanhSach | BIGINT, PK | Mã danh sách |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| TenDanhSach | NVARCHAR(200) | Tên list |
| SoThanhVien | INT | Số thành viên (cache) |
| NgayTao | DATETIME2 | Audit |

---

### 12.3. Bảng `[ThanhVienDanhSachEmail]`

Thành viên trong danh sách (email + trạng thái).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaThanhVien | BIGINT, PK | Mã thành viên |
| MaDanhSach | BIGINT, FK → DanhSachEmail, CASCADE | Danh sách |
| MaKhachHang | BIGINT, FK → KhachHang | Khách (nếu có) |
| Email | NVARCHAR(255) | Email |
| TrangThai | VARCHAR(20) | `dangky`, `hudangky`, `bitrove` |
| NgayDangKy | DATETIME2 | Ngày đăng ký |
| NgayHuyDangKy | DATETIME2 | Ngày hủy |
| UNIQUE (MaDanhSach, Email) | | Một email chỉ có một bản ghi trong một list |

---

## 13. Module 12: Thử nghiệm A/B

### 13.1. Bảng `[ThuNghiemAB]`

Thử nghiệm A/B trên một trang.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaThuNghiem | BIGINT, PK | Mã thử nghiệm |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaTrang | BIGINT, FK → TrangDich | Trang gốc |
| TenThuNghiem | NVARCHAR(300) | Tên |
| TrangThai | VARCHAR(20) | `dangchay`, `tamhoan`, `hoanthanh` |
| MaBienThangCuoc | BIGINT | Mã biến thể thắng (khi kết thúc) |
| NgayBatDau, NgayKetThuc | DATETIME2 | Thời gian chạy |
| NgayTao | DATETIME2 | Audit |

---

### 13.2. Bảng `[BienTheAB]`

Các biến thể (Control, A, B, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaBienThe | BIGINT, PK | Mã biến thể |
| MaThuNghiem | BIGINT, FK → ThuNghiemAB, CASCADE | Thử nghiệm |
| TenBienThe | NVARCHAR(100) | "Control", "Biến thể A", … |
| NoiDungTrang | NVARCHAR(MAX) | **JSON** nội dung phiên bản |
| PhanTramLuuLuong | TINYINT | % traffic (50 = 50%) |
| SoLuotTruyCap | BIGINT | Số view |
| SoLuotChuyenDoi | BIGINT | Số conversion |
| LaPhienBanGoc | BIT | True = bản gốc (control) |

---

## 14. Module 13: Phân tích & Thống kê

### 14.1. Bảng `[LuotTruyCap]`

Từng lượt truy cập trang (session/pageview).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaLuot | BIGINT, PK | Mã lượt |
| MaTrang | BIGINT, FK → TrangDich, CASCADE | Trang |
| MaKhachVienDanh | NVARCHAR(100) | Fingerprint / session ID (ẩn danh) |
| MaPhienLamViec | NVARCHAR(100) | Session ID (nếu đăng nhập) |
| DiaChiIP | VARCHAR(45) | IP |
| QuocGia, ThanhPho | NVARCHAR(100) | Geo |
| LoaiThietBi | VARCHAR(20) | `maytinhban`, `didong`, `maytinhbang` |
| TrinhDuyet, HeDieuHanh | NVARCHAR(100) | Browser, OS |
| TrangTruoc | NVARCHAR(500) | Referrer |
| NguonUTM, KenhUTM, ChienDichUTM, NoiDungUTM, TuKhoaUTM | NVARCHAR(200) | UTM |
| ThoiGianXemTrang | INT | Thời gian xem (giây) |
| DoCuonTrang | TINYINT | % scroll (0–100) |
| DaChuyenDoi | BIT | Có conversion (submit form, mua hàng, …) |
| NgayTruyCap | DATETIME2 | Thời điểm |

---

### 14.2. Bảng `[SuKienTrang]`

Sự kiện trên trang (click, xem form, gửi form, xem video, cuộn).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaSuKien | BIGINT, PK | Mã sự kiện |
| MaTrang | BIGINT, FK → TrangDich | Trang |
| MaKhachVienDanh | NVARCHAR(100) | Fingerprint |
| LoaiSuKien | VARCHAR(50) | `nhap`, `xembieumau`, `guibieumau`, `xemvideo`, `cuontrang` |
| MaPhanTu | NVARCHAR(200) | ID phần tử (button, form, …) |
| TenPhanTu | NVARCHAR(200) | Tên hiển thị |
| DuLieuSuKien | NVARCHAR(MAX) | **JSON** dữ liệu bổ sung |
| NgayTao | DATETIME2 | Thời điểm |

---

### 14.3. Bảng `[ThongKeTrangNgay]`

Thống kê tổng hợp theo trang theo ngày (aggregate).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaThongKe | BIGINT, PK | Mã thống kê |
| MaTrang | BIGINT, FK → TrangDich, CASCADE | Trang |
| NgayThongKe | DATE | Ngày |
| TongLuotTruyCap | BIGINT | Tổng pageview |
| LuotTruyCapDuyNhat | BIGINT | Unique visitor (ước tính) |
| TongChuyenDoi | BIGINT | Số conversion |
| TyLeChuyenDoi | DECIMAL(5,2) | % conversion |
| TgXemTrangTrungBinh | INT | Thời gian xem trung bình (giây) |
| TyLeThoatSom | DECIMAL(5,2) | Bounce rate |
| UNIQUE (MaTrang, NgayThongKe) | | Một bản ghi/trang/ngày |

---

## 15. Module 14: Thư viện tài nguyên (Media)

### 15.1. Bảng `[ThuVienFile]`

File đã upload (ảnh, video, tài liệu, phông chữ).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaFile | BIGINT, PK | Mã file |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| MaNguoiTai | BIGINT, FK → NguoiDung | Người upload |
| TenFile | NVARCHAR(300) | Tên file |
| LoaiFile | VARCHAR(50) | `hinhanh`, `video`, `tailieu`, `phongchu` |
| KieuFile | VARCHAR(100) | MIME type |
| DungLuong | BIGINT | Kích thước (bytes) |
| URLLuuTru | NVARCHAR(500) | URL gốc (Cloudinary/S3) |
| URLCDN | NVARCHAR(500) | URL CDN (nếu có) |
| ChieuRong, ChieuCao | INT | Kích thước ảnh/video |
| VanBanAlt | NVARCHAR(300) | Alt text |
| NhanPhan | NVARCHAR(500) | Tags |
| NgayTao | DATETIME2 | Audit |

---

## 16. Module 15: Thông báo

### 16.1. Bảng `[ThongBao]`

Thông báo in-app cho user.

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaThongBao | BIGINT, PK | Mã thông báo |
| MaNguoiDung | BIGINT, FK → NguoiDung, CASCADE | Người nhận |
| TieuDe | NVARCHAR(300) | Tiêu đề |
| NoiDung | NVARCHAR(MAX) | Nội dung |
| LoaiThongBao | VARCHAR(50) | `thongtin`, `thanhcong`, `canhbao`, `loi` |
| LoaiLienQuan | VARCHAR(50) | `trang`, `donhang`, `khach`, `chiendich` |
| MaLienQuan | BIGINT | ID bản ghi liên quan |
| DaDoc | BIT | Đã đọc |
| NgayDoc | DATETIME2 | Thời điểm đọc |
| NgayTao | DATETIME2 | Thời điểm tạo |

---

## 17. Module 16: Tích hợp bên ngoài

### 17.1. Bảng `[TichHopNgoai]`

Tích hợp bên thứ 3 (Mailchimp, GetResponse, Google Sheet, CRM, webhook, Zalo, Facebook, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaTichHop | BIGINT, PK | Mã tích hợp |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| LoaiTichHop | VARCHAR(50) | Loại (mailchimp, getresponse, …) |
| TenTichHop | NVARCHAR(200) | Tên hiển thị |
| CauHinh | NVARCHAR(MAX) | **JSON** mã hóa (API key, token) |
| DangHoatDong | BIT | Bật/tắt |
| NgayDongBoGanNhat | DATETIME2 | Lần đồng bộ gần nhất |
| NgayTao | DATETIME2 | Audit |

---

### 17.2. Bảng `[WebhookNgoai]`

Webhook gửi ra ngoài khi có sự kiện (gửi form, đặt hàng, …).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaWebhook | BIGINT, PK | Mã webhook |
| MaKhongGian | BIGINT, FK → KhongGianLamViec | Workspace |
| TenWebhook | NVARCHAR(200) | Tên |
| URLDauNhan | NVARCHAR(500) | URL endpoint |
| SuKienLangNghe | NVARCHAR(500) | **JSON** mảng sự kiện: `guibieumau`, `datdonhang`, … |
| KhoaBiMat | NVARCHAR(200) | Secret key (header/x-signature) |
| DangHoatDong | BIT | Bật/tắt |
| TongSoLanGoi | BIGINT | Số lần đã gọi |
| NgayGoiGanNhat | DATETIME2 | Lần gọi gần nhất |
| NgayTao | DATETIME2 | Audit |

---

## 18. Module 17: Đối tác & Liên kết (Affiliate)

### 18.1. Bảng `[DoiTacLienKet]`

Đối tác affiliate (tỷ lệ hoa hồng, số dư, thanh toán).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaDoiTac | BIGINT, PK | Mã đối tác |
| MaNguoiDung | BIGINT, UNIQUE, FK → NguoiDung | User đối tác (1 user = 1 đối tác) |
| TyLeHoaHong | DECIMAL(5,2) | % hoa hồng (vd: 40.00) |
| TongThuNhap | DECIMAL(14,2) | Tổng thu nhập |
| TongDaThanhToan | DECIMAL(14,2) | Đã thanh toán |
| SoDu | DECIMAL(14,2) | Số dư còn lại |
| ThongTinNganHang | NVARCHAR(MAX) | **JSON** thông tin ngân hàng |
| TrangThai | VARCHAR(20) | `hoatdong`, … |
| NgayThamGia | DATETIME2 | Ngày tham gia chương trình |

---

### 18.2. Bảng `[GiaoDichDoiTac]`

Giao dịch affiliate (hoa hồng từ đăng ký, thanh toán cho đối tác).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| MaGiaoDich | BIGINT, PK | Mã giao dịch |
| MaDoiTac | BIGINT, FK → DoiTacLienKet | Đối tác |
| MaNguoiDuocGioiThieu | BIGINT, FK → NguoiDung | User được giới thiệu |
| MaDangKyGoi | BIGINT, FK → DangKyGoi | Đăng ký gói (sinh hoa hồng) |
| LoaiGiaoDich | VARCHAR(20) | `hoahong`, `thanhtoan` |
| SoTien | DECIMAL(12,2) | Số tiền |
| TrangThai | VARCHAR(20) | `choxacnhan`, `duyetr`, `dathanhtoan` |
| NgayTao | DATETIME2 | Thời điểm |

---

## 19. Chỉ mục (Indexes)

Các index đã khai báo trong script (tối ưu truy vấn thường dùng):

| Bảng | Index | Cột |
|------|--------|-----|
| NguoiDung | IX_NguoiDung_Email | Email |
| NguoiDung | IX_NguoiDung_MaGoi | MaGoiHienTai |
| TrangDich | IX_TrangDich_KhongGian | MaKhongGian |
| TrangDich | IX_TrangDich_TrangThai | TrangThai |
| TrangDich | IX_TrangDich_NgayTao | NgayTao DESC |
| KhachHangTiemNang | IX_KhachTiemNang_* | MaKhongGian, MaTrang, Email, SoDienThoai, NgayGui DESC |
| DonHang | IX_DonHang_* | MaKhongGian, TrangThaiDonHang, TrangThaiThanhToan, NgayTao DESC, SdtKhachHang |
| LuotTruyCap | IX_LuotTruyCap_* | MaTrang, NgayTruyCap DESC, NguonUTM |
| KhachHang | IX_KhachHang_* | MaKhongGian, Email, SoDienThoai |
| NhatKyTuDong | IX_NhatKyTuDong_* | MaQuyTrinh, MaKhachHang, NgayThucThi DESC |

---

## 20. Dữ liệu mẫu

Script chèn sẵn:

- **GoiDichVu:** 5 gói: Miễn phí, Starter, Pro, Business, Enterprise (giá, số trang, tính năng).
- **DanhMucTrang:** Danh mục template: Tất cả, Thương mại điện tử, Giáo dục, F&B, Bất động sản, Sự kiện, Dịch vụ, Tuyển dụng, Y tế, Du lịch.
- **DonViVanChuyen:** GHN, GHTK, Viettel Post, J&T, Vietnam Post.

---

## 21. Sơ đồ quan hệ chính

```
NguoiDung ──┬── PhienDangNhap
            ├── DangKyGoi ──► GoiDichVu
            ├── KhongGianLamViec (MaChuSoHuu) ──┬── ThanhVienKhongGian
            │                                    ├── TenMien
            │                                    ├── TrangDich ──┬── LichSuPhienBanTrang
            │                                    │               ├── MaTheoDoiTrang
            │                                    │               ├── BieuMau ──► TruongBieuMau
            │                                    │               ├── KhachHangTiemNang
            │                                    │               ├── DonHang ──► ChiTietDonHang
            │                                    │               ├── ThuNghiemAB ──► BienTheAB
            │                                    │               ├── LuotTruyCap, SuKienTrang, ThongKeTrangNgay
            │                                    │               └── ...
            │                                    ├── CuaSoBatLen
            │                                    ├── SanPham, DonHang, MaGiamGia
            │                                    ├── KhachHang ──► LichSuHoatDong
            │                                    ├── QuyTrinhTuDong ──► BuocTuDong, NhatKyTuDong
            │                                    ├── ChienDichEmail, DanhSachEmail
            │                                    ├── ThuVienFile, TichHopNgoai, WebhookNgoai
            │                                    └── ...
            ├── ThongBao
            └── DoiTacLienKet ──► GiaoDichDoiTac
```

---

*Tài liệu mô tả mô hình dữ liệu; schema thực tế do migration EF Core áp dụng. Cập nhật khi đổi entity/migration.*
