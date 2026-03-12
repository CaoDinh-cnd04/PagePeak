# Frontend — PagePeak (React.js / Next.js 15)

Giao diện web thương hiệu PagePeak: trang chủ (header/footer theo kiểu landing), đăng nhập, đăng ký, dashboard workspaces. Kết nối Backend API (Auth + Workspaces).

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19
- **Styling:** Tailwind CSS
- **State:** Zustand (auth store)
- **API:** Fetch tới Backend (JWT trong localStorage)

## Cấu trúc

```
Frontend/
├── src/
│   ├── app/              # Trang: /, /login, /register, /dashboard
│   ├── components/       # Button, Input, Card, DashboardLayout
│   ├── lib/              # api.ts (authApi, workspacesApi), auth.ts
│   └── stores/           # authStore.ts (Zustand)
├── .env.local            # NEXT_PUBLIC_API_URL
└── package.json
```

## Chạy dự án

```bash
cd Frontend
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

**Lưu ý:** Backend API phải chạy tại `http://localhost:5000` (hoặc sửa `NEXT_PUBLIC_API_URL` trong `.env.local`).

## Trang hiện có

| Đường dẫn | Mô tả |
|-----------|--------|
| / | Trang chủ, nút Đăng nhập / Đăng ký / Dashboard |
| /login | Form đăng nhập |
| /register | Form đăng ký |
| /dashboard | Danh sách workspace, tạo workspace mới (cần đăng nhập) |

## Biến môi trường

- **NEXT_PUBLIC_API_URL** — URL Backend API (mặc định: http://localhost:5000)
