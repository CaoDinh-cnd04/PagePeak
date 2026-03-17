# Backend — LadiPage API (.NET 10)

API server cho Landing Page SaaS: REST API, JWT auth, CQRS (MediatR), SQL Server.

## Tech stack

- **Runtime:** .NET 10
- **API:** ASP.NET Core Minimal API + MediatR
- **Kiến trúc:** Clean Architecture + CQRS, Vertical Slice (Auth, Workspaces)
- **Database:** SQL Server (LadiPageDB)
- **Auth:** JWT + Refresh Token (BCrypt)

## Cấu trúc solution

```
Backend/
├── LadiPage.sln
├── src/
│   ├── LadiPage.Core/           # Entities, Interfaces (IAppDbContext, IAuthService, ICurrentUser, IDateTime)
│   ├── LadiPage.Application/     # MediatR, CQRS, Validators (Features/Auth, Features/Workspaces)
│   ├── LadiPage.Infrastructure/  # EF Core, AppDbContext, AuthService, JwtService
│   └── LadiPage.Api/             # Minimal API, JWT, CORS, Swagger
└── README.md
```

## Database

1. Chạy script SQL tạo database và bảng (từ thư mục gốc repo):
   ```bash
   # Dùng sqlcmd hoặc SQL Server Management Studio chạy file LadiPageDB.sql
   ```
2. Sửa connection string trong `src/LadiPage.Api/appsettings.json` hoặc tạo `appsettings.Development.json` (copy từ `appsettings.Development.example.json`) cho môi trường dev.

### Lỗi "Cannot open database LadiPageDB" / "Login failed"

- **Đảm bảo đã tạo database:** Mở SQL Server Management Studio (hoặc sqlcmd), kết nối tới server, chạy file `LadiPageDB.sql` để tạo database và các bảng.
- **Đúng tên server:** Nếu dùng **LocalDB** (thường có khi cài Visual Studio), đổi connection string thành:
  ```
  Server=(localdb)\MSSQLLocalDB;Database=LadiPageDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
  ```
- Nếu dùng **SQL Server Express**: thử `Server=.\SQLEXPRESS;Database=LadiPageDB;...` (giữ nguyên phần sau).
- **Quyền truy cập:** User Windows đăng nhập máy (vd: `LAPTOP-xxx\ASUS`) cần được SQL Server cho phép login và có quyền trên database LadiPageDB. Trong SSMS: Security → Logins → chuột phải user Windows → Enable; Database LadiPageDB → Security → Users → thêm user và gán quyền db_owner (hoặc tối thiểu cần thiết).
- **Kiểm tra API đang kết nối DB nào:** Mở `http://localhost:5000/api/debug/db` để xem `dataSource` và `database` (tránh nhầm instance nên “không thấy dữ liệu” trong SSMS).
- **Thử LocalDB:** Nếu máy bạn chỉ có LocalDB, đổi connection string sang `Server=(localdb)\MSSQLLocalDB` và chạy script tạo database trên LocalDB (từ thư mục Backend): `.\create-database-localdb.ps1` (cần có `sqlcmd`, thường đi kèm SSMS). Nếu chưa có LocalDB: `sqllocaldb start MSSQLLocalDB`.

## Cài .NET 10 SDK (nếu chưa có)

Mở https://dotnet.microsoft.com/en-us/download/dotnet/10.0 → **Build apps - SDK** → **SDK 10.0.200** → Windows → **x64**. Sau khi cài, chạy `dotnet --version` để kiểm tra.

## Chạy dự án

```bash
cd Backend
dotnet restore
dotnet run --project src/LadiPage.Api
```

Mở trình duyệt: **http://localhost:5000/swagger**

## API endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | /api/auth/register | No | Đăng ký (Email, Password, FullName) |
| POST | /api/auth/login | No | Đăng nhập → AccessToken, RefreshToken |
| POST | /api/auth/refresh | No | Đổi token (body: RefreshToken) |
| POST | /api/auth/revoke | Bearer | Thu hồi refresh token |
| GET | /api/auth/me | Bearer | Thông tin user hiện tại |
| GET | /api/workspaces | Bearer | Danh sách workspace |
| GET | /api/workspaces/{id} | Bearer | Chi tiết workspace |
| POST | /api/workspaces | Bearer | Tạo workspace (Name, Slug) |

## Config (appsettings.json)

- **ConnectionStrings:DefaultConnection** — SQL Server, database LadiPageDB
- **JwtSettings:Secret** — Chuỗi bí mật (≥ 32 ký tự)
- **JwtSettings:Issuer**, **Audience** — JWT issuer/audience
- **Cors:Origins** — Mảng origin frontend (vd: http://localhost:5173)
- **Frontend:BaseUrl** — URL frontend để redirect sau OAuth (vd: http://localhost:5173)
- **Authentication:Google:ClientId**, **ClientSecret** — Đăng ký tại [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Authentication:Facebook:AppId**, **AppSecret** — Đăng ký tại [Facebook for Developers](https://developers.facebook.com/). Callback URL: `https://your-api/signin-facebook`
- **Recaptcha:SecretKey** — (Tùy chọn) Google reCAPTCHA v2 secret key để xác thực khi đăng ký. Lấy tại [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
