# Tối ưu chuyển mục — 2026-10-01

## Nguyên nhân và thay đổi

- Middleware và dashboard layout trước đây gọi `auth.getUser()`, phát sinh yêu cầu mạng xác thực trên đường chuyển trang. Thay bằng `getClaims()` để kiểm tra chữ ký và hạn token với public key được cache; dự án đã xác nhận dùng ES256. Vẫn kiểm tra hồ sơ đang hoạt động, RLS và xác thực riêng tại API ghi dữ liệu.
- Giữ cookie cùng header chống cache khi refresh phiên, kể cả phản hồi redirect/401. Không bỏ qua xác thực cho request prefetch.
- Menu chính, quản trị và cài đặt dùng full route prefetch. Route shell được tái sử dụng trong Router Cache: dynamic 30 giây, static/full-prefetch 180 giây. Truy vấn dữ liệu nghiệp vụ của trang vẫn chạy phía client theo quyền RLS.
- Bấm Cài đặt đi thẳng tới `/settings/security`, bỏ lượt redirect trung gian. Đăng nhập/đăng xuất refresh Router Cache.
- Link phản hồi trạng thái pending ngay khi bấm; loading boundary hiển thị skeleton trong khi giữ khung điều hướng. Tôn trọng thiết lập giảm chuyển động.

## Đo thực tế

Đo từ `onNavigate` đến effect nhận pathname mới ngay trong ứng dụng bằng `performance.now()`. Công cụ đo tạm đã gỡ khỏi mã bàn giao. Không tính thời gian chờ của công cụ điều khiển Chrome vào số đo.

| Môi trường | Email | Shape Up | Tickets |
| --- | ---: | ---: | ---: |
| Production local, sau prefetch | 82 ms | 106 ms | 91 ms |
| Production local, quay lại | 49 ms | 84 ms | 55 ms |
| Dev local, lần đầu trong phép đo | 225 ms | 232 ms | 143 ms |
| Dev local, quay lại | 70 ms | 76 ms | 128 ms |

Đây là thời gian chuyển route, không phải thời gian hoàn tất mọi truy vấn dữ liệu. Mẫu đo nhỏ, tài khoản quản trị, dữ liệu ticket/Shape Up hiện rỗng; không phải benchmark tải lớn. Next.js tắt prefetch trong dev nên localhost:3000 chạy dev vẫn có thể chậm hơn production khi mở lần đầu.

Log gốc: `design-demos/navigation-production.json` và `design-demos/navigation-development.json`.

## Kiểm tra

- `node --test tests/data-access.test.cjs`: 17/17 đạt, bao gồm chữ ký không hợp lệ, prefetch phải xác thực, public path chính xác, cookie/header khi refresh.
- `node node_modules/next/dist/bin/next build`: đạt, gồm kiểm tra TypeScript.
- ESLint: 0 lỗi; 3 cảnh báo có sẵn ở preview ảnh portal và biến catch crypto.

## Tài liệu tham chiếu

- Next.js 16.2.5: tài liệu cục bộ về prefetching, loading, useLinkStatus và staleTimes trong `node_modules/next/dist/docs/`.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
- [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).
