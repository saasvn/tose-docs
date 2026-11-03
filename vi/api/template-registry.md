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

## Chưa có

Các endpoint này chưa có idempotency key, plan, `next_actions` hay thời hạn plan, vì chúng chỉ quản lý bản nháp. Những phần đó sẽ được tài liệu hóa khi planner và luồng deploy ra mắt. Xem [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) để biết contract hiện hành.

## Xem thêm

- [Manifest `tose.yaml` và tình trạng](/vi/guide/template-registry)
- [API template](/vi/api/templates) cho catalog 1-click và deployment
- [Lỗi](/vi/api/errors)
