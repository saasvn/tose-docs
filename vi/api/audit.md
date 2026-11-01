# Audit log

TOSE ghi lại mọi thay đổi thực hiện qua REST API, để bạn trả lời được ai đã làm gì, bằng credential nào và có thành công không.

## Những gì được ghi

Mọi request tới `/api` có thay đổi dữ liệu (`POST`, `PUT`, `PATCH` và `DELETE`) đều được ghi vào audit log sau khi xử lý xong. Request bị TOSE **từ chối** cũng được ghi, nên một key thử làm việc không được phép sẽ để lại dấu vết.

Mỗi bản ghi gồm:

| Trường | Ý nghĩa |
|--------|---------|
| `user_id` | Người mà request hành động thay mặt. |
| `auth_type` | Cách xác thực: `session` (đã đăng nhập), `api_key` hoặc `oauth` (một kết nối [MCP connector](/vi/mcp)). |
| `credential_id` | API key hoặc kết nối đã gửi request, khi đó không phải phiên đăng nhập. |
| `workspace_id` | Workspace mà request tác động. |
| `action`, `risk` | Thao tác (ví dụ `env.write`) và mức rủi ro: `low`, `medium`, `high` hoặc `critical`. |
| `method`, `route`, `params` | HTTP method, route template (ví dụ `/api/workspaces/:slug/api-keys`) và các path parameter. |
| `status`, `outcome`, `deny_code` | HTTP status, kết quả (`ok`, `denied` hoặc `error`) và lý do khi bị từ chối. |
| `request_id` | Request ID, để đối chiếu bản ghi với một yêu cầu hỗ trợ. |
| `created_at` | Thời điểm xảy ra. |

## Những gì không bao giờ được ghi

- Request body. Secret bạn gửi, ví dụ giá trị biến môi trường, không được lưu.
- Query string.
- Invitation token. Token bị loại khỏi path parameter.

Các lệnh đọc (`GET`) không nằm trong log này.

## Lệnh gọi qua MCP connector

Các lệnh gọi qua [MCP connector](/vi/mcp) còn được ghi vào một audit log MCP riêng: client, workspace, project, deployment, tool, kết quả và mã lỗi. Deploy và rollback được ghi trước khi chạy.

## Ai xem được

- **Đơn vị vận hành nền tảng** đọc được audit log. Log được lưu trong database của TOSE.
- **Bạn** xem được hoạt động MCP của chính mình trong một workspace ở dashboard, mục **Settings** của workspace, rồi **Agent access**. Cùng dữ liệu đó có ở `GET /api/mcp/audit?workspace_id=...` với phiên đã đăng nhập.
- Audit log của REST API hiện chưa có trang dashboard hay API công khai. Nếu cần xuất dữ liệu cho workspace của bạn, hãy liên hệ đơn vị vận hành instance TOSE và gửi kèm khoảng thời gian cùng workspace.
