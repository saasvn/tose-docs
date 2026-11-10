# Support token cho trợ lý hỗ trợ

Trợ lý hỗ trợ trong dashboard (Dewee) có thể chẩn đoán workspace của bạn và đề xuất thay đổi. Trợ lý không bao giờ giữ session token hay API key của bạn. Thay vào đó, dashboard cấp một **support token**: credential sống ngắn, chỉ dùng được trên hai route mà trợ lý cần.

Support broker tắt theo mặc định. Một instance TOSE bật nó bằng `SUPPORT_BROKER_ENABLED=true`, khi đó `/api/support` được mount.

## Cấp token

`POST /api/support/token` trả về token cho người dùng đang đăng nhập.

```bash
curl -X POST https://app.tose.sh/api/support/token \
  -H "Cookie: <session cookie>"
```

```json
{ "token": "<support token>", "expires_at": "2026-11-04T15:52:00Z" }
```

| Thuộc tính | Hành vi |
|------------|---------|
| Ai được cấp | Người dùng đã đăng nhập bằng **session**. API key và OAuth grant bị từ chối với `403`; request chưa đăng nhập nhận `401`. |
| Thời hạn | 5 phút. Hết hạn thì cấp token mới, đừng giữ session token. |
| Ràng buộc | Token gắn với người dùng và với session đã cấp nó. |
| Thu hồi | Đăng xuất hoặc thu hồi session khiến token mất hiệu lực ngay. |

## Token dùng được ở đâu

Gửi token qua `Authorization: Bearer <token>`. Token chỉ được chấp nhận trên đúng hai route:

| Route | Mục đích |
|-------|----------|
| `GET /api/support/tools` | Liệt kê các operation của trợ lý cùng JSON Schema. |
| `POST /api/support/call` | Chạy một operation với `{operation, workspace, args}`. |

Mọi route khác trả `401`, kể cả `POST /api/support/token` (support token không thể cấp token khác) và `/api/support/approvals/*`.

## Trợ lý làm được gì

Mỗi lệnh gọi đi qua cùng cơ chế phân quyền của dashboard và kiểm tra tư cách thành viên workspace tại thời điểm gọi, nên trợ lý không bao giờ truy cập được nhiều hơn bạn.

| Operation | Rủi ro | Trả về |
|-----------|--------|--------|
| `list_projects` | thấp | Tên, slug dự án và trạng thái deployment mới nhất. |
| `get_project_status` | thấp | Deployment đang chạy, mới nhất và gần đây, lỗi đã được che. |
| `read_logs` | thấp | Các dòng log build hoặc runtime mới nhất (tối đa 500 dòng, 64 KiB), đã che. |
| `get_wallet` | thấp | Số dư, cài đặt cảnh báo số dư thấp và chi tiêu 30 ngày. Không có thông tin thanh toán. |
| `get_action_status` | thấp | Trạng thái của thay đổi mà trợ lý đã đề xuất. |
| `redeploy_project` | cao | Một kế hoạch và `approval_id`. Không bao giờ tự deploy. |

`redeploy_project` cần vai trò **owner hoặc admin**, cả khi đề xuất lẫn khi xác nhận. Bạn xác nhận thay đổi bằng nút trong dashboard; trợ lý không có operation nào để phê duyệt. Yêu cầu xác nhận hết hạn sau mười phút, và nếu có push làm nhánh thay đổi kể từ lúc kế hoạch được hiển thị thì trả `409 approval_stale`.

Log và trạng thái được che trước khi trợ lý nhìn thấy: giá trị biến môi trường và các dạng credential phổ biến bị loại bỏ. Nếu không tải được quy tắc che, lệnh gọi thất bại với `503` thay vì trả văn bản gốc.

## Audit

Mỗi lệnh gọi được ghi vào [audit log](/vi/api/audit) với `auth_type` là `session`, kể cả lệnh bị từ chối hoặc operation không tồn tại. Tham số và kết quả không bao giờ được lưu.

## Trợ lý không được làm

Truy cập shell hoặc file, đọc biến môi trường, truy cập database, thay đổi thanh toán, quản lý thành viên hoặc API key, xóa, rollback, restart và gọi API tùy ý.
