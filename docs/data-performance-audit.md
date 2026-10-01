# Kiểm tra dữ liệu và hiệu năng — 2026-10-01

## Đã triển khai

- Tickets, Shape Up, lịch sử email: phân trang 50 dòng; đọc thêm 1 dòng để biết có trang tiếp theo, không chạy COUNT toàn bảng. Sắp xếp theo thời gian và ID để ổn định khi thời gian trùng nhau.
- Tìm kiếm chờ 300 ms, hủy truy vấn cũ khi đổi bộ lọc hoặc rời trang, bỏ qua phản hồi đã bị hủy. Danh sách dự án tải riêng, không tải lại theo từng ký tự tìm kiếm. Lỗi truy vấn có thông báo và nút thử lại.
- Danh sách chỉ tải các cột cần hiển thị. Nội dung Shape Up/email tải khi mở xem. Thư viện Excel tải khi người dùng chọn import hoặc tải mẫu.
- Chi tiết ticket tái sử dụng quan hệ Shape Up đã join thay vì đọc cùng dữ liệu lần thứ hai. Kết quả realtime của thông báo giới hạn 20 dòng và loại trùng ID.
- Cổng hỗ trợ không yêu cầu RETURNING/SELECT khi gửi ticket ẩn danh; quyền INSERT không kéo theo quyền đọc ticket. Upload lỗi không tiếp tục gửi thiếu ảnh.
- API email dùng phiên đăng nhập và RLS của người gửi, kiểm tra tài khoản hoạt động và quyền đọc ticket, từ chối giả mạo sender_id, đặt timeout SMTP. API trả JSON 401 khi chưa đăng nhập. Không gửi email thật trong quá trình kiểm tra.
- Layout nội bộ và API tạo người dùng từ chối profile không hoạt động. Cập nhật trường/ghi chú ticket không âm thầm báo thành công khi ghi thất bại.

## Database thực tế

Đã kiểm tra đúng project Supabase nối với `.env`. Chạy thử migration 008 trong transaction có ROLLBACK và gọi dashboard dưới vai trò authenticated trước khi áp dụng bản COMMIT.

`supabase/migrations/008_query_performance.sql` **đã áp dụng thành công qua SQL Editor trong Chrome**:

- 14 index mới hợp lệ, gồm sắp xếp/phân trang theo dự án, quan hệ ngược, thông báo, lịch sử email và tìm kiếm trigram.
- Cả 9 bảng ứng dụng bật RLS.
- Role của quản trị được tính một lần mỗi truy vấn trong các policy quản trị. Helper SECURITY DEFINER đặt search_path cố định và yêu cầu profile hoạt động cho quyền theo role/dự án.
- Dashboard gom thống kê theo dự án để tái sử dụng kết quả, xử lý tập rỗng, sắp xếp ổn định, yêu cầu profile đã đăng nhập và hoạt động. Quyền thực thi của anon đã thu hồi.
- Giữ nguyên 1 tài khoản quản trị, 4 dự án, 1 cấu hình SMTP; ticket, Shape Up, email và liên kết đều vẫn rỗng.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Production build + TypeScript | Thành công |
| ESLint `src` | 0 lỗi, 3 cảnh báo còn lại (ảnh preview portal, 2 biến catch trong crypto) |
| `node --test tests/data-access.test.cjs` | 13/13 qua |
| Phân trang bằng 123 dòng giả lập | Đủ 123 ID qua 3 trang, không mất/lặp bản ghi ở ranh giới |
| API email giả lập | Chặn thiếu đăng nhập, giả mạo sender, tài khoản inactive, ticket không được RLS cho phép; kiểm tra timeout, lỗi SMTP và lỗi ghi lịch sử |
| API thật không có phiên đăng nhập | `/api/send-email` và `/api/admin/create-user`: HTTP 401, JSON |
| Trình duyệt đăng nhập thật | Dashboard, ticket, Shape Up, email tải được; thử tìm kiếm chứa dấu phẩy, ngoặc, dấu nháy, backslash và ký tự LIKE không lỗi |
| Kiểm tra ẩn danh qua REST | Không nhìn thấy profile/SMTP; dashboard HTTP 401 sau migration |

Đo 5 lần qua REST từ máy hiện tại lúc 15:18 UTC, dùng service role chỉ đọc, trên dữ liệu gần rỗng:

| Truy vấn | 5 mẫu (ms) | Trung vị (ms) |
| --- | --- | --- |
| Danh sách ticket | 216, 220, 145, 128, 135 | 145 |
| Danh sách Shape Up | 131, 135, 120, 143, 147 | 135 |
| Danh sách email | 323, 209, 139, 130, 128 | 139 |

EXPLAIN ANALYZE với vai trò authenticated của quản trị, không ghi dữ liệu: danh sách ticket **0,098 ms**, RPC dashboard **5,972 ms** (thời gian thực thi trong PostgreSQL, không gồm mạng). Bảng ticket rỗng nên planner chọn sequential scan; đây là lựa chọn hợp lý, không phải bằng chứng index không hoạt động. Kết quả EXPLAIN và xác minh được lưu trong `design-demos/explain-*.txt`, `design-demos/sql-verification.txt`.

## Phạm vi kết luận

Các truy vấn và cấu hình hiện tại hoạt động, các điểm tải dư rõ ràng đã được sửa. Đây không phải chứng nhận chịu tải: chưa thử nhiều người dùng đồng thời hoặc dữ liệu lớn. Số đo REST dùng service role không đo chi phí RLS của nhiều PO; kiểm tra trình duyệt dùng tài khoản quản trị thật. Kiểm thử email dùng transport giả, không kiểm tra khả năng gửi của máy chủ SMTP thật. Không seed thêm dữ liệu vào production.

Đo lại trên staging với dữ liệu đại diện trước khi đặt SLA: độ trễ p95, số kết nối, truy vấn tìm kiếm dài và trang sâu. Giao diện quản trị/danh sách chọn vẫn phù hợp quy mô hiện tại (1 tài khoản, 4 dự án); cần phân trang/tìm kiếm riêng cho bộ chọn nếu quy mô vượt giới hạn REST mặc định. Chính sách INSERT ticket ẩn danh và lưu trữ tệp công khai hiện có chưa được thiết kế lại trong đợt này.

## Tái kiểm tra

- `node scripts/audit-data.mjs`: chỉ đọc, không xuất khóa hay mật khẩu.
- `scripts/verify-database.sql`: chạy trong SQL Editor để xác minh index, RLS, quyền RPC và số lượng dữ liệu.
- `node --test tests/data-access.test.cjs`.
- `node node_modules/next/dist/bin/next build`.
- `node node_modules/eslint/bin/eslint.js src`.

Tham chiếu chính thức: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase range](https://supabase.com/docs/reference/javascript/range), tài liệu Next.js cài trong `node_modules/next/dist/docs/`.
