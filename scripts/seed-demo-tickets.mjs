// Add 10 synthetic tickets per TVSI platform; safe to rerun without duplicates.
// No authentication users or outbound emails are created.
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
process.loadEnvFile('.env')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
})
function checked(result) {
  if (result.error) throw new Error(`Database operation failed: ${result.error.code}`)
  return result.data
}
const examples = {
  'TVSI Mobile': [
    ['Không nhận được mã OTP khi đăng nhập', 'high', 'Mô phỏng khách hàng yêu cầu mã OTP hai lần nhưng màn hình vẫn chờ sau 60 giây. Cần kiểm tra thời điểm yêu cầu và luồng nhận mã trên thiết bị thử nghiệm.'],
    ['Thông báo khớp lệnh hiển thị chậm', 'high', 'Mô phỏng thông báo đẩy xuất hiện sau khi trạng thái trong sổ lệnh đã cập nhật. Cần đối chiếu thời gian sự kiện và quyền thông báo của ứng dụng.'],
    ['Đăng nhập sinh trắc học yêu cầu nhập lại mật khẩu', 'medium', 'Mô phỏng thiết bị đã bật sinh trắc học nhưng ứng dụng quay về màn hình mật khẩu sau khi mở lại. Đang kiểm tra phiên đăng nhập và cài đặt thiết bị.'],
    ['Danh mục tài sản chưa cập nhật khi kéo làm mới', 'high', 'Mô phỏng số liệu danh mục giữ nguyên sau thao tác kéo làm mới. Đang đối chiếu phản hồi dữ liệu và trạng thái kết nối trong môi trường thử nghiệm.'],
    ['Cần bổ sung ảnh lỗi khi xác nhận chuyển tiền', 'medium', 'Mô phỏng phản ánh màn hình xác nhận chuyển tiền hiển thị thông báo chung. Đang chờ ảnh chụp đã che thông tin nhạy cảm và thời điểm phát sinh.'],
    ['Không mở được tệp sao kê trên điện thoại', 'low', 'Mô phỏng thao tác tải sao kê thành công nhưng thiết bị không mở được tệp. Đang chờ phiên bản hệ điều hành và định dạng tệp từ người gửi.'],
    ['Bảng giá trống sau khi đổi kết nối mạng', 'medium', 'Mô phỏng chuyển từ Wi-Fi sang dữ liệu di động khiến bảng giá chưa tải lại. Đã kiểm tra lại cơ chế kết nối và xác nhận dữ liệu hiển thị trong kịch bản mẫu.'],
    ['Danh sách mã theo dõi không đồng bộ', 'low', 'Mô phỏng danh sách mã theo dõi khác nhau giữa hai lần đăng nhập. Đã làm mới dữ liệu thử nghiệm và xác nhận danh sách đồng bộ.'],
    ['Chữ bị cắt khi tăng cỡ chữ hệ thống', 'low', 'Mô phỏng cỡ chữ lớn làm cắt nhãn tại màn hình danh mục. Đã xác nhận bố cục sau điều chỉnh trong kịch bản mẫu và đóng yêu cầu.'],
    ['Hướng dẫn bật thông báo giao dịch', 'low', 'Mô phỏng yêu cầu hướng dẫn cấp quyền thông báo cho ứng dụng. Người gửi mẫu đã kiểm tra quyền hệ thống và xác nhận nhận được thông báo thử nghiệm.'],
  ],
  'TVSI iTrade': [
    ['Bảng giá chưa tự kết nối lại sau mất mạng', 'high', 'Mô phỏng trình duyệt mất kết nối trong thời gian ngắn rồi có mạng trở lại nhưng bảng giá chưa cập nhật. Cần kiểm tra luồng kết nối lại và thông báo trạng thái.'],
    ['Không hiển thị thông báo khi phiên đăng nhập hết hạn', 'high', 'Mô phỏng phiên thử nghiệm hết hạn trong lúc người dùng đang xem danh mục. Cần bổ sung phản hồi rõ ràng và điều hướng đăng nhập phù hợp.'],
    ['Bộ lọc sổ lệnh chưa giữ khoảng ngày đã chọn', 'medium', 'Mô phỏng người dùng chuyển giữa các mục rồi quay lại sổ lệnh, khoảng ngày trở về mặc định. Đang kiểm tra việc lưu trạng thái bộ lọc.'],
    ['Xuất lịch sử giao dịch bị lệch cột tiếng Việt', 'medium', 'Mô phỏng tệp xuất lịch sử giao dịch có tiêu đề tiếng Việt hiển thị lệch trong phần mềm bảng tính. Đang kiểm tra mã hóa và định dạng cột.'],
    ['Cần thông tin trình duyệt khi biểu đồ không tải', 'medium', 'Mô phỏng biểu đồ giá không hiển thị trên một máy tính. Đang chờ tên, phiên bản trình duyệt và ảnh màn hình đã che dữ liệu tài khoản.'],
    ['Yêu cầu đối chiếu số dư tại một thời điểm', 'high', 'Mô phỏng phản ánh số dư hiển thị khác giữa hai lần tải trang. Đang chờ thời điểm cụ thể và dữ liệu đối chiếu đã ẩn danh để phân tích.'],
    ['Thanh cuộn ngang che thao tác ở màn hình nhỏ', 'low', 'Mô phỏng cửa sổ trình duyệt hẹp khiến thanh cuộn che một phần nút thao tác. Đã kiểm tra lại bố cục ở độ rộng thử nghiệm.'],
    ['Danh sách theo dõi mất thứ tự sau tải lại', 'low', 'Mô phỏng thứ tự mã chứng khoán trong danh sách thay đổi khi tải lại trang. Đã kiểm tra lưu thứ tự và xác nhận kết quả trong dữ liệu mẫu.'],
    ['Bộ lọc trạng thái chưa xóa khi chọn đặt lại', 'medium', 'Mô phỏng nút đặt lại vẫn giữ một trạng thái lọc trong sổ lệnh. Đã xác nhận thao tác đặt lại đưa các trường về mặc định trong kịch bản mẫu.'],
    ['Hướng dẫn tải sao kê giao dịch trên web', 'low', 'Mô phỏng yêu cầu tìm chức năng tải sao kê theo khoảng ngày. Người gửi mẫu đã xác nhận thực hiện được thao tác và yêu cầu đã đóng.'],
  ],
}
const projects = checked(await db.from('projects').select('id,name').in('name', Object.keys(examples)).eq('status', 'active'))
for (const name of Object.keys(examples)) {
  if (projects.filter(p => p.name === name).length !== 1) throw new Error(`Expected one active project: ${name}`)
}
const owner = checked(await db.from('users').select('id').eq('email', 'manhquyet88@gmail.com').eq('status', 'active').single())
const statuses = ['new', 'new', 'in_progress', 'in_progress', 'pending_customer', 'pending_customer', 'resolved', 'resolved', 'closed', 'closed']
const now = Date.now()
const rows = projects.flatMap((project, platformIndex) => examples[project.name].map(([title, priority, detail], index) => {
  const hex = createHash('sha256').update(`tvsi-demo-tickets-v1:${project.id}:${index}`).digest('hex')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  const createdAt = now - (index * 24 + platformIndex * 3 + 2) * 3600000
  return {
    id, project_id: project.id, title: `[Mẫu] ${title}`, priority, status: statuses[index],
    issue_detail: `Dữ liệu mô phỏng để trình diễn Helpdesk, không phản ánh sự cố thực tế của TVSI.\n\n${detail}`,
    requester_name: `Người dùng mẫu ${platformIndex + 1}${String(index + 1).padStart(2, '0')}`,
    requester_department: index % 2 ? 'Môi giới (mẫu)' : 'Dịch vụ khách hàng (mẫu)',
    requester_email: `tvsi-demo-${platformIndex + 1}-${index + 1}@example.invalid`,
    assignee_id: index < 2 ? null : owner.id,
    note: 'TVSI_DEMO_V1 — Dữ liệu mẫu; thông tin người gửi giả lập.',
    attachments: [], images: [],
    reply_date: index < 4 ? null : new Date(createdAt + 3600000).toISOString(),
    created_at: new Date(createdAt).toISOString(),
    updated_at: new Date(createdAt + (index < 2 ? 0 : 3600000)).toISOString(),
  }
}))
const existing = checked(await db.from('tickets').select('id').in('id', rows.map(r => r.id)))
const existingIds = new Set(existing.map(r => r.id))
const missing = rows.filter(r => !existingIds.has(r.id))
if (missing.length) checked(await db.from('tickets').insert(missing))
const verified = checked(await db.from('tickets').select('id,project_id,status').in('id', rows.map(r => r.id)))
if (verified.length !== 20) throw new Error('Expected 20 demo tickets after seeding')
console.log(JSON.stringify({ inserted: missing.length, projects: projects.map(p => ({
  name: p.name,
  demoTickets: verified.filter(t => t.project_id === p.id).length,
  statuses: Object.fromEntries([...new Set(statuses)].map(s => [s, verified.filter(t => t.project_id === p.id && t.status === s).length])),
})) }, null, 2))
