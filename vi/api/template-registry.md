# API template registry

Các endpoint để kiểm tra, tạo, sửa, validate và xuất bản template của workspace từ [manifest `tose.yaml`](/vi/guide/template-registry). Chúng nằm dưới `/api/workspaces/{slug}` và dùng cùng [cách xác thực](/vi/api/authentication) với phần còn lại của API.

::: info Xuất bản nghĩa là gì
Mọi definition đều **riêng tư** trong workspace của nó. Xuất bản đóng băng một version bên trong workspace, không liệt kê nó ở nơi nào khác. Đưa một version đã xuất bản ra công khai là việc của thư mục template, còn deploy nó đi qua planner triển khai. Trên TOSE được lưu trữ, việc cài template của workspace và của cộng đồng vẫn bị chặn (`COMMUNITY_TEMPLATES_DISABLED`, `IMAGE_SCANNER_NOT_CONFIGURED`). Xem [bảng tình trạng](/vi/guide/template-registry#tinh-trang).
:::

[Spec OpenAPI](https://api.tose.sh/api/openapi.yaml) (tag "Template registry") là nguồn chuẩn cho từng trường. Các `operationId` gồm `dryRunTemplateManifest`, `listTemplateDefinitions`, `createTemplateDefinition`, `getTemplateDefinition`, `validateTemplateDefinition`, `listTemplateDefinitionVersions`, `createTemplateDefinitionVersion`, `getTemplateDefinitionVersion`, `updateTemplateDefinitionDraft`, `validateTemplateDefinitionVersion` và `publishTemplateDefinitionVersion`.

## Các route

Mọi đường dẫn đều tính từ `/api/workspaces/{slug}`. `...` thay cho `/template-definitions/{definition_slug}`.

| Route | Ai | Làm gì |
|-------|----|--------|
| `POST /template-manifests/validate` | member, `projects:read` | Kiểm tra manifest mà không lưu gì. Cho biết definition và version đã tồn tại chưa. |
| `GET /template-definitions` | member, `projects:read` | Liệt kê definition của workspace. |
| `POST /template-definitions` | owner hoặc admin, `projects:write` | Tạo definition riêng tư cùng bản nháp đầu tiên. |
| `GET ...` | member, `projects:read` | Definition, số version, version mới nhất và version đã xuất bản mới nhất theo thứ tự semantic version. |
| `POST .../validate` | owner hoặc admin, `projects:write` | Validate version được tạo sau cùng. Nên chỉ rõ version thay vì dùng route này. |
| `GET .../versions` | member, `projects:read` | Liệt kê version, mới nhất trước. |
| `POST .../versions` | owner hoặc admin, `projects:write` | Thêm một version nháp. |
| `GET .../versions/{version}` | member, `projects:read` | Một version kèm manifest đã parse và lượt validate gần nhất. |
| `PUT .../versions/{version}` | owner hoặc admin, `projects:write` | Thay manifest của bản nháp. |
| `POST .../versions/{version}/validate` | owner hoặc admin, `projects:write` | Kiểm tra lại manifest đã lưu và ghi một lượt validate. |
| `POST .../versions/{version}/publish` | owner hoặc admin, `projects:write` | Kiểm tra lại manifest và đóng băng version bên trong workspace. |

Key chỉ dùng được trong workspace của nó: key của workspace khác nhận `403`, và request thiếu scope cần thiết trả `403` với `code: "insufficient_scope"` (xem [API key](/vi/api/api-keys)). Definition của workspace khác trả `404 template_definition_not_found`, giống hệt definition không tồn tại. Phiên đăng nhập, API key của workspace và ứng dụng đã kết nối đều nhận cùng câu trả lời.

## Request body

Tạo, thêm version, sửa bản nháp và chạy thử dùng chung một body:

```json
{ "manifest_yaml": "apiVersion: tose.dev/v1\nmetadata:\n  name: sample\n  ..." }
```

Body là một object JSON tối đa 128 KiB, riêng manifest tối đa 64 KiB. `PUT` nhận thêm `expected_manifest_hash`; xuất bản nhận body rỗng hoặc `{"expected_manifest_hash": "sha256:..."}`. Trường nào khác cũng trả `400 invalid_request`.

`expected_manifest_hash` khiến lời gọi bị từ chối với `409 template_manifest_changed` nếu manifest đã lưu không còn hash đó. Hãy gửi nó để chỉ sửa đúng bản nháp bạn đã đọc, và chỉ xuất bản đúng manifest bạn đã xem lại.

## Kiểm tra manifest mà không lưu

```http
POST /api/workspaces/{slug}/template-manifests/validate
```

Parse manifest theo cùng quy tắc như khi tạo và trả `200` với `valid`, `errors` (mọi lỗi kèm đường dẫn trường), `manifest` đã parse, `manifest_hash`, `definition_exists` và `version_status` (trạng thái của `metadata.version` trong definition đó, hoặc `null`). Dùng nó để quyết định nên tạo definition, thêm version hay sửa bản nháp. `security_gate` vẫn là `pending`: manifest hợp lệ chưa được phép build.

## Tạo definition

```http
POST /api/workspaces/{slug}/template-definitions
```

Tạo definition riêng tư đặt theo `metadata.name`, version nháp đầu tiên `metadata.version` và một lượt validate.

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

Status `201`. `manifest_hash` là SHA-256 của đúng đoạn YAML bạn gửi. Tên đã dùng trong workspace, kể cả tên của definition đã xóa, trả `409 template_definition_exists`.

## Liệt kê và đọc

```http
GET /api/workspaces/{slug}/template-definitions?limit=50&sort=-updated&tag=ai&q=sample
GET /api/workspaces/{slug}/template-definitions/{definition_slug}
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions?status=published
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

- Danh sách trả `{ "definitions": [...], "next_cursor": "..." }`. Bộ lọc: `category`, `tag` và `q` (chuỗi con của slug hoặc mô tả, không phân biệt hoa thường, tối đa 100 ký tự). `sort` là `created` (mặc định), `updated` hoặc `slug`, thêm tiền tố `-` để sắp giảm dần.
- Danh sách version trả `{ "versions": [...], "next_cursor": "..." }`, mới nhất trước, có thể lọc theo `status`.
- Cả hai danh sách phân trang bằng cursor kiểu keyset: `limit` từ 1-100 (mặc định 50, ngoài khoảng này trả `400 invalid_request`). Truyền `next_cursor` làm `cursor`, cùng `sort`, để lấy trang kế. `next_cursor` là `null` ở trang cuối.
- Đọc một version trả `manifest` đã parse và lượt validate gần nhất. `manifest` là `null`, kèm `manifest_errors`, khi manifest đã lưu không còn đạt quy tắc hiện hành.

## Thêm version nháp

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

`metadata.name` phải bằng slug của definition, nếu không trả `422` với path `metadata.name`. Trả `201` kèm version. Số version không bao giờ được dùng lại: version đã tồn tại, ở bất kỳ trạng thái nào, trả `409 template_version_exists`.

## Sửa bản nháp

```http
PUT /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

`metadata.name` và `metadata.version` phải giữ nguyên (nếu không trả `422`). Trả `204` không có body; đọc `manifest_hash` mới bằng `GET .../versions/{version}`. Version không còn là bản nháp trả `409 template_version_not_draft`: hãy thêm version mới. Khi gửi `expected_manifest_hash`, bản nháp đã bị người khác sửa trong lúc đó trả `409 template_manifest_changed`. Mỗi lần sửa đều ghi một lượt validate.

## Validate

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}/validate
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/validate
```

Kiểm tra manifest đã lưu của version đó (hoặc của version được tạo sau cùng) theo quy tắc hiện hành, ghi một lượt validate và trả về. Bản thân version không thay đổi.

```json
{
  "id": "...",
  "version_id": "...",
  "version": "1.0.0",
  "status": "valid",
  "manifest_hash": "sha256:...",
  "errors": [],
  "security_gate": "pending",
  "created_at": "..."
}
```

`status` là `valid` hoặc `invalid`; manifest không hợp lệ vẫn trả `200`. `manifest_hash` cho biết lượt này đã kiểm tra manifest nào, nên lần sửa bản nháp sau đó không được lượt này bao phủ. `security_gate` luôn là `pending`: manifest hợp lệ chưa được phép build.

## Xuất bản

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}/publish
```

Kiểm tra lại manifest và đóng băng version: từ đó manifest không đổi được và version không xóa được. Chế độ hiển thị vẫn là riêng tư: không có gì được liệt kê ngoài workspace, được build hay được deploy. Trả `200` kèm version đã xuất bản. Xuất bản lại một version đã xuất bản trả nó về nguyên vẹn, nên thử lại là an toàn. Gửi `expected_manifest_hash` để chỉ xuất bản đúng manifest bạn đã xem lại.

## Lỗi

Mỗi lỗi có `code` ổn định bên cạnh `error` (xem [Lỗi](/vi/api/errors)):

| Status và code | Khi nào |
|----------------|---------|
| `400 invalid_request` | Body không phải một object JSON chỉ chứa các trường cho phép, hoặc tham số query nằm ngoài khoảng (`limit`, `sort`, `status`). |
| `422 manifest_invalid` | Manifest không đạt validate. `errors[]` liệt kê mọi lỗi dạng `{path, message}`. |
| `409 template_definition_exists` | Workspace đã có definition với tên này, kể cả definition đã xóa. |
| `409 template_version_exists` | Số version này đã tồn tại, ở bất kỳ trạng thái nào. |
| `409 template_version_not_draft` | Chỉ sửa được bản nháp. |
| `409 template_manifest_changed` | Manifest đã lưu không còn hash `expected_manifest_hash`. |
| `404 template_definition_not_found`, `404 template_version_not_found` | Workspace này không có definition hoặc version đó. |

Các route thư mục dựa trên những definition này (hồ sơ nhà phát hành, listing, báo cáo) dùng cùng dạng lỗi và có thêm `422 invalid_input` (một trường của request, kèm `errors[]`), `422 template_prereview_failed` (một bước kiểm tra tự động trước review đã từ chối bài gửi) và `429` (`template_listing_limit`, `template_report_limit`).

Các lần sửa, xuất bản và validate cùng một version được tuần tự hóa: trong các lần tạo đồng thời cùng một slug hoặc version, chỉ đúng một lần thành công; một lần sửa chạy đua với lần xuất bản thì hoặc xong trước (và lần xuất bản bị từ chối vì hash đã đổi), hoặc bị từ chối sau đó.

## Mẫu agent tuyển chọn {#curated-agent-templates}

Các mẫu Pi, Claude Code và Codex tuyển chọn đã được phát hành: Codex 1.0.0, Claude Code 1.0.0, và Pi 1.0.0 cùng 1.1.0 (mặc định cho Pi). Mỗi bản phát hành là một version registry đã xuất bản, được ghim bằng digest, dưới nhà phát hành nền tảng `tose-curated`. Máy chủ của bạn cung cấp agent và bản phát hành nào thì xem ở `GET /curated-templates`. Xem [hướng dẫn](/vi/guide/template-registry#curated-agent-templates) để biết về dashboard, console và các blocker.

| Thao tác | Vai trò workspace | Scope API key |
|----------|-------------------|---------------|
| `GET /api/workspaces/{slug}/curated-templates` | `member` trở lên | `deployments:read` |
| `GET /api/workspaces/{slug}/curated-templates/{key}` | `member` trở lên | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans` với `curated_template` | `member` trở lên | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans/{plan_id}/approve` | `admin` hoặc `owner`, đăng nhập hoặc dùng key | `deployments:execute` |
| `POST /api/workspaces/{slug}/template-installations` kèm `Idempotency-Key` | `admin` hoặc `owner`, đăng nhập hoặc dùng key | `deployments:execute` và `projects:write`, thêm `env:write` khi gửi `secrets` |
| `POST /api/workspaces/{slug}/template-installations/{installation_id}/console-sessions` | `admin` hoặc `owner`, **chỉ khi đã đăng nhập** | không có: API key và ứng dụng đã kết nối bị từ chối |

Danh sách trả về các trường nhập của biểu mẫu (nhà cung cấp và tên khóa, `AGENT_MODEL`, số nhân và GiB cho phép, `network_mode`, `max_hourly_cost_cents` không bắt buộc), `hidden`, `releases`, cổng và storage của runtime, cùng các blocker không phụ thuộc workspace. Danh sách không bao giờ chứa giá trị bí mật. Mẫu bị giữ lại bằng `hidden` chỉ hiện khi có `include_hidden=true`; đọc theo key vẫn trả về mẫu đó. Key không tồn tại trả `404 CURATED_TEMPLATE_NOT_FOUND`.

Yêu cầu lập plan (gửi `curated_template` hoặc `definition_slug`, không gửi cả hai):

```json
{
  "curated_template": "claude-code",
  "name": "My agent",
  "cpu_cores": 2,
  "memory_gib": 4,
  "network_mode": "approved",
  "variables": {"AGENT_MODEL": "claude-sonnet-4-5"}
}
```

- `max_hourly_cost_cents` **không bắt buộc** (bắt buộc cho tới 2026-11-09, tose-app [#571](https://github.com/saasvn/tose-app/pull/571)). Plan luôn hiển thị mức trần chi phí để phê duyệt; khi bạn đặt giới hạn, plan có mức trần cao hơn sẽ bị chặn với `COST_CEILING_EXCEEDED`. Dashboard không hỏi trường này. Ví trống chặn plan với `INSUFFICIENT_BALANCE`.
- `network_mode` là `approved` (mặc định), `development` hoặc `internet`. Danh sách mô tả `development` trong một object `development` riêng, kèm các máy chủ của từng bộ công cụ theo chính sách đã rà soát của máy chủ; client chỉ đưa ra chế độ này khi có object đó.
- Khóa nhà cung cấp trong `variables` trả `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`; phản hồi không lặp lại khóa và khóa không bao giờ được lưu trong plan.
- Trường lạ như lệnh khởi động, hook hay `privileged` trả `400`.
- Plan có thêm mục `curated` được băm: bản phát hành, nhà cung cấp, `auth: byok`, chế độ mạng cùng các đích, kiểu thiết lập và `human_control` (ai được thao tác và các route dừng, gỡ khóa, xóa). Agent không giữ thông tin xác thực API TOSE.
- Phê duyệt plan có blocker trả `PLAN_BLOCKED` (`409`, hoặc `402` khi ví trống) và không tạo gì; ứng dụng MCP đã kết nối nhận `403 APPROVAL_REQUIRES_PERSON`.
- Plan tuyển chọn ánh xạ bản phát hành tới một version registry đã xuất bản (`template.version_id`) và kiểm tra manifest đã lưu đúng bằng manifest của bản phát hành. Khi bản phát hành không cài được từ registry (chưa xuất bản, được lưu với manifest khác, hoặc nhà phát hành `tose-curated` bị đình chỉ), plan mang `CURATED_INSTALL_UNAVAILABLE`; version bị thu hồi mang `VERSION_REVOKED`.
- Đăng nhập bằng gói theo cờ máy chủ `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, được chủ sản phẩm cho phép trên production từ 2026-11-09. Ở máy chủ bật cờ này, nhà cung cấp `chatgpt` của Codex (`CODEX_PROVIDER=chatgpt`) được đưa ra và trang ứng dụng đã cài của Claude Code có nút **Kết nối Claude**. Ở máy chủ tắt cờ, `chatgpt` là `available: false` kèm lý do và plan chọn nó bị chặn với `SUBSCRIPTION_LOGIN_DISABLED`, nên hãy đọc danh sách thay vì giả định. `CODEX_PROVIDER=openai` hoặc `CLAUDE_PROVIDER=anthropic` với khóa API không bao giờ phụ thuộc cờ. Xem [Đăng nhập nhà cung cấp](/vi/guide/template-registry#provider-sign-in).
- Khi cờ bật, các route `provider-account` (mã thiết bị của Codex) và `claude-provider-account` (mã dán của Claude) dưới một installation phục vụ owner và admin đã đăng nhập của workspace; khi tắt chúng trả `404`. Route `login/code` của Claude nhận mã đăng nhập dùng một lần của Anthropic một lần và không bao giờ lưu hay trả lại. Không API nào khác nhận token, cookie, tệp đăng nhập hay mã của nhà cung cấp, nên đừng xây tích hợp thu thập chúng. Tắt cờ cần khởi động lại API, đóng cả hai đăng nhập cùng lúc và không thu hồi các phiên nhà cung cấp đã có. Hợp đồng là [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml) và [bản ghi quyết định](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md). Đăng nhập native trong terminal (`CLAUDE_PROVIDER=claude` với `/login` trong console) tách biệt với cờ.
- Cài plan đã phê duyệt là `POST /template-installations` thông thường kèm `Idempotency-Key`. Khóa nhà cung cấp chỉ nằm trong `secrets`, được lưu mã hóa và không bao giờ được trả lại. Nâng cấp tại chỗ một bản cài tuyển chọn trả `409 CURATED_UPGRADE_UNAVAILABLE`.

### Mở console

`POST .../template-installations/{installation_id}/console-sessions` nhận body rỗng (hoặc `{}`; trường khác trả `400`) và trả `201`:

```json
{
  "installation_id": "...",
  "console_path": "/api/template-console/<signed token>/",
  "expires_at": "2026-11-06T18:00:00Z"
}
```

- Chỉ chủ sở hữu hoặc quản trị viên workspace đã đăng nhập. API key hoặc ứng dụng đã kết nối nhận `403` dù có scope nào; yêu cầu được ghi nhật ký kiểm toán.
- Bản cài phải là agent tuyển chọn có ứng dụng đang chạy; nếu không là `409 CONSOLE_UNAVAILABLE` (`503` khi console chưa được cấu hình hoặc máy chủ chưa kiểm tra được). Bản cài không tồn tại trả `404 INSTALLATION_NOT_FOUND`. View bản cài có trường tùy chọn `console` (`available`, `reason`, `session_path`).
- Mở `console_path` trong tab trình duyệt mới. Đường dẫn này phục vụ cổng 8080 của agent (HTTP và WebSocket) qua port-forward, và token trong đó có hiệu lực tới `expires_at` (8 giờ). Đừng chia sẻ. Token không rõ, đã hết hạn hoặc phiên đã đăng xuất trả `404 CONSOLE_SESSION_NOT_FOUND`; mất vai trò trả `403`, ứng dụng dừng trả `409 CONSOLE_UNAVAILABLE`, và pod không tới được trả `502 CONSOLE_UNREACHABLE`.
- Mỗi yêu cầu, và mỗi WebSocket đang mở cứ năm giây một lần, kiểm tra lại rằng người dùng còn đăng nhập, vẫn là chủ sở hữu hoặc quản trị viên và ứng dụng đang chạy. Nếu không, yêu cầu bị từ chối và socket đóng. Mỗi lần mở WebSocket đều được ghi nhật ký kiểm toán.
- Trang được phục vụ trong CSP sandbox; cookie và thông tin xác thực của bạn bị bỏ trước khi yêu cầu tới agent.

[Đặc tả OpenAPI](https://api.tose.sh/api/openapi.yaml) (`CuratedTemplate`, `listCuratedTemplates`) là nguồn chuẩn.

## Không thuộc trang này

Các route registry ở trên không nhận idempotency key và không trả plan, `next_actions` hay thời hạn: chúng quản lý definition và version, không phải lần triển khai. Việc deploy một version registry (plan, phê duyệt, bản cài, nâng cấp và rollback) nằm ở tag OpenAPI "Template deployments"; trang này chỉ tài liệu hóa phần dùng cho mẫu tuyển chọn. Các route của thư mục công khai nằm ở tag "Template directory".

## Xem thêm

- [Manifest `tose.yaml` và tình trạng](/vi/guide/template-registry)
- [API template](/vi/api/templates) cho catalog 1-click và deployment
- [Lỗi](/vi/api/errors)
