# Kiểm tra giao diện TVSI — 2026-10-01

Hướng triển khai: **C — Bố cục thoáng**, theo lựa chọn trong `direction-approved.md`.

## Kiểm tra mã

- Production build Next.js thành công, bao gồm kiểm tra TypeScript và tạo các route.
- ESLint toàn bộ `src`: 0 lỗi, 6 cảnh báo (dependency effect, biến chưa dùng và ảnh preview trong portal; biến chưa dùng trong middleware/crypto).
- Không còn chuỗi SHS trong mã ứng dụng.
- Kiểm tra tham chiếu CSS module từ TSX: không thiếu selector.
- `git diff --check -- src`: không có lỗi khoảng trắng.

## Kiểm tra trình duyệt

- Trang đăng nhập và cổng hỗ trợ: kiểm tra trực tiếp trên server local, bố cục desktop và điện thoại; liên kết chuyển trang, trường bắt buộc và font Nunito.
- Dựng HTML từ component thực tế để kiểm tra bố cục 10 màn hình: tổng quan, tickets, Shape Up, lịch sử email, dự án, tài khoản, phân quyền PO, bảo mật, AI và email cá nhân.
- Các bản dựng bố cục không tràn ngang trang ở chiều rộng 1440px và 390px. Đã kiểm tra trực quan cả giao diện sáng và giao diện tối của tổng quan.
- Script tái tạo: `node design-demos/render-ui-check.cjs`. Kết quả trong `design-demos/ui-check/` được bỏ qua bởi Git. Mỗi trang có nhãn rõ đây là kiểm tra bố cục tĩnh với dữ liệu rỗng, không kết nối hệ thống.

## Giới hạn

Chưa có phiên đăng nhập trong trình duyệt kiểm tra. Vì vậy chưa kiểm thử thao tác CRUD, realtime hoặc luồng nội bộ với dữ liệu thật. Không gửi ticket hay email khi kiểm tra. Bản dựng tĩnh chỉ xác nhận bố cục, không thay thế kiểm thử chức năng sau đăng nhập.

Những thay đổi sẵn có trong workspace được giữ lại; chưa commit hoặc triển khai lên môi trường bên ngoài.
