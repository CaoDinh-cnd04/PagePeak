# Landing Page SaaS Platform

Nền tảng no-code/low-code xây dựng landing page kéo-thả, publish nhanh, thu thập lead. Multi-tenant, workspace riêng cho từng user.

## Tài liệu

- **[System Overview](docs/SYSTEM_OVERVIEW.md)** — Mô tả tổng quan, đối tượng dùng, chức năng chính
- **[Architecture](docs/ARCHITECTURE.md)** — Kiến trúc Frontend/Backend, hosting, monolith vs microservices

## Tech stack

| Layer     | Stack |
|----------|--------|
| Frontend | React 18, Vite, Zustand, Fabric.js |
| Backend  | ASP.NET Core 10 Web API, MediatR, CQRS |
| Database | SQL Server |
| Storage  | Cloudinary (ưu tiên) / AWS S3 + CloudFront |
| Auth     | JWT + Refresh Token |

## Cấu trúc repo

```
├── Backend/            # ASP.NET Core 10 Web API
│   ├── src/
│   └── README.md
├── Frontend-ui/       # React.js — Vite (builder + customer pages)
│   ├── src/
│   └── README.md
├── docs/
└── README.md
```

## Chạy dự án

### Frontend (React — Vite)

```bash
cd Frontend-ui
npm install
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173).

### Backend (ASP.NET Core 10)

```bash
cd Backend
dotnet restore
dotnet run --project src/Api
```

API: [http://localhost:5000](http://localhost:5000) (hoặc port trong `launchSettings.json`).

### Biến môi trường

- **Frontend:** `.env` — cấu hình `VITE_API_URL`.
- **Backend:** connection string, JWT secret trong `appsettings.Development.json` hoặc User Secrets.

## License

Proprietary.
