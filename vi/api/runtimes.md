# API Runtimes

Các endpoint REST cho runtime: các docker host mà instance [Cloud Harness](/vi/guide/cloud-harness)
dùng để chạy job Docker. Mỗi instance có đúng một runtime, được tạo cùng với instance. Mọi path đều
tính từ workspace:

```
https://api-v2.tose.sh/api/workspaces/{workspace_slug}
```

Xác thực mọi request bằng API key trong header `X-API-Key`
(xem [Xác thực](/vi/api/authentication)).

## Endpoints {#endpoints}

| Method | Path | Vai trò | Scope của API key | Phản hồi |
|--------|------|---------|-------------------|----------|
| `GET` | `/runtimes` | member | `runtimes:read` | `200` `{runtimes: [...]}` |
| `POST` | `/runtimes` | admin | `runtimes:write` | `202` `{runtime, operation}` |
| `GET` | `/runtimes/{runtime_id}` | member | `runtimes:read` | `200` runtime |
| `DELETE` | `/runtimes/{runtime_id}?confirm={name}` | admin | `runtimes:write` | `202` `{runtime, operation}` |
| `POST` | `/runtimes/{runtime_id}/wake` | member | `runtimes:write` | `202` `{runtime, operation}`, hoặc `200` nếu đã sẵn sàng |
| `POST` | `/runtimes/{runtime_id}/suspend` | member | `runtimes:write` | `202` `{runtime, operation}`, hoặc `200` nếu đã nghỉ |
| `POST` | `/runtimes/{runtime_id}/activity` | member | `runtimes:write` | `204` |
| `GET` | `/runtimes/{runtime_id}/operations` | member | `runtimes:read` | `200` `{operations: [...]}` |
| `GET` | `/runtimes/{runtime_id}/operations/{operation_id}` | member | `runtimes:read` | `200` operation |

**Vai trò** là vai trò thấp nhất trong workspace được gọi endpoint; owner gọi được tất cả. API key
hoạt động với vai trò của người sở hữu key và còn cần scope tương ứng. `runtimes:write` bao gồm cả
`runtimes:read`.

### Key gắn với runtime {#runtime-bound-keys}

Mỗi instance Cloud Harness có một API key riêng do TOSE cấp và quản lý; instance dùng key này để
đánh thức docker host và báo hoạt động. Key xuất hiện trong danh sách API key của workspace với
trường `runtime_id` được đặt, và bạn không thể tự tạo loại key này. Key chỉ đọc và vận hành được
runtime của chính nó: lấy thông tin, đánh thức, tạm dừng, báo hoạt động và đọc các operation. Mọi
lời gọi khác, kể cả liệt kê, tạo và xóa runtime, đều trả về `403`.

Các ví dụ dưới đây giả định:

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=ws_your_api_key
export WS=my-workspace
export RUNTIME_ID=<runtime-id>
```

## Đối tượng {#objects}

### Runtime {#runtime}

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | string | Id của runtime |
| `workspace_id` | string | Workspace sở hữu |
| `server_id` | string | Server mà runtime chạy trên đó |
| `template_id` | string | Instance (template) Cloud Harness sở hữu runtime |
| `kind` | string | Luôn là `docker-host` |
| `name` | string | Tên runtime; cần dùng để xác nhận khi xóa |
| `status` | string | `cold`, `waking`, `ready`, `suspending`, `suspend_failed`, `error`, `deleting` |
| `desired_state` | string | Trạng thái nền tảng đang hướng tới: `cold`, `ready` hoặc `deleted` |
| `cpu` | string | CPU được cấp, tính bằng millicore (`"2000m"`) |
| `ram` | string | RAM được cấp, tính bằng MiB (`"4096Mi"`) |
| `disk_size_gi` | number | Dung lượng ổ đĩa, tính bằng GiB |
| `storage_class` | string | Storage class của ổ đĩa |
| `image` | string | Image của docker host |
| `runtime_class` | string | Runtime class sandbox của pod |
| `idle_suspend_minutes` | number | Số phút rảnh trước khi tự động tạm dừng |
| `last_activity_at` | string | Hoạt động được ghi nhận gần nhất (ISO 8601), hoặc `null` |
| `last_error` | string | Thông báo lỗi gần nhất, nếu có |
| `current_operation_id` | string | Operation đang chạy, hoặc `null` |
| `created_by` | string | Người dùng đã tạo runtime |
| `compute_cents_per_hour` | number | Giá tính toán theo cent mỗi giờ khi ở trạng thái `ready`, theo mức giá compute tiêu chuẩn |
| `created_at`, `updated_at` | string | Mốc thời gian (ISO 8601) |

### Operation {#operation}

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | string | Id của operation |
| `runtime_id` | string | Id của runtime |
| `workspace_id` | string | Id của workspace |
| `action` | string | `create`, `wake`, `suspend`, `delete` |
| `status` | string | `pending`, `running`, `succeeded`, `failed` |
| `error` | string | Lý do thất bại khi `failed` |
| `actor_type` | string | Ai khởi tạo: `user`, `api_key` hoặc `system` |
| `actor_id` | string | Id của người dùng hoặc API key; với `system` là lý do |
| `duration_ms` | number | Thời lượng sau khi kết thúc |
| `started_at`, `finished_at` | string | Mốc thời gian (ISO 8601) |
| `created_at`, `updated_at` | string | Mốc thời gian (ISO 8601) |

Mỗi runtime chỉ chạy một operation tại một thời điểm. Gửi lại đúng yêu cầu đang chạy sẽ trả về chính
operation đó thay vì tạo operation mới, nên việc thử lại là an toàn. Tạm dừng sẽ thay thế một lần
đánh thức đang chạy, và xóa sẽ thay thế mọi operation; mọi yêu cầu khác trong lúc có operation đang
chạy đều trả về `409`.

## Liệt kê và lấy thông tin {#list-and-get}

```bash
curl "$TOSE_API/api/workspaces/$WS/runtimes" -H "X-API-Key: $TOSE_API_KEY"
curl "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID" -H "X-API-Key: $TOSE_API_KEY"
```

Danh sách được sắp xếp mới nhất trước. Để tìm runtime của một instance, so khớp `template_id` với id
của instance.

## Đánh thức và tạm dừng {#wake-and-suspend}

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/wake" -H "X-API-Key: $TOSE_API_KEY"
curl -X POST "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/suspend" -H "X-API-Key: $TOSE_API_KEY"
```

Cả hai trả về `202` kèm `{runtime, operation}`. Khi runtime đã ở trạng thái được yêu cầu, chúng trả
về `200` với `operation: null`.

- **Đánh thức** khởi động runtime trên ổ đĩa hiện có. Cần số dư ví lớn hơn 0 (nếu không sẽ trả về
  `402`), và trả về `503` khi TOSE đang tắt chức năng đánh thức.
- **Tạm dừng** dừng tài nguyên tính toán và giữ ổ đĩa. Các container đang chạy trên đó sẽ dừng.

Bạn hiếm khi cần gọi hai endpoint này: instance tự đánh thức runtime khi một job cần Docker, và
runtime tự tạm dừng sau `idle_suspend_minutes` phút không có hoạt động. Phí tính toán được tính theo
giây, từ khi xác nhận `ready` tới khi xác nhận đã dừng; xem [Bảng giá](/vi/guide/pricing#cloud-harness).

### Báo hoạt động {#report-activity}

`POST /runtimes/{runtime_id}/activity` ghi nhận runtime đang được dùng, giúp hoãn việc tự động tạm
dừng khi rảnh. Endpoint trả về `204`.

### Theo dõi operation {#poll-an-operation}

```bash
curl "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/operations/$OPERATION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

Gọi lặp lại cho tới khi `status` là `succeeded` hoặc `failed`. `GET /runtimes/{runtime_id}/operations`
liệt kê các operation gần nhất, mới nhất trước; `?limit=` nhận giá trị từ 1 đến 500, mặc định 100.

## Tạo {#create}

`POST /runtimes` (admin)

Tạo một instance Cloud Harness sẽ tạo luôn runtime của nó, nên thông thường bạn không cần gọi
endpoint này.

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `template_id` | string | có | Template cần gắn; phải thuộc workspace và chưa có runtime |
| `kind` | string | không | `docker-host`, loại duy nhất |
| `name` | string | không | 1 đến 63 ký tự gồm chữ thường, chữ số hoặc dấu gạch nối; mặc định `dh-<template_id>` |
| `cpu` | string | không | Số core (`"2"`) hoặc millicore (`"500m"`), từ 500m đến 16; mặc định theo kích thước docker host của nền tảng |
| `ram` | string | không | Số không có đơn vị nghĩa là GiB (`"4"`), hoặc một lượng như `"4Gi"`, từ 1Gi đến 64Gi; mặc định theo kích thước docker host của nền tảng |
| `disk_size_gi` | number | không | Dung lượng ổ đĩa (GiB); mặc định theo ổ đĩa docker host của nền tảng |
| `storage_class` | string | không | Storage class cho ổ đĩa |
| `idle_suspend_minutes` | number | không | 1 đến 1440; mặc định theo thiết lập của nền tảng |

Runtime được tạo ở trạng thái `cold`: không có gì chạy và không tính phí tính toán cho tới khi nó
thức dậy. Yêu cầu thất bại với `402` khi số dư ví không lớn hơn 0, và với `409` khi template đã có
runtime hoặc workspace đã đạt giới hạn. Giới hạn runtime bằng
[giới hạn số instance Cloud Harness](/vi/guide/cloud-harness#instance-limit), vì mỗi instance có
một runtime.

## Xóa {#delete}

`DELETE /runtimes/{runtime_id}?confirm={name}` (admin). Tham số `confirm` phải bằng tên runtime;
request thiếu tham số này trả về `400`. Việc xóa sẽ xóa vĩnh viễn ổ đĩa của runtime.

Pod của instance gắn cùng ổ đĩa đó, nên hãy dừng instance trước; khi instance còn chạy, lệnh xóa
trả về `409`. Instance không có runtime thì không có docker host và không ai đăng nhập được, nên để
gỡ bỏ một instance, hãy [xóa instance](/vi/guide/cloud-harness#delete-an-instance): thao tác đó xóa
luôn runtime của nó.

```bash
curl -X DELETE "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID?confirm=dh-<template-id>" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Lỗi {#errors}

Lỗi trả về một body JSON có thông báo trong trường `error`.

| Mã | Khi nào |
|----|---------|
| `400` | Body hoặc tham số không hợp lệ, hoặc lệnh xóa không có `confirm` đúng |
| `402` | Số dư ví không lớn hơn 0 (tạo, đánh thức) |
| `403` | Vai trò của bạn hoặc scope của API key không đủ, hoặc key gắn với runtime gọi route khác |
| `404` | Không tìm thấy workspace, runtime hoặc operation, hoặc bạn không phải thành viên |
| `409` | Có operation khác đang chạy, runtime đang bị xóa, đã đạt giới hạn, hoặc instance vẫn đang chạy (khi xóa) |
| `502` | TOSE không kiểm tra được instance còn chạy hay không (khi xóa); hãy thử lại |
| `503` | Chức năng đánh thức đang tắt, hoặc bản cài đặt này chưa cấu hình docker host |
