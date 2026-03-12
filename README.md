# Landing Page SaaS Platform

Nền tảng no-code/low-code xây dựng landing page kéo-thả, publish nhanh, thu thập lead. Multi-tenant, workspace riêng cho từng user.

## Tài liệu

- **[System Overview](docs/SYSTEM_OVERVIEW.md)** — Mô tả tổng quan, đối tượng dùng, chức năng chính
- **[Architecture](docs/ARCHITECTURE.md)** — Kiến trúc Frontend/Backend, hosting, monolith vs microservices

## Tech stack

| Layer     | Stack |
|----------|--------|
| Frontend | Next.js 15 (App Router), React, Zustand, GrapesJS / React DnD |
| Backend  | ASP.NET Core 10 Web API, MediatR, CQRS |
| Database | SQL Server |
| Storage  | Cloudinary (ưu tiên) / AWS S3 + CloudFront |
| Auth     | JWT + Refresh Token |

## Cấu trúc repo

```
├── Backend/            # ASP.NET Core 10 Web API
│   ├── src/
│   └── README.md
├── Frontend/           # React.js — Next.js 15 (builder + customer pages)
│   ├── app/
│   ├── components/
│   └── README.md
├── docs/
└── README.md
```

## Chạy dự án

### Frontend (React — Next.js 15)

```bash
cd Frontend
pnpm install
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Backend (ASP.NET Core 10)

```bash
cd Backend
dotnet restore
dotnet run --project src/Api
```

API: [http://localhost:5000](http://localhost:5000) (hoặc port trong `launchSettings.json`).

### Biến môi trường

- **Frontend:** `.env.local` — cấu hình `NEXT_PUBLIC_API_URL`.
- **Backend:** connection string, JWT secret trong `appsettings.Development.json` hoặc User Secrets.

## License

Proprietary.
