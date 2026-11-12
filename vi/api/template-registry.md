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

Danh sách trả về các trường nhập của biểu mẫu (nhà cung cấp và tên khóa, `AGENT_MODEL`, số nhân và GiB cho phép, `workspace_disk_gib`, `network_mode`, `max_hourly_cost_cents` không bắt buộc), `hidden`, `releases`, cổng và storage của runtime, cùng các blocker không phụ thuộc workspace. Danh sách không bao giờ chứa giá trị bí mật. Mẫu bị giữ lại bằng `hidden` chỉ hiện khi có `include_hidden=true`; đọc theo key vẫn trả về mẫu đó. Key không tồn tại trả `404 CURATED_TEMPLATE_NOT_FOUND`.

Yêu cầu lập plan (gửi `curated_template` hoặc `definition_slug`, không gửi cả hai):

```json
{
  "curated_template": "claude-code",
  "name": "My agent",
  "cpu_cores": 2,
  "memory_gib": 4,
  "network_mode": "approved",
  "workspace_disk_gib": 10,
  "variables": {"AGENT_MODEL": "claude-sonnet-4-5"}
}
```

- `workspace_disk_gib` là dung lượng (GiB) của volume `/workspace` của agent: một trong `inputs.workspace_disk_gib.allowed` của danh sách (5, mặc định, 10, 20 hoặc 50). `inputs.workspace_disk_gib` còn có `default` và `monthly_usd`, giá lưu trữ mỗi tháng của từng mức theo thứ tự của `allowed`. Giá trị khác trả `422 PLAN_INPUT_INVALID` tại `workspace_disk_gib`. `/home/agent` vẫn là 1 GiB. Plan ghim dung lượng trong `curated.storage.workspace_disk_gib`, nằm trong plan hash, và tính giá cả ổ đĩa vào mức trần chi phí. Plan chỉ đặt dung lượng khi cài: plan nâng cấp hoặc rollback gửi trường này bị từ chối. Để tăng ổ đĩa sau này, hãy tăng volume của agent bằng `PATCH /api/workspaces/{slug}/volumes/{volume_id}` ([API ổ đĩa](/vi/api/disks#resize-volume)); dung lượng ổ đĩa ghi nhận của bản cài sau đó đi theo volume. Lưu trữ bị tính phí khi ổ đĩa còn tồn tại, kể cả khi agent đã dừng.
- `repository` ghim một kho GitHub (chỉ owner và admin); xem [Kho mã GitHub](/vi/guide/agent-repository-checkout). Thêm `"push": true` để agent push lên kho đó qua git proxy của TOSE, và `push_branches`: `all` (mặc định: mọi nhánh, kể cả nhánh mặc định) hoặc `agent` (chỉ `tose/<slug của bản cài>/...`). `push` mặc định là `false`; gửi `push_branches` mà không có `push` trả `422` tại `repository.push_branches`. Plan có push cần quyền GitHub App `contents: write` (nếu không, blocker `GITHUB_PERMISSION_MISSING`) và máy chủ có git proxy với địa chỉ https công khai (nếu không, `503 GIT_PROXY_NOT_CONFIGURED`). Xem [Cho agent push](/vi/guide/agent-repository-checkout#cho-agent-push-len-kho-ma).

- `max_hourly_cost_cents` **không bắt buộc** (bắt buộc cho tới 2026-11-09, tose-app [#571](https://github.com/saasvn/tose-app/pull/571)). Plan luôn hiển thị mức trần chi phí để phê duyệt; khi bạn đặt giới hạn, plan có mức trần cao hơn sẽ bị chặn với `COST_CEILING_EXCEEDED`. Dashboard không hỏi trường này. Ví trống chặn plan với `INSUFFICIENT_BALANCE`.
- `network_mode` là `approved` (mặc định, **Hạn chế** trên dashboard) hoặc `internet`. Từ chính sách `2026-11-11.1`, `approved` truy cập nhà cung cấp cùng các máy chủ GitHub, npm, PyPI và Go theo chính sách đã rà soát của máy chủ. `development` vẫn được nhận cho các kế hoạch trước đây và truy cập cùng các máy chủ đó. Danh sách mô tả chính sách trong một object `development` kèm máy chủ của từng bộ công cụ và `in_approved`; khi `in_approved` là `true`, client không đưa `development` thành lựa chọn riêng. Xem [Chế độ mạng](/vi/guide/agent-network-modes).
- Khóa nhà cung cấp trong `variables` trả `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`; phản hồi không lặp lại khóa và khóa không bao giờ được lưu trong plan.
- Trường lạ như lệnh khởi động, hook hay `privileged` trả `400`.
- Plan có thêm mục `curated` được băm: bản phát hành, nhà cung cấp, `auth: byok`, chế độ mạng cùng các đích, kiểu thiết lập, `storage` (`workspace_disk_gib`, không có với mẫu có volume dung lượng cố định), `human_control` (ai được thao tác và các route dừng, gỡ khóa, xóa) và, khi có kho mã, `repository`. Khi có push, `curated.repository` có thêm `push: true`, `push_branches`, `push_branch_pattern` (`*` hoặc `tose/<slug của bản cài>/*`) và `push_remote` (URL của git proxy, không kèm credential); `access` vẫn là `contents:read`, quyền của token clone. Agent không giữ thông tin xác thực API TOSE nào cho workspace và không giữ token GitHub; khi có push, nó chỉ giữ bí mật git proxy của checkout ([bên dưới](#git-proxy)).
- Phê duyệt plan có blocker trả `PLAN_BLOCKED` (`409`, hoặc `402` khi ví trống) và không tạo gì; ứng dụng MCP đã kết nối nhận `403 APPROVAL_REQUIRES_PERSON`.
- Plan tuyển chọn ánh xạ bản phát hành tới một version registry đã xuất bản (`template.version_id`) và kiểm tra manifest đã lưu đúng bằng manifest của bản phát hành. Khi bản phát hành không cài được từ registry (chưa xuất bản, được lưu với manifest khác, hoặc nhà phát hành `tose-curated` bị đình chỉ), plan mang `CURATED_INSTALL_UNAVAILABLE`; version bị thu hồi mang `VERSION_REVOKED`.
- Đăng nhập bằng gói theo cờ máy chủ `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, được chủ sản phẩm cho phép trên production từ 2026-11-09. Ở máy chủ bật cờ này, nhà cung cấp `chatgpt` của Codex (`CODEX_PROVIDER=chatgpt`) được đưa ra và trang ứng dụng đã cài của Claude Code có nút **Kết nối Claude**. Ở máy chủ tắt cờ, `chatgpt` là `available: false` kèm lý do và plan chọn nó bị chặn với `SUBSCRIPTION_LOGIN_DISABLED`, nên hãy đọc danh sách thay vì giả định. `CODEX_PROVIDER=openai` hoặc `CLAUDE_PROVIDER=anthropic` với khóa API không bao giờ phụ thuộc cờ. Xem [Đăng nhập nhà cung cấp](/vi/guide/template-registry#provider-sign-in).
- Khi cờ bật, các route `provider-account` (mã thiết bị của Codex) và `claude-provider-account` (mã dán của Claude) dưới một installation phục vụ owner và admin đã đăng nhập của workspace; khi tắt chúng trả `404`. Route `login/code` của Claude nhận mã đăng nhập dùng một lần của Anthropic một lần và không bao giờ lưu hay trả lại. Không API nào khác nhận token, cookie, tệp đăng nhập hay mã của nhà cung cấp, nên đừng xây tích hợp thu thập chúng. Tắt cờ cần khởi động lại API, đóng cả hai đăng nhập cùng lúc và không thu hồi các phiên nhà cung cấp đã có. Hợp đồng là [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml) và [bản ghi quyết định](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md). Đăng nhập native trong terminal (`CLAUDE_PROVIDER=claude` với `/login` trong console) tách biệt với cờ.
- Cài plan đã phê duyệt là `POST /template-installations` thông thường kèm `Idempotency-Key`. Khóa nhà cung cấp chỉ nằm trong `secrets`, được lưu mã hóa và không bao giờ được trả lại. Nâng cấp tại chỗ một bản cài tuyển chọn trả `409 CURATED_UPGRADE_UNAVAILABLE`.
- Bản cài báo các checkout của agent trong `repositories` (kho cũ nhất trước, tối đa 10), mỗi phần tử có `push`, `github_api`, `push_branches` (khi có push) và `api_path` (`/api/gh/<checkout_id>`, khi có `github_api`), cùng `installation_id` và `repo_id`. `repository` vẫn còn và là phần tử đầu tiên. `POST .../repository/retry` đưa mọi checkout `failed` về `pending` (`409 REPOSITORY_READY` khi tất cả đã sẵn sàng).
- Agent đã cài có tối đa 10 kho mã, mỗi kho được clone vào thư mục riêng `/workspace/<tên>`, kho cũ nhất trước; lần clone thất bại đầu tiên dừng lần deploy. Owner hoặc admin (đăng nhập, hoặc API key có `deployments:execute`) thêm một kho, hoặc đổi push hay `github_api` cho một kho agent đã có (so khớp theo `repo_id`, nếu không thì theo `full_name`), bằng `PUT .../template-installations/{installation_id}/repository` (body giống `repository` của plan, không cần plan mới). `DELETE .../template-installations/{installation_id}/repositories/{repo_id}` gỡ một kho, và `DELETE .../repository` gỡ tất cả. Ứng dụng đã kết nối nhận `403 REPOSITORY_REQUIRES_PERSON`. Tất cả trả `{installation, restart_required, deploy_path}`; khi `restart_required` là `true`, hãy `POST` tới `deploy_path` với `{"mode":"image"}` để áp dụng. Tệp trong `/workspace` được giữ nguyên. Các lần từ chối gồm `409 REPOSITORY_LIMIT` (10 kho), `409 REPOSITORY_FOLDER_TAKEN` (hai kho cùng tên) và `409 REPOSITORY_ALREADY_CLONED` (nhánh khác của kho đã clone). Push được đặt riêng cho từng kho; agent giữ một bí mật git cho mọi kho nó được push, và tắt push cho một kho hoặc gỡ một kho làm bí mật đó hết hiệu lực tới lần deploy kế tiếp. `github_api: true` (chỉ ở đây; plan từ chối với `422`) cho agent quản lý issue và pull request của kho đó qua [GitHub API proxy](#github-api-proxy); cần quyền GitHub App Issues và Pull requests: Read and write (nếu không, `409 GITHUB_PERMISSION_MISSING`), và dùng chung bí mật đó. Xem [Gắn hoặc đổi kho mã của agent sau khi cài](/vi/guide/agent-repository-checkout#gan-hoac-doi-kho-ma-sau-khi-cai).
- Giao tác vụ (`task_delegation` trong bản cài) bắt đầu là `true` với bản cài mới của bản phát hành có trình chạy tác vụ, và `false` với bản cài cũ hoặc bản phát hành không có. Chỉ owner hoặc admin đã đăng nhập đổi được, bằng `PUT .../template-installations/{installation_id}/task-delegation` với `{"enabled": false}` hoặc `true`. Xem [Giao tác vụ](/vi/guide/agent-tasks#bat-tinh-nang).

### Git proxy

Agent được push chỉ tới GitHub qua các route này. Chúng không phải route của workspace: không nhận phiên đăng nhập, API key hay ứng dụng đã kết nối, chỉ nhận git của chính agent với bí mật checkout của nó (HTTP Basic, user `x-tose`, mật khẩu `TOSE_GIT_TOKEN`). `checkout_id` là template id, hoặc với checkout tạo từ tose-app [#741](https://github.com/saasvn/tose-app/pull/741) trở đi là `<template id>r<repository id>`; proxy từ chối id của kho khác, nên bản clone mà kho cũ để lại trong `/workspace` không chạm được tới kho hiện tại.

| Route | Tác dụng |
|-------|----------|
| `GET /api/git/{checkout_id}/info/refs?service=git-upload-pack` hoặc `git-receive-pack` | Quảng bá ref. |
| `POST /api/git/{checkout_id}/git-upload-pack` | Fetch, chuyển tiếp với token `contents:read` cho đúng kho đó. Body tối đa 64 MiB. |
| `POST /api/git/{checkout_id}/git-receive-pack` | Push, chuyển tiếp với token `contents:write` cho đúng kho đó. Tối đa 1 GiB, kể cả sau khi giải nén gzip. Ghi nhật ký là `template_installation.git_push`. |

Thiếu hoặc sai bí mật trả `401`, yêu cầu ngoài giao thức smart của git trả `403 GIT_REQUEST_INVALID` (`400` với lệnh push sai định dạng), quá lớn trả `413 GIT_REQUEST_TOO_LARGE`, quá nhiều (hơn 4 yêu cầu cùng lúc hoặc 60 mỗi phút cho một checkout) trả `429 GIT_RATE_LIMITED` kèm `Retry-After`, và máy chủ chưa có địa chỉ proxy công khai trả `503 GIT_PROXY_NOT_CONFIGURED`. Các lần từ chối khác tới git dưới dạng `remote error` kèm mã; xem [Khi git từ chối](/vi/guide/agent-repository-checkout#khi-git-tu-choi).

### GitHub API proxy

Agent được quản lý issue và pull request của một kho chỉ gọi GitHub REST API cho kho đó qua route này (tose-app [#753](https://github.com/saasvn/tose-app/pull/753)). Giống git proxy, đây không phải route của workspace: chỉ nhận bí mật của chính agent, dạng `Authorization: Bearer $TOSE_GIT_TOKEN`. Pod liệt kê URL của từng kho như vậy trong `TOSE_GITHUB_API` (`owner/name=https://<API host>/api/gh/<checkout_id>`, cách nhau bằng dấu cách).

| Route | Tác dụng |
|-------|----------|
| `GET`, `POST`, `PATCH`, `PUT`, `DELETE /api/gh/{checkout_id}/{path}` | Chuyển `/repos/<owner>/<name>/{path}` tới GitHub với token ngắn hạn cho đúng kho đó (`issues: write`, `pull_requests: write`, `metadata: read`), khi `{path}` là route của issue, bình luận, nhãn, người được gán, sự kiện, milestone, pull request, review hoặc người được mời review. Body JSON tối đa 1 MiB. Thao tác ghi và yêu cầu bị từ chối được ghi nhật ký là `template_installation.github_api`. |

Merge, nội dung kho, cài đặt, hook, Actions và mọi đường dẫn khác trả `403 GITHUB_API_ENDPOINT_NOT_ALLOWED`; kho đang tắt tính năng trả `403 GITHUB_API_DISABLED`. Thiếu hoặc sai bí mật trả `401 GIT_TOKEN_INVALID`, và giới hạn giống git proxy (`429 GIT_RATE_LIMITED`). Danh sách đầy đủ yêu cầu được phép và các lần từ chối nằm ở [Cho agent quản lý issue và pull request](/vi/guide/agent-repository-checkout#cho-agent-quan-ly-issue-va-pull-request).

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
