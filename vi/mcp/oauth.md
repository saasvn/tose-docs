# Giao thức, OAuth và scope

Trang này mô tả cách một MCP client kết nối tới TOSE: dùng được những revision giao thức nào, đăng ký ra sao, xin được những scope OAuth nào, và chuyện gì xảy ra khi kết nối chỉ đọc cố gọi tool ghi. Chi tiết dành cho maintainer nằm ở [`MCP-CONNECTOR.md`](https://github.com/saasvn/tose-app/blob/master/MCP-CONNECTOR.md), trang này không chép lại.

## Revision giao thức

Server là Streamable HTTP không trạng thái (stateless) tại `https://<API host của TOSE>/mcp`.

| Revision | Client truy cập bằng |
|----------|----------------------|
| 2026-07-28 | `server/discover`, với `_meta` theo từng request và không có session ID |
| 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05 | `initialize`, trên cùng endpoint |

Mọi revision thấy cùng một bộ tool. Khác biệt duy nhất là cách báo một thao tác ghi bị từ chối, xem [step-up](#step-up-insufficient-scope).

## Đăng ký client

Client có thể tự nhận diện theo một trong hai cách. TOSE chấp nhận cả hai:

- **Client ID Metadata Document (CIMD), ưu tiên.** Client dùng một URL `https` làm `client_id`, và TOSE tải tài liệu JSON tại URL đó. Trang đồng ý (consent) hiển thị tên miền đã phát hành tài liệu.
- **Đăng ký động.** Client không có metadata document đăng ký bằng `POST /oauth/register`. Trang consent hiển thị các client này là chưa xác minh.

Cả hai luồng đều dùng authorization code kèm PKCE (chỉ S256). Client dùng metadata document xác thực bằng `none`. Client đăng ký động dùng `none` hoặc client secret (`client_secret_post` hoặc `client_secret_basic`). Không hỗ trợ xác thực client bằng khóa như `private_key_jwt`.

## Scope

| Scope | Cho phép | Thay đổi production |
|-------|----------|---------------------|
| `deployments:read` | Workspace, project, trạng thái và log của deployment. Đây là mặc định khi client không xin scope nào. | Không |
| `deployments:write` | Deploy và rollback. | Có |
| `workspace:read` | Tên workspace và vai trò của bạn. Được thêm vào mọi yêu cầu scope hẹp hơn. | Không |
| `projects:read` | `list_projects`; khi bật ngân sách autoscaling, thêm `autoscaling_budget_get` | Không |
| `projects:write` | Với owner hoặc admin: `create_template_draft` và `publish_template`, và khi có thêm `deployments:execute` thì cả `deploy_template`. Khi bật ngân sách autoscaling, `autoscaling_budget_plan`, chỉ lưu thay đổi ngân sách thành một kế hoạch để người dùng duyệt trên dashboard | Chỉ `deploy_template`, vốn cần thêm `deployments:execute` |
| `logs:read` | `read_logs` | Không |
| `deployments:execute` | `deploy_project` | Có |
| `deployments:rollback` | `rollback_deployment` | Có |

- Mọi scope khác, gồm thành viên, thanh toán, biến môi trường, database và hạ tầng, đều bị từ chối với `invalid_scope`.
- Scope ghi chỉ được cấp khi owner hoặc admin của workspace tick chọn trên trang consent. Scope này bị gỡ ở lần refresh kế tiếp nếu người đó bị hạ vai trò.
- Refresh chỉ được thu hẹp scope, không bao giờ mở rộng.
- `tools/list` chỉ hiển thị tool mà scope cho phép: kết nối chỉ đọc thấy bốn tool đọc, có scope ghi thì thêm deploy và rollback.

Kể cả khi có scope ghi, mỗi lần deploy và rollback vẫn chờ bạn duyệt plan trong trình duyệt.

## Step-up `insufficient_scope`

Khi token chỉ đọc gọi một tool ghi:

- Ở revision 2026-07-28, server trả HTTP 403 kèm `WWW-Authenticate: Bearer error="insufficient_scope"` và các scope cần có. Client hỗ trợ step-up có thể đưa bạn quay lại bước consent để mở rộng quyền.
- Ở các revision cũ hơn, client nhận lỗi tool `INSUFFICIENT_SCOPE`.

Cả hai đều được ghi vào lịch sử audit với kết quả `denied`.

## Client chạy trên trình duyệt (`MCP_ALLOWED_ORIGINS`)

Request từ trình duyệt có header `Origin`, và TOSE từ chối origin lạ trước khi xác thực. `API_BASE_URL` và `FRONTEND_URL` luôn được cho phép. Client phía server không gửi `Origin` nên không bị ảnh hưởng.

Để dùng client chạy trên trình duyệt, ví dụ MCP Inspector bản hosted, người vận hành instance TOSE thêm origin của nó vào `MCP_ALLOWED_ORIGINS`, là danh sách ngăn cách bằng dấu phẩy. Với Inspector chạy cục bộ, giá trị là `http://localhost:6274`. Nếu thiếu, client nhận HTTP 403.

## Client được hỗ trợ

Client nào dùng được, và client nào đã thực sự được kiểm thử, nằm ở trang riêng: [Tương thích client](./clients).
