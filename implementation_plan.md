# Hệ Thống Quản Lý Ticket & Shape Up — Implementation Plan

## Tổng quan

Xây dựng hệ thống Helpdesk/Ticketing kết hợp Knowledge Base (Shape Up) bằng **Next.js 15 (App Router)** + **Supabase** (Auth, PostgreSQL, Storage, Realtime). Giao diện tiếng Việt, responsive, thiết kế premium dark mode.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Backend | Supabase (Auth + DB + Storage + Realtime) + Next.js API Routes (logic phức tạp) |
| Database | PostgreSQL (Supabase) + pgvector extension |
| Storage | Supabase Storage (bucket `attachments`) |
| Rich Text | TipTap (headless, `@tiptap/react` + `@tiptap/starter-kit`) |
| Image Compress | `browser-image-compression` (client-side, max 500KB) |
| CAPTCHA | Google reCAPTCHA v3 |
| AI | Gemini API (`text-embedding-004` cho semantic search, `gemini-2.0-flash` cho suggest) |
| Notifications | Supabase Realtime (`postgres_changes`) + bảng `notifications` |
| CSS | Vanilla CSS (design system custom) |
| Font | Inter (Google Fonts) |

---

## Cấu trúc thư mục

```
d:\Quyetnm\Dev\Helpdesk\
├── src/
│   ├── app/
│   │   ├── (public)/              # Public routes (no auth)
│   │   │   ├── portal/            # Module 1: Public Ticket Portal
│   │   │   └── login/             # Login page
│   │   ├── (dashboard)/           # Protected routes (auth required)
│   │   │   ├── tickets/           # Module 2: Ticket Manager
│   │   │   ├── shapeups/          # Module 3: Shape Up Manager
│   │   │   ├── admin/             # Module 4: Admin Panel
│   │   │   ├── dashboard/         # Module 5: Dashboards
│   │   │   └── settings/          # Settings (API key Gemini)
│   │   ├── api/                   # API Routes
│   │   │   ├── tickets/
│   │   │   ├── shapeups/
│   │   │   ├── ai/                # AI search/suggest
│   │   │   ├── upload/            # File upload handler
│   │   │   └── recaptcha/         # CAPTCHA verification
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # Reusable UI (Button, Modal, Badge...)
│   │   ├── layout/                # Sidebar, Header, NotificationBell
│   │   ├── tickets/               # Ticket-specific components
│   │   ├── shapeups/              # ShapeUp-specific components
│   │   └── editor/                # TipTap editor wrapper
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser client
│   │   │   ├── server.ts          # Server client
│   │   │   └── middleware.ts      # Auth middleware helpers
│   │   ├── ai/                    # Gemini API helpers
│   │   ├── utils/                 # Helpers (image compress, format...)
│   │   └── types/                 # TypeScript types
│   └── middleware.ts              # Next.js middleware (route protection)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Full DB schema + RLS + functions
├── public/
├── .env.local.example
└── package.json
```

---

## Database Schema (Supabase SQL Migration)

### 8 bảng + 1 bucket

> [!NOTE]
> So với đề bài gốc 7 bảng, thêm bảng `notifications` cho hệ thống thông báo in-app. Thêm cột `images` (jsonb) vào `tickets` và `shape_ups` để lưu link ảnh. Thêm cột `embedding` (vector) vào `shape_ups` cho AI semantic search.

#### 1. `projects` — Danh sách dự án
- `id` uuid PK, `name`, `description`, `status` (active/inactive), `created_at`

#### 2. `users` (profiles) — Tài khoản nội bộ
- `id` uuid PK (link `auth.users`), `username`, `name`, `email`, `role` (manager/po), `status` (active/inactive), `created_at`

#### 3. `project_po` — Phân quyền PO ↔ Project
- `id` uuid PK, `project_id` FK, `user_id` FK, `created_at`

#### 4. `shape_ups` — Thư viện tri thức
- `id` uuid PK, `project_id` FK, `title`, `issue_detail`, `solution`, `document_link`, `jira_link`, `note`, `status` (draft/review/published), `created_by` FK, `source_ticket_id` FK nullable, `images` jsonb, `done_date`, `embedding` vector(768), `created_at`, `updated_at`

#### 5. `tickets` — Yêu cầu tiếp nhận
- `id` uuid PK, `project_id` FK, `title`, `issue_detail`, `priority` (low/medium/high), `status` (new/in_progress/pending_customer/resolved/closed), `requester_name`, `requester_department`, `requester_email`, `attachments` jsonb, `images` jsonb, `assignee_id` FK nullable, `note`, `reply_date`, `created_at`, `updated_at`

#### 6. `emails` — Lịch sử gửi email
- `id` uuid PK, `ticket_id` FK, `sender_id` FK, `subject`, `content` text (HTML), `sent_date`

#### 7. `ticket_shapeup` — Linking ticket ↔ shape_up
- Composite PK (`ticket_id`, `shapeup_id`), `linked_by_user` FK, `linked_date`

#### 8. `notifications` — Thông báo in-app (THÊM MỚI)
- `id` uuid PK, `user_id` FK, `type` (new_ticket/ticket_updated/...), `title`, `message`, `link`, `is_read` boolean, `created_at`

#### Storage Bucket
- Bucket `attachments`: public read, authenticated write. Cấu trúc: `attachments/{project_id}/{ticket_or_shapeup_id}/{filename}`

#### RLS Policies
- Manager: full access tất cả bảng
- PO: chỉ CRUD data thuộc projects được gán
- Public (anon): chỉ INSERT vào `tickets` (tạo ticket qua portal)

#### Database Functions & Triggers
- Trigger: Khi INSERT ticket → tự tạo notification cho PO phụ trách project đó
- Function: `match_shapeups(query_embedding, project_id, limit)` → semantic search bằng cosine distance

---

## 5 Giai đoạn phát triển

### Phase 1: Foundation & Authentication

**Scope:** Project init, design system, auth flow, database schema

| Task | Chi tiết |
|---|---|
| Init Next.js | `create-next-app` với TypeScript, App Router, no Tailwind |
| Design System | CSS variables, dark theme, typography (Inter), components cơ bản (Button, Input, Badge, Modal, Card, Table) |
| Supabase Setup | SQL migration script cho toàn bộ schema, RLS policies, storage bucket |
| Auth | Login page (email/password), middleware bảo vệ routes, session management |
| Layout | Sidebar navigation, header với avatar + notification bell, responsive mobile menu |
| Admin Panel | CRUD Projects, CRUD Users (tạo PO account), mapping PO ↔ Project |

---

### Phase 2: Ticket Management

**Scope:** Public Portal + PO Ticket Workspace

| Task | Chi tiết |
|---|---|
| Public Portal | Form tạo ticket (tên, email, phòng ban, chọn project, tiêu đề, mô tả, upload ảnh), reCAPTCHA v3 |
| Image Upload | Client-side compress (≤500KB) → upload Supabase Storage → lưu URL vào jsonb |
| Ticket List | Bảng + bộ lọc (status, priority, project), search, pagination |
| Kanban Board | Drag & drop theo status columns, mini card preview |
| Ticket Detail | Xem full info, đổi status/priority/assignee, ghi chú nội bộ |
| Reply Email UI | Text editor soạn email phản hồi, chọn link Shape Up, preview template (gửi email mock — Phase sau) |

---

### Phase 3: Shape Up Knowledge Base

**Scope:** Quản lý thư viện tri thức

| Task | Chi tiết |
|---|---|
| Shape Up List | Bảng theo project, lọc status (draft/review/published), search |
| Shape Up Detail | TipTap rich text editor cho `issue_detail` + `solution`, upload ảnh, trường link (document, jira) |
| Convert Ticket → Shape Up | Button "Chuyển thành Shape Up" trên ticket detail → pre-fill form tạo Shape Up từ dữ liệu ticket, lưu `source_ticket_id` |
| Link Shape Up ↔ Ticket | Trong ticket detail: search + chọn Shape Up → tạo record `ticket_shapeup` |

---

### Phase 4: Dashboard & Notifications

**Scope:** Bảng điều khiển + thông báo realtime

| Task | Chi tiết |
|---|---|
| PO Dashboard | Cards: ticket mới / đang xử lý / quá hạn, Shape Up đang nháp. Charts: ticket theo thời gian, theo priority |
| Boss Dashboard | Tổng quan toàn hệ thống: ticket theo project, khối lượng theo PO, tỷ lệ resolved bằng Shape Up |
| In-app Notifications | Bell icon + dropdown, Supabase Realtime subscription, đánh dấu đã đọc |
| Email Notifications | Placeholder/mock — chi tiết triển khai sau theo yêu cầu |

---

### Phase 5: AI Integration (Gemini)

**Scope:** Tìm kiếm thông minh + gợi ý Shape Up

| Task | Chi tiết |
|---|---|
| Settings Page | Form nhập Gemini API Key, lưu vào localStorage (client-side, không lưu server) |
| Embedding Generation | Khi tạo/sửa Shape Up (published) → gọi Gemini `text-embedding-004` → lưu vector vào cột `embedding` |
| Semantic Search | Trong ticket detail: "Tìm Shape Up liên quan" → embed nội dung ticket → cosine similarity search via `match_shapeups()` |
| AI Suggest Reply | Button "AI gợi ý phản hồi" → gửi ticket context + Shape Up matches cho Gemini → generate draft reply |

---

## User Review Required

> [!IMPORTANT]
> **Gemini API Key storage:** Plan hiện tại lưu API key trong `localStorage` của browser (mỗi user tự nhập). Ưu điểm: không cần lưu key trên server, bảo mật hơn. Nhược điểm: phải nhập lại khi đổi browser. Bạn có muốn cách khác (ví dụ: lưu encrypted trong DB)?

> [!IMPORTANT]
> **Email gửi thực tế:** Phase hiện tại chỉ mock giao diện soạn + preview email. Khi nào bạn sẵn sàng triển khai gửi email thật, sẽ cần chọn provider (Resend, SendGrid, hoặc SMTP) và cấu hình riêng.

> [!WARNING]
> **Supabase project:** Bạn cần tự tạo Supabase project tại [supabase.com](https://supabase.com) và cung cấp `SUPABASE_URL` + `SUPABASE_ANON_KEY` để tôi cấu hình. SQL migration script sẽ được tạo sẵn để bạn chạy trong Supabase SQL Editor.

---

## Verification Plan

### Automated Tests
- Chạy `npm run build` đảm bảo không lỗi TypeScript
- Chạy `npm run dev` và test các luồng chính trên browser

### Manual Verification (mỗi Phase)
- **Phase 1:** Login/logout, tạo project, tạo user, gán PO vào project
- **Phase 2:** Tạo ticket qua portal (có CAPTCHA), xem list/kanban, xem detail, upload ảnh ≤500KB
- **Phase 3:** Tạo Shape Up, rich text editor, convert từ ticket, link Shape Up vào ticket
- **Phase 4:** Dashboard hiển thị đúng số liệu, notification realtime khi có ticket mới
- **Phase 5:** Nhập API key, tìm Shape Up bằng semantic search, AI suggest reply
