# System Overview — Landing Page SaaS Platform

## Mô tả tổng quan

Hệ thống là **nền tảng SaaS no-code/low-code** cho phép người dùng **kéo-thả** xây dựng landing page chuyên nghiệp trong vòng vài phút, **publish** ngay lập tức và **thu thập lead** tự động. Hệ thống hoạt động theo mô hình **multi-tenant**: mỗi user có không gian riêng (workspace), dữ liệu hoàn toàn tách biệt.

---

## Đối tượng người dùng

| Nhóm | Mô tả |
|------|--------|
| **Marketer** | Chủ doanh nghiệp nhỏ & vừa cần landing page nhanh |
| **Agency** | Agency marketing/digital quản lý nhiều client |
| **Freelancer** | Thiết kế web cần công cụ chuyên nghiệp |
| **Doanh nghiệp** | Cần landing page cho campaign (sale, event, lead gen) |

---

## Các chức năng chính

| # | Chức năng | Mô tả |
|---|-----------|--------|
| 1 | **Drag & Drop Builder** | Xây dựng landing page kéo-thả trực quan |
| 2 | **Template Library** | Thư viện template sẵn (hàng trăm mẫu) |
| 3 | **Publish & Hosting** | Publish tức thì, hỗ trợ custom domain |
| 4 | **Lead & Form** | Quản lý lead & form thông minh |
| 5 | **Analytics & Tracking** | Conversion, traffic, phân tích |
| 6 | **Asset Manager** | Media library, quản lý file |
| 7 | **SEO & Performance** | Tối ưu SEO và hiệu năng |
| 8 | **Team & RBAC** | Team collaboration & role-based access |

---

## Công nghệ tổng quan

- **Frontend:** React (Next.js 15 App Router) — SSR tốt cho SEO  
- **Backend:** ASP.NET Core 10 Web API  
- **Database:** SQL Server  
- **Storage:** Cloudinary (ưu tiên) hoặc AWS S3 + CloudFront  
- **Auth:** JWT + Refresh Token (Identity + custom)  
- **Hosting:** Frontend Vercel/Netlify, Backend Azure/AWS, DB Supabase/Neon (serverless)
