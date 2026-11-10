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

Cả hai luồng đều dùng authorization code kèm PKCE (chỉ S256), kể cả với client ký assertion. Cả hai đều chấp nhận callback `https`, callback `http` loopback và hai callback desktop cố định, xem [Redirect URI loopback](#redirect-uri-loopback). Client đăng ký động xác thực bằng `none` hoặc client secret (`client_secret_post` hoặc `client_secret_basic`).

### Client dùng metadata document và client assertion

Client dùng metadata document khai báo `token_endpoint_auth_method` là `none` hoặc `private_key_jwt`. Với `private_key_jwt`, tài liệu còn chứa khóa công khai của client dưới dạng JWKS, và client chứng minh danh tính tại token endpoint bằng một assertion có chữ ký.

Nếu một metadata document khai báo `private_key_jwt` và đồng thời cho phép `none`, client có thể trao đổi authorization code chỉ bằng PKCE. Sau đó hai loại cấp phát hoạt động khác nhau:

- Token family được cấp qua trao đổi PKCE công khai đó có thể refresh hoặc revoke mà không cần chữ ký.
- Token family được cấp bằng assertion có chữ ký luôn cần assertion để refresh hoặc revoke.

### Grant type trong metadata của client

Nếu bản đăng ký hoặc metadata document liệt kê `grant_types`, danh sách phải có `authorization_code`. TOSE bỏ qua các khai báo khác: ví dụ Claude còn khai báo thêm JWT bearer grant, và điều đó không ngăn nó kết nối. Token endpoint phục vụ authorization code kèm PKCE S256 và refresh token, không có grant nào khác.

### Redirect URI loopback

Client chạy trên máy của bạn, như ứng dụng desktop hoặc CLI, thường lắng nghe ở một cổng trống ngẫu nhiên. Với callback `http` loopback, cổng chỉ được khác cổng đã đăng ký khi URI đã đăng ký không nêu cổng. Host, đường dẫn đã mã hóa và query vẫn phải khớp chính xác. URI đã đăng ký có nêu cổng thì chỉ nhận đúng cổng đó.

Hai ứng dụng desktop dùng URL scheme tùy biến thay vì loopback. TOSE chấp nhận đúng hai callback sau, so khớp toàn bộ, và không chấp nhận scheme tùy biến nào khác:

- `cursor://anysphere.cursor-mcp/oauth/callback`
- `antigravity://google.antigravity/callback`

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
| `env:read` | `list_project_env_keys`, `inspect_project_env`: tên biến và trạng thái đã đặt hay chưa. Không bao giờ trả giá trị. Mặc định tắt, xem [Metadata biến môi trường](#metadata-bien-moi-truong-env-read). | Không |
| `env:write` | `plan_project_env_update`, `apply_project_env_update`: đổi biến sau khi bạn nhập giá trị và duyệt trong TOSE. Mặc định tắt, chỉ owner và admin, xem [Cập nhật biến môi trường](#cap-nhat-bien-moi-truong-env-write). | Có |

- Mọi scope khác, gồm thành viên, thanh toán, database và hạ tầng, đều bị từ chối với `invalid_scope`. `env:read` và `env:write` là hai scope về biến môi trường, mỗi scope được cấp riêng.
- Scope ghi chỉ được cấp khi owner hoặc admin của workspace tick chọn trên trang consent. Scope này bị gỡ ở lần refresh kế tiếp nếu người đó bị hạ vai trò.
- Refresh chỉ được thu hẹp scope, không bao giờ mở rộng.
- `tools/list` chỉ hiển thị tool mà scope cho phép: kết nối chỉ đọc thấy bốn tool đọc, có scope ghi thì thêm deploy và rollback. Hai tool metadata env chỉ hiện khi có `env:read`, hai tool cập nhật env chỉ hiện khi có `env:write`.

Kể cả khi có scope ghi, mỗi lần deploy và rollback vẫn chờ bạn duyệt plan trong trình duyệt.

### Metadata biến môi trường (`env:read`)

`env:read` cho phép client phân biệt một cấu hình bị thiếu với một cấu hình bị sai mà không bao giờ thấy giá trị.

- Mặc định tắt. Trang consent hiển thị scope này với ô chọn riêng, và kết nối chỉ có scope khi bạn tick ô đó. Không tick thì kết nối không có quyền truy cập env.
- Scope không nằm trong `deployments:read` hay `deployments:write`, nên quyền deploy không kèm theo nó và các kết nối hiện có không tự có thêm.
- Refresh chỉ có thể thu hẹp, không bao giờ thêm scope này. Muốn thêm sau, hãy kết nối lại và tick ô.
- Bất kỳ thành viên workspace nào cũng tự cấp được cho kết nối của mình. Owner và admin thấy trạng thái thật của từng biến; thành viên thấy `unknown` (xem [Tool metadata env](/vi/mcp#tool-metadata-env)).
- Vai trò thành viên được kiểm tra ở mỗi lần gọi, nên mất tư cách thành viên workspace thì kết nối dừng ngay ở lần gọi kế tiếp.

### Cập nhật biến môi trường (`env:write`)

`env:write` cho phép client đổi biến môi trường trong khi bạn vẫn kiểm soát mọi giá trị.

- Mặc định tắt. Trang consent hiển thị scope này với ô chọn riêng, nhưng chỉ owner hoặc admin của workspace mới cấp được: thành viên tick ô này thì consent thất bại và không có kết nối nào được tạo. Không tick thì kết nối không thể lập hay áp dụng thay đổi env.
- Scope tách biệt với `env:read`. Khác với `env:write` của API key, nó không bao gồm `env:read` và không cho client liệt kê hay xem biến, nên hãy tick cả hai ô khi client cần cả hai. Nó cũng không nằm trong `deployments:write`, nên quyền deploy không kèm theo nó.
- Refresh chỉ có thể thu hẹp, không bao giờ thêm scope này. Muốn thêm sau, hãy kết nối lại và tick ô.
- Client gửi thao tác và tên biến. Bạn nhập giá trị trong form TOSE đã đăng nhập và duyệt tại đó; riêng approval token không làm được gì. Xem [Tool cập nhật env](/vi/mcp#tool-cap-nhat-env).
- Vai trò được kiểm tra lại khi áp dụng kế hoạch. Nếu bạn bị hạ vai trò, hoặc kết nối không còn scope, lệnh áp dụng bị từ chối.

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
