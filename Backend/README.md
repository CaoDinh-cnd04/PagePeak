# Backend — LadiPage API (.NET 10)

API server cho Landing Page SaaS: REST API, JWT auth, CQRS (MediatR), SQL Server.

## Tech stack

- **Runtime:** .NET 10
- **API:** ASP.NET Core Minimal API + MediatR
- **Kiến trúc:** Clean Architecture + CQRS, Vertical Slice (Auth, Workspaces)
- **Database:** SQL Server (LadiPageDB)
- **Auth:** JWT + Refresh Token (BCrypt)

## Cấu trúc solution (Clean Architecture + OOP)

```
Backend/
├── LadiPage.sln
├── src/
│   ├── LadiPage.Domain/         # Domain layer
│   │   ├── Entities/            # User, Page, Lead, Workspace, CustomDomain...
│   │   ├── Interfaces/          # IAppDbContext, IAuthService, IRepository...
│   │   ├── Common/              # BaseEntity, IAuditableEntity
│   │   ├── Enums/               # PageStatus, UserStatus
│   │   └── Auth/                # AuthTokenResult
│   ├── LadiPage.Application/    # MediatR, CQRS, Validators (Features/*)
│   ├── LadiPage.Infrastructure/  # EF Core, AppDbContext, AuthService, JwtService
│   └── LadiPage.Api/            # Minimal API, JWT, CORS, Swagger
└── README.md
```

## Database (code-first, EF Core)

Schema nguồn sự thật là **`AppDbContext` + thư mục `LadiPage.Infrastructure/Migrations`**. Không dùng script SQL riêng để tạo bảng ban đầu.

1. **Connection string:** `src/LadiPage.Api/appsettings.json` hoặc `appsettings.Local.json` (gitignored) — trỏ tới SQL Server / LocalDB.
2. **Chạy API:** Ở startup, nếu có quyền tạo DB thì tạo `LadiPageDB` (nếu chưa có), sau đó **`Database.MigrateAsync()`** áp dụng toàn bộ migration.
3. **Thêm / đổi model:** sửa entity + `AppDbContext`, rồi tạo migration:
   ```bash
   cd Backend/src/LadiPage.Api
   dotnet ef migrations add TenMoTaThayDoi --project ../LadiPage.Infrastructure/LadiPage.Infrastructure.csproj
   ```
   Commit file migration mới; deploy sẽ `Migrate` tự động.

**DB dev trống:** Chỉ cần connection string đúng — lần chạy đầu API sẽ tạo DB và bảng qua migration.

**DB cũ từng tạo bằng SQL tay:** Cần đồng bộ `__EFMigrationsHistory` với schema thực tế (hoặc backup dữ liệu, tạo DB mới chỉ bằng migration). Không còn bước “baseline stamp” trong code.

### Lỗi "Cannot open database LadiPageDB" / "Login failed"

- **Đảm bảo SQL Server chạy** và user trong connection string có quyền (hoặc `Trusted_Connection` đúng).
- **Đúng tên server:** Nếu dùng **LocalDB** (thường có khi cài Visual Studio), đổi connection string thành:
  ```
  Server=(localdb)\MSSQLLocalDB;Database=LadiPageDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
  ```
- Nếu dùng **SQL Server Express**: thử `Server=.\SQLEXPRESS;Database=LadiPageDB;...` (giữ nguyên phần sau).
- **Quyền truy cập:** User Windows đăng nhập máy (vd: `LAPTOP-xxx\ASUS`) cần được SQL Server cho phép login và có quyền trên database LadiPageDB. Trong SSMS: Security → Logins → chuột phải user Windows → Enable; Database LadiPageDB → Security → Users → thêm user và gán quyền db_owner (hoặc tối thiểu cần thiết).
- **Kiểm tra API đang kết nối DB nào:** Mở `http://localhost:5000/api/debug/db` để xem `dataSource` và `database` (tránh nhầm instance nên “không thấy dữ liệu” trong SSMS).
- **LocalDB:** Đổi connection string `Server=(localdb)\MSSQLLocalDB;Database=LadiPageDB;...` rồi chạy API — migration sẽ tạo bảng. Nếu chưa start: `sqllocaldb start MSSQLLocalDB`.

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
