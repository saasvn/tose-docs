# API key và scope

API key của workspace cho phép script, job CI hoặc AI agent gọi TOSE REST API mà không cần người dùng đăng nhập. Trang này giải thích một key làm được gì, cách giới hạn key bằng scope và những route không bao giờ chấp nhận key.

Cách gửi key kèm request nằm ở trang [Xác thực](/vi/api/authentication).

## Một key thuộc một workspace

- Key thuộc **một workspace**, chính là workspace đã tạo ra nó. Key đọc và thay đổi được workspace đó, không làm được gì ngoài workspace.
- Key không bao giờ có quyền cấp tài khoản hay cấp nền tảng, kể cả khi người tạo key là platform admin. Xem [Route từ chối API key](#route-tu-choi-api-key).
- TOSE kiểm tra tư cách thành viên của người tạo key ở mỗi request. Nếu người đó bị xóa khỏi workspace hoặc bị hạ vai trò, key của họ mất quyền tương ứng ngay lập tức.
- Request tới workspace khác bị từ chối với `403`.

## Tạo key

Chỉ owner và admin của workspace mới tạo được key. Gửi key trong header `X-API-Key` ở mọi request. Key chỉ hiển thị **một lần**, lúc bạn tạo. TOSE chỉ lưu hash nên key đã mất không khôi phục được và phải thay bằng key mới.

```http
POST /api/workspaces/{slug}/api-keys
Content-Type: application/json

{
  "name": "ci-deploy",
  "expires_in_days": 90,
  "scopes": ["deployments:read", "deployments:execute", "logs:read"]
}
```

| Trường | Bắt buộc | Ý nghĩa |
|--------|----------|---------|
| `name` | Có | Nhãn để nhận ra key sau này. |
| `expires_in_days` | Không | Key ngừng hoạt động sau số ngày này. Bỏ trống thì key không hết hạn. |
| `scopes` | Không | Các scope cấp cho key. Bỏ trống nghĩa là toàn quyền trong workspace (xem bên dưới). Danh sách rỗng bị từ chối. |

Scope không tồn tại bị từ chối với `400`, và phản hồi liệt kê `allowed_scopes`.

## Scope

Mỗi scope đặt tên cho một loại thao tác. Key chỉ làm được những gì scope của nó cho phép. Request cần scope mà key không có sẽ lỗi `403` với `code: "insufficient_scope"`, và phản hồi nêu scope còn thiếu trong `required_scope`.

Bảng dưới được tạo từ catalog phân quyền trong tose-app (`internal/policy`). Cột "Bao gồm" liệt kê các scope hẹp hơn mà một scope đã bao hàm. Tên action giữ nguyên như trong catalog.

| Scope | Bao gồm | Action được phép |
|-------|---------|------------------|
| `workspace:read` | - | `workspace.read`, `member.read`, `invitation.read`, `api_key.read` |
| `workspace:write` | `workspace:read` | `workspace.update`, `workspace.delete`, `api_key.create`, `api_key.revoke` |
| `members:manage` | - | `member.manage`, `member.remove`, `invitation.manage` |
| `projects:read` | - | `project.read` |
| `projects:write` | `projects:read` | `project.write`, `project.delete` |
| `deployments:read` | `workspace:read`, `projects:read`, `logs:read` | `deployment.read` |
| `deployments:execute` | - | `deployment.execute` |
| `deployments:rollback` | - | `deployment.rollback` |
| `logs:read` | - | `logs.read` |
| `env:read` | - | `env.read`, `env.reveal` |
| `env:write` | `env:read` | `env.write` |
| `domains:write` | - | `domain.write` |
| `databases:read` | - | `database.read`, `database.data_read` |
| `databases:write` | `databases:read` | `database.write`, `database.delete` |
| `desktops:read` | - | `desktop.read` |
| `desktops:write` | `desktops:read` | `desktop.write` |
| `billing:read` | - | `billing.read` |
| `billing:write` | `billing:read` | `billing.write` |

Lưu ý:

- `deployments:read` đã bao gồm đọc project, log và workspace, nên key chỉ-đọc cho một dashboard trạng thái chỉ cần đúng scope này.
- Đọc giá trị biến môi trường (`env.reveal`) cần `env:read`. Hãy coi `env:read` như một secret.
- `deployments:write` chỉ dành cho [MCP connector](/vi/mcp) và không cấp được cho API key.
- Scope giới hạn key, không giới hạn con người. Dù có scope, request vẫn có thể bị từ chối nếu vai trò workspace của người tạo key quá thấp cho thao tác đó.

## Key toàn quyền

Key được tạo **không kèm** `scopes` có toàn quyền trong workspace của nó: mọi action mà vai trò của người tạo cho phép. Các key tạo trước khi có scope cũng hoạt động như vậy. Chúng vẫn chạy bình thường và vẫn không ra khỏi được workspace của mình.

Nên dùng key có scope. Khi có thể, hãy thay key toàn quyền bằng key có scope rồi thu hồi key cũ.

## Khuyến nghị

- **Dùng tập scope nhỏ nhất** đủ cho công việc. Job CI deploy cần `deployments:execute`, `deployments:read` và `logs:read`, không cần `env:write` hay `billing:write`.
- **Mỗi pipeline CI và mỗi agent dùng một key riêng**, đặt tên theo công cụ hoặc agent sử dụng nó, để thu hồi một key mà không làm hỏng các key khác.
- **Đặt `expires_in_days`** cho key không phải hạ tầng dài hạn, và xoay key định kỳ.
- **Không đưa key vào source control hay URL.** Lưu trong kho secret của CI. Request mang key trong query string bị từ chối với `400 credentials_in_url`.
- **Key có scope không tạo được key rộng hơn.** Một key chỉ tạo được key có scope mà nó đang có, và key có scope bắt buộc liệt kê scope của key mới.
- **Rà soát key.** `GET /api/workspaces/{slug}/api-keys` liệt kê key, `DELETE /api/workspaces/{slug}/api-keys/{key_id}` thu hồi một key. Việc tạo và thu hồi key được ghi vào [audit log](/vi/api/audit).

## Route từ chối API key {#route-tu-choi-api-key}

Một số route tác động lên tài khoản của một người hoặc hạ tầng dùng chung, không thuộc một workspace. Key bị ràng buộc vào một workspace nên các route này từ chối key với `403 forbidden`. Hãy dùng phiên đã đăng nhập.

| Route | Lý do |
|-------|-------|
| `POST /api/workspaces` | Tạo workspace là thao tác cấp tài khoản. |
| `POST /api/invitations/{token}/accept` | Chấp nhận lời mời là thao tác cấp tài khoản. |
| `POST /api/upload` | Xem bên dưới. |
| `POST /api/github/check-install`, `POST` và `DELETE /api/github/workspace-installations` | Quản lý GitHub installation là thao tác cấp tài khoản. |
| `GET /api/mcp/connections`, `DELETE /api/mcp/connections/{family_id}`, `GET /api/mcp/tasks`, `GET /api/mcp/audit` | Kết nối thuộc về người tạo ra nó, nên chỉ người đó xem và thu hồi được. |
| `POST` và `DELETE /api/servers`, `PUT /api/servers/{id}/development`, `POST` và `DELETE /api/registries`, `GET /api/registries` | Server và registry là hạ tầng nền tảng dùng chung. |

Một vài route đọc cấp tài khoản vẫn nhận key, nhưng chỉ trong workspace của key: `GET /api/workspaces` chỉ liệt kê workspace của key, `GET /api/workspaces/available-templates` trả về catalog template, còn `GET /api/servers` và các route đọc `GET /api/github/...` kiểm tra workspace mà key đang gắn. Các route đọc GitHub còn cần scope `projects:read`.

### Thay đổi hành vi: `POST /api/upload` không còn nhận API key

Trước đây `POST /api/upload` nhận API key. Nay route này từ chối key với `403 forbidden` và chỉ nhận phiên người dùng đã đăng nhập.

Lý do: file upload được lưu dưới tài khoản của **người dùng**, không phải dưới một workspace, và trong chính sách phân quyền của TOSE đây là thao tác cấp tài khoản. API key bị ràng buộc vào một workspace và không mang quyền cấp tài khoản. Nguyên tắc của TOSE là mọi việc một người làm được trong dashboard đều làm được bằng API key, trừ khi lý do ngoại lệ được ghi lại. Đây là ngoại lệ đó.

Nếu script của bạn từng gọi `POST /api/upload` bằng key, hãy upload file từ phiên đã đăng nhập, hoặc lưu file ở nơi khác rồi truyền URL của nó.
