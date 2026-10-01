# TVSI Helpdesk — ba hướng thiết kế

## Bài toán

Đây là ứng dụng Helpdesk đang hoạt động trên Next.js, React và Supabase. Đại ca yêu cầu thay toàn bộ nhận diện SHS sang TVSI, sử dụng logo đã có trong public và lấy nhận diện từ trang chủ TVSI, đồng thời thiết kế và làm mượt toàn bộ giao diện. Sản phẩm phục vụ người gửi yêu cầu hỗ trợ, nhân viên tiếp nhận và xử lý ticket, người quản lý dự án và người quản trị. Đây là công cụ sử dụng hằng ngày; chất lượng thiết kế được đánh giá qua tốc độ hiểu thông tin, thao tác, độ ổn định bố cục và khả năng đọc các bảng dài. Không thiết kế như landing page bán dịch vụ đầu tư. Không thêm tính năng kinh doanh hoặc số liệu vào hệ thống chỉ để trang trí.

## Cấu trúc hiện hữu

Ứng dụng có trang đăng nhập, cổng gửi yêu cầu công khai, bảng tổng quan, danh sách và chi tiết ticket, danh sách và chi tiết Shape Up, lịch sử email, quản lý dự án, quản lý tài khoản, phân quyền PO, cài đặt bảo mật, tích hợp AI và cấu hình mail. Ba bản xem trước đều tập trung vào màn hình tổng quan để có cùng điểm so sánh. Thông tin chính gồm ticket mới, ticket đang xử lý, ticket đã giải quyết, số bài Shape Up, bảng thống kê theo dự án và ticket gần đây. Điều hướng phải thể hiện được các phân hệ này để người xem hình dung cách mở rộng thiết kế.

## Tài sản và nhận diện đã xác minh

Đọc `brand-spec.md` ở thư mục gốc. Logo màu ở `public/LOGO.png`; logo trắng ở `public/Logo_TVSI_Eng.png`. Logo màu dùng trên nền trắng hoặc rất sáng, bản trắng dùng trên nền tối hoặc đỏ. Tuyệt đối không dựng lại logo, bóp méo, đổi màu hay đặt logo đen trên nền tối. Đỏ chính #D2353B được đo từ nút Mở tài khoản trên website chính thức; chữ #1E1E1E; xám #696969; Nunito là font website. Font regular và bold ở `src/app/fonts/`, cần nhúng base64 trong HTML để bản xem trước tự chứa hoàn toàn. Bối cảnh nội bộ không cần ảnh cổ phiếu, biểu đồ lợi nhuận hay hình nền thương mại. Độ tin cậy đến từ trật tự thông tin, khoảng cách, chữ rõ ràng và thương hiệu đúng.

## Nội dung dùng chung và tính trung thực

Tiêu đề chính: Tổng quan hỗ trợ. Dòng mô tả: Theo dõi yêu cầu, phối hợp xử lý và chia sẻ tri thức. Hành động chính: Tạo ticket. Điều hướng: Tổng quan, Tickets, Shape Up, Lịch sử email, Quản trị, Cài đặt. Các thẻ chỉ số: Ticket mới, Đang xử lý, Đã giải quyết, Bài Shape Up. Chưa truy cập phiên đăng nhập hoặc dữ liệu thật nên để giá trị dấu gạch dài và ghi Chưa kết nối dữ liệu. Có thể minh họa cấu trúc bảng ticket bằng ba dòng ví dụ: Hỗ trợ truy cập hệ thống / Mới; Kiểm tra kết nối email / Đang xử lý; Hướng dẫn sử dụng Shape Up / Đã giải quyết. Đánh dấu rõ Dữ liệu minh họa trên bảng. Không giả danh người dùng thật, không tự tạo KPI, ngày giờ hay tên dự án thật. Phần thư viện có nội dung hướng dẫn ngắn về cách ghi nhận yêu cầu và theo dõi trạng thái.

## Ba hướng và hình thức bàn giao

Mỗi hướng là một file HTML độc lập trong `design-demos/`, gồm toàn bộ CSS, JavaScript, logo và font nội tuyến, có thể mở bằng trình duyệt. Khung so sánh desktop thống nhất 1440 × 900, nhưng trang vẫn cần responsive ở 390px. Cỡ chữ nội dung tối thiểu 14px, chú thích tối thiểu 12px, tương phản văn bản tối thiểu 4.5:1. Mỗi bố cục phải khác về cấu trúc điều hướng hoặc cấu trúc vùng nội dung; không dùng một mẫu rồi đổi màu. Hướng A: văn phòng vận hành sáng, sidebar đầy đủ và bảng dữ liệu rõ ràng. Hướng B: workspace tương phản với thanh điều hướng tối, nhấn vào hàng đợi và tác vụ. Hướng C: biên tập doanh nghiệp, điều hướng ngang, nhiều khoảng trắng có chủ đích và phân cấp kiểu chữ mạnh. Cả ba đều nhận ra TVSI ngay từ đầu.

## Tương tác và chuyển động

Tạo ticket trong bản xem trước mở dialog và ghi rõ đây là mô phỏng, không gửi dữ liệu. Tìm kiếm phải lọc được ba dòng mẫu. Có thể dùng tab để xem danh sách theo trạng thái. Các nút không liên kết đến backend thật. Hover và focus phải rõ, chuyển động dùng opacity hoặc transform ngắn 160–220ms. Tôn trọng prefers-reduced-motion, hỗ trợ bàn phím và không tự động chạy hiệu ứng liên tục. Không tạo số liệu chuyển động, không dùng emoji làm biểu tượng điều hướng. Nếu cần icon chức năng, dùng SVG nét đơn giản nhất quán.

## Tiêu chí để chọn

Người dùng cần nhìn ba giao diện thực tế rồi chọn một hướng hoặc kết hợp. Sau khi có lựa chọn, ghi nguyên văn vào direction-approved.md và mới áp dụng bố cục lên toàn bộ ứng dụng. Trong lúc chờ lựa chọn vẫn hoàn thành các thay đổi thương hiệu đã được yêu cầu rõ ràng, giữ nguyên logic đăng nhập, phân quyền, dữ liệu và các thay đổi sẵn có trong workspace.
