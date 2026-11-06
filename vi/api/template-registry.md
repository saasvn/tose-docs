# API template registry

Các endpoint để tạo, sửa và validate bản nháp template riêng tư từ [manifest `tose.yaml`](/vi/guide/template-registry). Chúng nằm dưới `/api/workspaces/{slug}/template-definitions` và dùng cùng [cách xác thực](/vi/api/authentication) với phần còn lại của API.

::: warning Truy cập sớm
API này chỉ quản lý **bản nháp riêng tư**. Xuất bản công khai, thư mục, lập plan deploy, CLI và MCP cho template trong registry chưa có. Xem [bảng tình trạng](/vi/guide/template-registry#tinh-trang).
:::

[Spec OpenAPI](https://api.tose.sh/api/openapi.yaml) là nguồn chuẩn cho từng trường (các `operationId`: `listTemplateDefinitions`, `createTemplateDefinition`, `getTemplateDefinition`, `listTemplateDefinitionVersions`, `createTemplateDefinitionVersion`, `updateTemplateDefinitionDraft`, `validateTemplateDefinition`).

## Quyền truy cập

| Thao tác | Vai trò workspace | Scope của API key |
|----------|-------------------|-------------------|
| Liệt kê và đọc definition, version | `member` trở lên | `projects:read` |
| Tạo, sửa và validate | `admin` hoặc `owner` | `projects:write` |

Key chỉ dùng được trong workspace của nó. Request thiếu scope cần thiết trả `403` với `code: "insufficient_scope"`. Xem [API key](/vi/api/api-keys). Definition được giới hạn theo workspace gọi: definition của workspace khác trả `404`.

## Request body

Tạo, thêm version và sửa bản nháp dùng chung một body:

```json
{ "manifest_yaml": "apiVersion: tose.dev/v1\nmetadata:\n  name: sample\n  ..." }
```

Body là một object JSON chỉ có `manifest_yaml`, tối đa 128 KiB, riêng manifest tối đa 64 KiB. Key JSON lạ bị từ chối với `400 {"error":"invalid JSON body"}`.

## Tạo definition

```http
POST /api/workspaces/{slug}/template-definitions
```

Tạo definition riêng tư đặt theo `metadata.name` và một version nháp.

```json
{
  "definition": {
    "id": "...", "publisher_id": "...", "slug": "sample", "name": "sample",
    "category": "productivity", "visibility": "private"
  },
  "version": {
    "id": "...", "definition_id": "...", "version": "1.0.0", "status": "draft",
    "manifest_yaml": "...", "manifest_hash": "sha256:..."
  }
}
```

Status `201`. `manifest_hash` là SHA-256 của đúng đoạn YAML bạn gửi.

| Status | Ý nghĩa |
|--------|---------|
| `400` | Body không phải một object JSON chỉ có `manifest_yaml` |
| `403` | Không phải admin, hoặc key thiếu `projects:write` |
| `409` | Workspace đã có definition với slug này |
| `422` | Lỗi manifest: `{ "errors": [{ "path", "message" }] }` |

## Liệt kê và đọc

```http
GET /api/workspaces/{slug}/template-definitions?limit=50&cursor=<id>&category=productivity
GET /api/workspaces/{slug}/template-definitions/{definition_slug}
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

Danh sách trả `{ "definitions": [...], "next_cursor": "..." }`, sắp theo id. `limit` từ 1-100 (mặc định 50), ngoài khoảng này trả `400`. Truyền `next_cursor` làm `cursor` để lấy trang kế; `next_cursor` rỗng nghĩa là trang cuối. Lời gọi versions trả một mảng, mới nhất trước, tối đa 100.

## Thêm version nháp

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

`metadata.name` phải bằng slug của definition, nếu không trả `422` với path `metadata.name`. Trả `201` kèm version, hoặc `409` khi số version đó đã tồn tại.

## Sửa bản nháp

```http
PUT /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

`metadata.name` và `metadata.version` phải khớp với bản nháp hiện có (nếu không trả `422` với path `metadata`). Trả `204` không có body. `409 {"error":"only an existing draft version can be edited"}` khi version không phải bản nháp. Version đã rời `draft` là bất biến.

## Validate

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/validate
```

Parse lại version **mới nhất**, ghi một lượt validate và trả về:

```json
{
  "id": "...",
  "version_id": "...",
  "status": "valid",
  "errors": [],
  "security_gate": "pending"
}
```

`status` là `valid` hoặc `invalid`. Hiện `security_gate` luôn là `pending`: manifest hợp lệ chưa được duyệt để xuất bản hay build.

## Mẫu agent tuyển chọn {#curated-agent-templates}

::: warning Ẩn cho tới khi có bản phát hành đã rà soát
Các mẫu Pi, Claude Code và Codex tuyển chọn vẫn bị ẩn cho tới khi TOSE phát hành bản đã rà soát được ghim bằng digest. Hiện chưa có bản nào, nên mọi plan đều `blocked` với `CURATED_RELEASE_MISSING`. Xem [hướng dẫn](/vi/guide/template-registry#curated-agent-templates) để biết luồng trên dashboard, console và các blocker.
:::

| Thao tác | Vai trò workspace | Scope API key |
|----------|-------------------|---------------|
| `GET /api/workspaces/{slug}/curated-templates` | `member` trở lên | `deployments:read` |
| `GET /api/workspaces/{slug}/curated-templates/{key}` | `member` trở lên | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans` với `curated_template` | `member` trở lên | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans/{plan_id}/approve` | `admin` hoặc `owner`, đăng nhập hoặc dùng key | `deployments:execute` |
| `POST /api/workspaces/{slug}/template-installations` kèm `Idempotency-Key` | `admin` hoặc `owner`, đăng nhập hoặc dùng key | `deployments:execute` và `projects:write`, thêm `env:write` khi gửi `secrets` |
| `POST /api/workspaces/{slug}/template-installations/{installation_id}/console-sessions` | `admin` hoặc `owner`, **chỉ khi đã đăng nhập** | không có: API key và ứng dụng đã kết nối bị từ chối |

Danh sách trả về các trường nhập của biểu mẫu (nhà cung cấp và tên khóa, `AGENT_MODEL`, số nhân và GiB cho phép, `network_mode`, `max_hourly_cost_cents` bắt buộc), `hidden`, `releases`, cổng và storage của runtime, cùng các blocker không phụ thuộc workspace. Danh sách không bao giờ chứa giá trị bí mật. Mẫu ẩn chỉ hiện khi có `include_hidden=true`; đọc theo key vẫn trả về mẫu ẩn. Key không tồn tại trả `404 CURATED_TEMPLATE_NOT_FOUND`.

Yêu cầu lập plan (gửi `curated_template` hoặc `definition_slug`, không gửi cả hai):

```json
{
  "curated_template": "claude-code",
  "name": "My agent",
  "cpu_cores": 2,
  "memory_gib": 4,
  "network_mode": "approved",
  "variables": {"AGENT_MODEL": "claude-sonnet-4-5"},
  "max_hourly_cost_cents": 20
}
```

- Mẫu tuyển chọn bắt buộc có `max_hourly_cost_cents`.
- Khóa nhà cung cấp trong `variables` trả `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`; phản hồi không lặp lại khóa và khóa không bao giờ được lưu trong plan.
- Trường lạ như lệnh khởi động, hook hay `privileged` trả `400`.
- Plan có thêm mục `curated` được băm: nhà cung cấp, `auth: byok`, chế độ mạng cùng các đích, kiểu thiết lập và `human_control` (ai được thao tác và các route dừng, gỡ khóa, xóa). Agent không giữ thông tin xác thực API TOSE.
- Phê duyệt plan có blocker trả `PLAN_BLOCKED` (`409`, hoặc `402` khi ví trống) và không tạo gì; ứng dụng MCP đã kết nối nhận `403 APPROVAL_REQUIRES_PERSON`.
- Plan tuyển chọn ánh xạ bản phát hành tới một version registry đã xuất bản (`template.version_id`) và kiểm tra manifest đã lưu đúng bằng manifest của bản phát hành. Khi bản phát hành không cài được từ registry (chưa xuất bản, được lưu với manifest khác, hoặc nhà phát hành `tose-curated` bị đình chỉ), plan mang `CURATED_INSTALL_UNAVAILABLE`; version bị thu hồi mang `VERSION_REVOKED`.
- Cài plan đã phê duyệt là `POST /template-installations` thông thường kèm `Idempotency-Key`. Khóa nhà cung cấp chỉ nằm trong `secrets`, được lưu mã hóa và không bao giờ được trả lại. Nâng cấp tại chỗ một bản cài tuyển chọn trả `409 CURATED_UPGRADE_UNAVAILABLE`.

### Mở console

`POST .../template-installations/{installation_id}/console-sessions` không có body và trả `201`:

```json
{
  "installation_id": "ins_...",
  "console_path": "/api/template-console/<signed token>/",
  "expires_at": "2026-11-06T18:00:00Z"
}
```

- Chỉ chủ sở hữu hoặc quản trị viên workspace đã đăng nhập. API key hoặc ứng dụng đã kết nối nhận `403` dù có scope nào; yêu cầu được ghi nhật ký kiểm toán.
- Ứng dụng phải đang chạy; nếu không là `409 CONSOLE_UNAVAILABLE` (`503` khi máy chủ chưa kiểm tra được). View bản cài có trường tùy chọn `console` (`available`, `reason`, `session_path`).
- Mở `console_path` trong tab trình duyệt mới. Đường dẫn này phục vụ cổng 8080 của agent (HTTP và WebSocket) qua port-forward, và token trong đó có hiệu lực tới `expires_at` (8 giờ). Đừng chia sẻ. Token không rõ hoặc đã hết hạn trả `404 CONSOLE_SESSION_NOT_FOUND`.
- Mỗi yêu cầu, và mỗi WebSocket đang mở cứ năm giây một lần, kiểm tra lại rằng người dùng còn đăng nhập, vẫn là chủ sở hữu hoặc quản trị viên và ứng dụng đang chạy. Nếu không, yêu cầu bị từ chối và socket đóng. Mỗi lần mở WebSocket đều được ghi nhật ký kiểm toán.
- Trang được phục vụ trong CSP sandbox; cookie và thông tin xác thực của bạn bị bỏ trước khi yêu cầu tới agent.

[Đặc tả OpenAPI](https://api.tose.sh/api/openapi.yaml) (`CuratedTemplate`, `listCuratedTemplates`) là nguồn chuẩn.

## Chưa có

Các endpoint bản nháp ở trên chưa có idempotency key, plan, `next_actions` hay thời hạn plan, vì chúng chỉ quản lý bản nháp. Planner triển khai đã ra mắt ở backend, nhưng ở đây mới tài liệu hóa phần dùng cho mẫu tuyển chọn; plan, cài đặt và thời hạn của template registry sẽ được tài liệu hóa riêng. Xem [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) để biết contract hiện hành.

## Xem thêm

- [Manifest `tose.yaml` và tình trạng](/vi/guide/template-registry)
- [API template](/vi/api/templates) cho catalog 1-click và deployment
- [Lỗi](/vi/api/errors)
