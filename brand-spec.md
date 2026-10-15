# TVSI Helpdesk — nhận diện thương hiệu

Đối chiếu ngày 2026-10-01 với https://www.tvsi.com.vn/ bằng trình duyệt.

- Tên doanh nghiệp trên footer: Công ty Cổ phần Chứng khoán Tân Việt.
- Tên ứng dụng: **TVSI Helpdesk**. Shape Up là tên chức năng thư viện tri thức, được giữ lại.
- Logo màu: `public/LOGO.png` (186 × 60), đã đối chiếu với logo header của TVSI.
- Logo trắng: `public/Logo_TVSI_Eng.png` (133 × 49), tương ứng bản footer chính thức. Dùng trên nền tối; không tô lại logo bằng CSS filter.
- Logo không được kéo giãn, vẽ lại hay cắt thành biểu tượng mới. Giữ khoảng trống quanh logo; dùng `object-fit: contain`.
- Favicon và icon ứng dụng dùng bản imagegen có biểu tượng TVSI trắng trên nền đỏ. OG v2 lấy biểu tượng tròn và chữ TVSI làm chủ thể, bên dưới là tên Helpdesk; chỉ thêm chiều sâu bằng chất liệu và ánh sáng. Không biến logo thành dải lụa hoặc hình khối trừu tượng; không đặt slogan, quy trình hay mũi tên lên ảnh. Ảnh nguồn và prompt lưu ở `assets/brand/`; `scripts/prepare-brand-assets.mjs` chỉ xuất các kích thước phục vụ ứng dụng.
- Nút chính trên website: `rgb(210, 53, 59)` / **#D2353B**, chữ trắng. Văn bản body: **#1E1E1E**; điều hướng phụ: **#696969**; nền trắng.
- Font đo từ computed styles: **Nunito, sans-serif**. Hai file regular/bold trong `src/app/fonts/` được tải từ Google Fonts để phục vụ nội bộ qua `next/font/local`.
- Đỏ đậm #B8262D, nền nhạt #F7F7F8 và các sắc xám bổ trợ là màu giao diện đề xuất, không phải tuyên bố về bộ quy chuẩn thương hiệu chính thức.
- Màu trạng thái vẫn có ngữ nghĩa riêng: xanh lá cho hoàn tất, vàng cho chờ, xanh dương cho thông tin, đỏ cho lỗi. Không biến mọi trạng thái thành đỏ.
- Chất giọng: chuyên nghiệp, ngắn gọn, tiếng Việt rõ nghĩa, ưu tiên hành động và trạng thái thực tế.
- Không dùng ảnh chứng khoán trang trí trong màn hình nghiệp vụ. Logo là tài sản hình ảnh bắt buộc; bảng dữ liệu và nội dung hỗ trợ là nội dung chính.

## Phạm vi và điều kiện triển khai

Đổi tên, logo, metadata và màu thương hiệu có thể thực hiện ngay theo yêu cầu trực tiếp. Ba bản HTML trong `design-demos/` dùng để chọn hướng bố cục trước khi triển khai toàn bộ giao diện mới. Không coi dữ liệu minh họa trong bản thiết kế là dữ liệu vận hành thật; không ghi dữ liệu vào Supabase từ các bản này.
