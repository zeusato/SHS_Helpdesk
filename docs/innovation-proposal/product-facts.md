# Căn cứ nội dung — 01/10/2026

- Mục đích, đối tượng và khả năng áp dụng đa nghiệp vụ: do tác giả mô tả trong yêu cầu hiện tại.
- Portal độc lập `/portal`: mã nguồn có form không cần đăng nhập, chọn dự án/nhóm, thông tin người gửi, mô tả, ảnh, tạo ticket mới. Không có trang công khai tra cứu tiến độ theo mã trong mã nguồn đã kiểm tra.
- Ticket: trạng thái, ưu tiên, người phụ trách, ghi chú, tìm bài đã công bố theo dự án, liên kết bài tri thức, chuyển ticket thành Shape Up nháp. Căn cứ: `src/app/(dashboard)/tickets/[id]/page.tsx`.
- Phản hồi: soạn email, xem trước và gửi qua cấu hình SMTP cá nhân; lưu lịch sử gửi. Không thấy bộ thu email trả lời tự động hoặc chat hai chiều trong ứng dụng. Luồng yêu cầu bổ sung là quy trình vận hành đề xuất, đội ngũ cần ghi nhận câu trả lời nhận được qua kênh đang sử dụng.
- Shape Up: mô tả vấn đề, giải pháp, tài liệu tham chiếu, liên kết nguồn, tác giả, trạng thái; có import Excel. Trạng thái review không đồng nghĩa đã có bộ máy phê duyệt độc lập.
- Nhóm nghiệp vụ đang được mô hình hóa bằng project; phân công PO theo dự án; quản trị viên; thống kê tổng quan theo dự án. Nhân rộng cần cấu hình nhóm và quy chế phù hợp, có thể cần thêm trường/phân quyền cho nghiệp vụ đặc thù.
- Hỗ trợ AI có mã gọi dịch vụ khi cấu hình khóa: gợi ý bài và soạn nháp. Chưa kiểm chứng end-to-end, không coi là điều kiện của mô hình hoặc kết quả đo.
- Có 20 ticket mô phỏng cho TVSI iTrade và TVSI Mobile. Không dùng số mẫu để tuyên bố số người dùng hay hiệu quả.
- Đã kiểm tra build, 17 test và hiệu năng chuyển route mẫu; đây không phải bằng chứng vận hành sản xuất, chịu tải lớn, tuân thủ hoặc hiệu quả kinh doanh. Các con số kỹ thuật không đưa thành luận cứ giá trị trong hồ sơ.
- Logo và màu đối chiếu website TVSI cùng brand-spec.md hiện có. Nguồn thương hiệu: https://www.tvsi.com.vn/. Nguồn xác nhận tên nền tảng: https://tvsi.com.vn/News/news-detail-886.html và https://tvsi.com.vn/News/news-detail-1399.html.
- Không có thông tin chính thức về mẫu hồ sơ, tên cuộc thi, tác giả/đơn vị ghi trên bìa, giới hạn trang, ngân sách, thời gian tổ chức. Chờ người dùng cung cấp; bản thử không tự điền các mục này.
