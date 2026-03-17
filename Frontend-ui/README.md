# Frontend-ui — React (Vite)

Giao diện React.js được chuyển từ Next.js Frontend, sử dụng Vite làm bundler.

## Công nghệ

- **React 18** + TypeScript
- **Vite** — Build tool
- **React Router v7** — Điều hướng
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **Lucide React** — Icons
- **Fabric.js** — Editor canvas
- **Framer Motion** — Animation

## Chạy dự án

```bash
# Cài đặt dependencies (nếu chưa)
npm install

# Chạy dev server (http://localhost:5173)
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

## Cấu hình

Tạo file `.env` (hoặc dùng `.env.example`):

```
VITE_API_URL=http://localhost:5000
```

## Cấu trúc

```
src/
├── components/     # UI components
├── pages/          # Trang (Home, Login, Dashboard, ...)
├── stores/         # Zustand stores
├── lib/            # API, auth, i18n
├── types/          # TypeScript types
└── data/           # Data
```

## Routes

- `/` — Trang chủ
- `/login` — Đăng nhập
- `/register` — Đăng ký
- `/dashboard` — Dashboard (trang chính)
- `/dashboard/pages` — Danh sách Landing Pages
- `/dashboard/settings` — Cài đặt
- `/dashboard/templates` — Templates
- `/dashboard/editor/:id` — Editor
