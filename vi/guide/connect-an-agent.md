---
title: "Kết nối AI agent với TOSE qua MCP"
description: "Kết nối MCP client như Claude với một workspace TOSE, chọn quyền chỉ đọc hoặc deploy, phê duyệt thay đổi production trong trình duyệt và thu hồi quyền."
---

# Kết nối AI agent (MCP)

Cấp cho MCP client như Claude quyền truy cập có kiểm soát vào một workspace TOSE. Thao tác đọc chạy ngay; mọi deploy, rollback hay thay đổi biến môi trường đều chờ bạn phê duyệt trong TOSE.

## Điều kiện cần

- Tài khoản TOSE là thành viên của workspace. Quyền deploy cần vai trò owner hoặc admin.
- MCP client hỗ trợ server từ xa với OAuth; xem [Tương thích client](/vi/mcp/clients).
- Connector được bật trên instance TOSE. Nếu `/mcp` trả 404 thì connector đang tắt.

## Đầu vào

| Giá trị | Giá trị dùng |
|---------|--------------|
| Server URL | `https://app.tose.sh/mcp` (Streamable HTTP). Tự vận hành: dùng origin của bạn, xem [Instance tự vận hành](/vi/mcp/oauth#instance-tu-van-hanh) |
| Thông tin đăng nhập | Không cần dán gì. Client đăng nhập cho bạn bằng OAuth 2.1 |
| Workspace | Chọn ở màn hình đồng ý; mỗi kết nối một workspace |

## Các bước

1. Trong MCP client, thêm một custom connector với server URL ở trên.
2. Đăng nhập TOSE ở trang trình duyệt mà client mở ra.
3. Ở màn hình đồng ý, chọn **một workspace**.
4. Chọn quyền. Để trống ô **deploying and rolling back** nếu muốn kết nối chỉ đọc. Metadata biến môi trường (`env:read`) và thay đổi biến (`env:write`) có ô riêng.
5. Bấm **Approve** rồi quay lại client.

## Kết quả mong đợi

Client liệt kê các tool của TOSE như `list_projects`, `get_deployment_status`, `read_logs`, `deploy_project` và `rollback_deployment`. Tool cần scope bạn không cấp sẽ không xuất hiện. Danh sách đầy đủ ở [tài liệu connector](/vi/mcp#tools).

## Kiểm tra

Hỏi client: "Liệt kê các project TOSE của tôi và trạng thái deployment mới nhất." Client sẽ gọi `list_projects` và chỉ hiện project của workspace bạn đã chọn.

## Phê duyệt thay đổi production

`deploy_project`, `rollback_deployment`, `apply_project_env_update` và `execute_runbook` không bao giờ thực thi ở lần gọi đầu:

1. Lần gọi đầu của agent không thay đổi gì. Nó trả về một kế hoạch và `approval_url`.
2. Bạn mở `approval_url`, xem kế hoạch khi đang đăng nhập bằng tài khoản của mình, rồi bấm **Approve** hoặc **Decline**.
3. Bạn bảo agent tiếp tục. Chỉ khi đó TOSE mới thực hiện.

**Gõ "ok" hay "yes" trong chat không phê duyệt gì cả.** Agent không thể tự phê duyệt kế hoạch của nó, và không có cách bỏ qua bước phê duyệt. Giá trị biến môi trường được nhập trên trang TOSE, không bao giờ trong chat. Chi tiết: [Cơ chế phê duyệt](/vi/mcp#cơ-chế-phê-duyệt).

## Quyền và bảo mật

- Một kết nối chỉ thấy một workspace và chỉ các scope bạn đã tích.
- Thao tác ghi còn yêu cầu bạn vẫn là owner hoặc admin tại thời điểm gọi.
- Connector không bao giờ trả về giá trị bí mật, và che các mẫu thông tin đăng nhập phổ biến trong log (cố gắng tối đa).
- Mọi lần gọi tool đều được ghi vào audit log.

## Thử lại an toàn

- Approval token chỉ dùng được một lần và hết hạn sau 10 phút. Thử lại với token đã dùng sẽ trả về deployment ban đầu, không deploy lần nữa.
- `APPROVAL_STALE` nghĩa là nhánh hoặc biến đã thay đổi sau khi bạn duyệt. Chưa có gì chạy; hãy yêu cầu kế hoạch mới và xem lại.
- `DEPLOY_IN_PROGRESS`: chờ bằng `get_deployment_status`, rồi thử lại.
- `UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL`: lỗi tạm thời; thử lại sau.

## Lỗi thường gặp

| Mã | Ý nghĩa |
|----|---------|
| `INSUFFICIENT_SCOPE` | Kết nối thiếu scope. Kết nối lại và tích quyền cần thiết. |
| `FORBIDDEN` | Vai trò của bạn không làm được việc này; nhờ owner hoặc admin của workspace. |
| `APPROVAL_PENDING` | Mở `approval_url` và phê duyệt, rồi tiếp tục. |
| `APPROVAL_EXPIRED`, `APPROVAL_USED` | Yêu cầu một kế hoạch mới. |

Tất cả mã: [Mã lỗi MCP](/vi/mcp#mã-lỗi).

## Thu hồi quyền

Trong dashboard mở **Settings → Agent access** và bấm **Revoke**, hoặc xóa connector trong client. Xem [Thu hồi quyền](/vi/mcp#thu-hồi-quyền).

## Bước tiếp theo

- [Giao thức, OAuth và scope](/vi/mcp/oauth)
- [Agent access](/vi/mcp/agent-access)
- Tự động hóa không cần agent: [Tích hợp REST API](/vi/guide/integrate-the-api)
