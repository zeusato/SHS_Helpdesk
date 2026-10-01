# Icon và ảnh chia sẻ của TVSI Helpdesk

Áp dụng cho ứng dụng chính; tài liệu sáng kiến có cấu hình riêng.

- `src/app/favicon.ico`: icon TVSI đỏ–trắng, gồm các cỡ 16/32/48/64/128/256 px cho tab trình duyệt.
- `src/app/icon.png`: bản PNG 256 × 256 của cùng biểu tượng.
- `src/app/apple-icon.png`: icon 180 × 180 trên nền trắng cho màn hình chính của thiết bị Apple.
- `public/brand/tvsi-helpdesk-og.png`: ảnh chia sẻ 1200 × 630, dùng chung cho Open Graph và Twitter Card.
- `src/app/layout.tsx`: tiêu đề, mô tả tiếng Việt và metadata áp dụng toàn ứng dụng.

Hai ảnh được tạo bằng công cụ **imagegen tích hợp**, dùng logo TVSI của dự án làm tham chiếu. OG chỉ có logo và tên Helpdesk, không có slogan, quy trình hay mũi tên. Ảnh nguồn nằm trong `assets/brand/`, prompt đầy đủ ở `assets/brand/imagegen-prompts.json`.

Sau khi thay ảnh nguồn, chạy lệnh dưới để xuất các kích thước. Script chỉ đóng gói ảnh, không tự vẽ hoặc chèn chữ:

```sh
node scripts/prepare-brand-assets.mjs
```

## Tên miền khi triển khai

Đặt `NEXT_PUBLIC_SITE_URL` bằng URL công khai của ứng dụng (đầy đủ `https://`) trong biến môi trường **trước khi build**, rồi build/deploy lại. Không dùng tên miền website doanh nghiệp nếu đó không phải nơi triển khai Helpdesk.

Nếu chưa đặt, ứng dụng sử dụng `VERCEL_PROJECT_PRODUCTION_URL`, tiếp đến `VERCEL_URL`; khi chạy cục bộ dùng `http://localhost:3000`. Link localhost không thể được mạng xã hội truy cập để lấy ảnh.

Các file icon và ảnh PNG được phục vụ công khai, không cần đăng nhập. Metadata chỉ chứa nội dung giới thiệu chung, không lấy dữ liệu phiếu yêu cầu hay thông tin khách hàng. Ảnh OG được tạo sẵn, không phát sinh xử lý ảnh hoặc truy vấn cơ sở dữ liệu khi chia sẻ.
