# System Architecture — Landing Page SaaS Platform

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (SPA)                                   │
│  React 18 · Vite · Zustand · Fabric.js                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        REST API (ASP.NET Core 10)                         │
│  Minimal API / Carter · MediatR · CQRS · JWT + Refresh Token             │
└─────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
        │  SQL Server   │    │  Cloudinary   │    │  Hangfire     │
        │  (Primary DB) │    │  / S3 + CDN   │    │  (Jobs)       │
        └───────────────┘    └───────────────┘    └───────────────┘
```

**Mô hình:** Client-Server (SPA + REST API + Cloud Storage)

---

## Frontend Architecture

| Thành phần | Công nghệ / Ghi chú |
|------------|----------------------|
| **UI** | Component-based, Atomic Design |
| **State** | Zustand + Immer (nhẹ, dễ debug cho builder) |
| **Builder** | Fabric.js (canvas drag & drop) |
| **Routing** | React Router v7 |

---

## Backend Architecture

| Thành phần | Công nghệ / Ghi chú |
|------------|----------------------|
| **API style** | Minimal API + Carter hoặc MediatR |
| **Structure** | Clean Architecture + CQRS (MediatR) |
| **Slices** | Vertical Slice Architecture theo feature |
| **Cross-cutting** | Rate limiting, Audit log, Background jobs (Hangfire) |

---

## Monolith vs Microservices

| Giai đoạn | Chiến lược | Lý do |
|-----------|------------|--------|
| **MVP & Phase 2** | **Monolith** | Dễ maintain, deploy nhanh, team nhỏ |
| **Scale (>10k active users)** | Tách **Publish Service** & **Analytics Service** | Tách khi cần scale và độ phức tạp tăng |

---

## Hosting & Deployment

| Thành phần | Nền tảng gợi ý |
|------------|-----------------|
| Frontend | Vercel hoặc Netlify |
| Backend | Azure hoặc AWS |
| Database | Supabase hoặc Neon (serverless) / SQL Server managed |

---

## Thư mục dự án

```
He thong LadingPages/
├── Backend/                  # ASP.NET Core 10 Web API
│   ├── src/
│   │   └── Api/              # Minimal API + MediatR
│   │       ├── Features/     # Vertical slices
│   │       ├── Infrastructure/
│   │       └── ...
│   └── README.md
├── Frontend-ui/              # React.js — Vite (builder + customer)
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Trang
│   │   └── stores/            # Zustand
│   └── README.md
├── docs/
└── README.md
```
