# API template

Các endpoint cho [template 1-click](/vi/commands/template): xem catalog, tạo template, đổi image, biến môi trường và domain, deploy hoặc dừng, đọc lịch sử deployment và log.

Endpoint của template nằm dưới `/api/workspaces/{slug}/templates` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Mọi thành viên workspace đều đọc được. Thay đổi template hoặc deploy cần vai trò `owner` hoặc `admin` của workspace.

[Spec OpenAPI](https://api.tose.sh/api/openapi.yaml) là nguồn chuẩn cho từng trường. Trang này giải thích hành vi xung quanh.

## Template chọn image như thế nào

Một template lưu tối đa một **custom image**. Deploy bằng image chạy đúng image đã lưu đó và không bao giờ tự thay bằng image mặc định của catalog.

| `image_source` | Ý nghĩa |
|----------------|---------|
| `custom` | Image do bạn đặt bằng `PUT` (`custom_image`). Không bao giờ bị thay ngầm. Mọi template có từ trước hành vi này đều được coi là `custom`. Template tạo từ catalog bắt đầu với `catalog` và lưu sẵn image của catalog. |
| `catalog` | Image mặc định của catalog, chọn tường minh bằng `image_source=catalog`. |
| `rollback` | Image của một deployment trước đó, chọn tường minh bằng `rollback_to`. |

Khi template chưa lưu image nào, deploy bằng image chạy image mặc định của catalog và ghi nguồn là `catalog`. Lần deploy image đã lưu được ghi trên deployment là `custom`, kể cả khi bản thân template vẫn đang đánh dấu `catalog`.

## Catalog và tạo template {#catalog}

### Liệt kê catalog

```http
GET /api/workspaces/available-templates
```

Mọi người dùng đã xác thực đều đọc được. `available-templates` là route cố định, không phải slug workspace. Các mục có `name`, `key`, `description`, `source`, `branch`, `default_port`, `default_cpu`, `default_ram`, `default_image`, `required_envs` và `unlock_fee_vnd`. Một số mục khác: mục Cloud Harness không có `default_image` và thêm `release`, `max_instances`, `pricing`. Hãy đọc danh sách trường của từng mục từ phản hồi hoặc spec OpenAPI. Dùng `key` làm `template_name` khi tạo template.

### Tạo template

```http
POST /api/workspaces/{slug}/templates
```

```json
{ "name": "My agent", "template_name": "goclaw", "cpu": "1", "ram": "2" }
```

Tạo template ở trạng thái `pending`; chưa có gì chạy cho tới khi bạn [deploy](#deploy-template). Slug lấy từ `name`, thêm hậu tố ngẫu nhiên nếu bị trùng. Template có `unlock_fee_vnd` lớn hơn 0 bị khóa: workspace phải trả phí mở khóa một lần trước, nếu chưa thì lệnh trả `402` kèm thông tin mở khóa. Template bị khóa chỉ nhận `cpu` `1` hoặc `2` và `ram` `2` hoặc `4`; giá trị khác trả `400`. Template khác cần ví có số dư dương, nếu không lệnh trả `402`, và `cpu`, `ram` là số nguyên, nếu không trả `400`.

### Trạng thái mở khóa

```http
GET /api/workspaces/{slug}/templates/unlock-status
```

Một object theo key template, mỗi template bị khóa một mục: `unlocked`, `unlock_fee_vnd`, `unlock_credit_usd_cents`, `exchange_rate_vnd_per_usd`, `unlock_url` và `payment_purpose`. Khoản phí vẫn dùng được như credit trong ví. Xem [Bảng giá](/vi/guide/pricing).

### Liệt kê template

```http
GET /api/workspaces/{slug}/templates
```

Mảng template thuần, mới nhất trước, không phân trang. Chi tiết deployment lấy từ [Đọc template](#get-template).

## Vòng đời {#lifecycle}

### Dừng

```http
POST /api/workspaces/{slug}/templates/{template_slug}/stop
```

Đưa workload về 0 replica và đặt trạng thái `stopped`. Trả `400` khi template chưa được gán server.

### Xóa

```http
DELETE /api/workspaces/{slug}/templates/{template_slug}
```

::: danger Không thể hoàn tác
Xóa template sẽ xóa ổ đĩa bền vững cùng toàn bộ dữ liệu, workload Kubernetes, ingress, bản ghi DNS, biến môi trường, domain và lịch sử deployment.
:::

Nếu không xóa được ổ đĩa, lệnh trả `502` và giữ nguyên template, nên bạn có thể thử lại. Xóa template Cloud Harness thì trả `202` với `status: "deleting"` và hoàn tất ở nền, hoặc `503` khi Cloud Harness đang tắt.

## Biến môi trường {#environment-variables}

```http
GET    /api/workspaces/{slug}/templates/{template_slug}/envs
POST   /api/workspaces/{slug}/templates/{template_slug}/envs
DELETE /api/workspaces/{slug}/templates/{template_slug}/envs/{key}
GET    /api/workspaces/{slug}/templates/{template_slug}/envs/{key}/reveal
```

- **Liệt kê:** mọi thành viên. Thành viên dưới `admin` thấy mọi giá trị là `***`. Admin hoặc owner thấy giá trị thật, trừ biến đánh dấu `is_secret` luôn là `***`.
- **Đặt:** `owner` hoặc `admin`. Body là mảng thuần các `{ "key", "value", "is_secret" }`. Mỗi mục được upsert theo `key`, mục có `key` rỗng bị bỏ qua, giá trị được lưu đã mã hóa. Thay đổi có hiệu lực ở lần deploy tiếp theo.
- **Xóa:** `owner` hoặc `admin`. Xóa một key không tồn tại vẫn trả `200`. Với template yêu cầu gateway token, xóa `GOCLAW_GATEWAY_TOKEN` trả `409` kèm `GATEWAY_TOKEN_REQUIRED`.
- **Reveal:** chỉ `owner` hoặc `admin`. Trả `{ "value": "..." }`, giá trị đã giải mã của một biến, kể cả secret. Đây là lệnh duy nhất trả giá trị secret, và chính sách truy cập xếp nó vào rủi ro cao (`env.reveal`). Không ghi log hay cache phản hồi.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/templates/demo/envs/API_KEY/reveal" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Domain {#domains}

```http
GET    /api/workspaces/{slug}/templates/{template_slug}/domains
POST   /api/workspaces/{slug}/templates/{template_slug}/domains
DELETE /api/workspaces/{slug}/templates/{template_slug}/domains/{domain_id}
```

Thêm nhận `{ "domain": "app.example.com" }` và lưu dạng chữ thường (`201`). Subdomain của nền tảng hoạt động ngay khi DNS nền tảng đã được cấu hình. Với domain riêng, trỏ bản ghi A tới `target_ip`. Nền tảng không kiểm tra bước này, nên `dns_status` của domain riêng luôn là `pending`. Domain đang dùng bởi template khác trả `409`, và thêm lại domain đã gỡ của chính template này sẽ khôi phục nó. Domain mặc định không gỡ được (`400`).

## Log {#logs}

```http
GET /api/workspaces/{slug}/templates/{template_slug}/deployments/{id}/logs
GET /api/workspaces/{slug}/templates/{template_slug}/live-logs
```

Cả hai là WebSocket, cùng quy tắc xác thực và origin với stream log của dự án. Frame từ client bị bỏ qua, server chỉ gửi text frame. Lỗi phát hiện trước khi nâng cấp kết nối (template hoặc deployment không tồn tại, thiếu quyền thành viên) là phản hồi lỗi JSON bình thường.

- **Log build** (`deployments/{id}/logs`): mỗi frame một dòng log build. Với deployment đã kết thúc (`running`, `failed` hoặc `stopped`), log đã lưu được phát lại rồi gửi `[END]` và đóng kết nối. Nếu chưa, dòng mới được đẩy khi build chạy và `[END]` đóng kết nối. `[END]` là frame điều khiển duy nhất, nên hãy đọc trạng thái cuối từ `GET .../deployments/{id}`.
- **Log runtime** (`live-logs`): theo dõi stdout và stderr của pod, bắt đầu từ 200 dòng cuối. Template phải ở trạng thái `running` (nếu không trả `400`). Mỗi frame là một khối thô tối đa 4096 byte, không căn theo dòng. Stream kết thúc bằng `[END]`. Nếu không mở được stream log, server gửi một frame bắt đầu bằng `[ERROR] ` rồi đóng mà không có `[END]`; lỗi đọc giữa chừng gửi `[ERROR] ` rồi `[END]`. Hãy xử lý cả hai.

## Đọc template {#get-template}

```http
GET /api/workspaces/{slug}/templates/{template_slug}
```

**Phản hồi:**

```jsonc
{
  "template": { /* template */ },
  "last_deployment": { /* Deployment */ },
  "image": {
    "deployed": "registry.example.com/app:1.4.0",
    "configured": "registry.example.com/app:1.4.0",
    "source": "custom",
    "available": "registry.example.com/app:1.5.0",
    "update_available": true,
    "rollback_warning": "Rolling back the image does not roll back the database schema or data. ..."
  }
}
```

### Khối image

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `deployed` | string | Image của deployment gần nhất |
| `configured` | string | Custom image đã lưu mà deploy bằng image sẽ chạy. Rỗng nếu chưa đặt |
| `source` | string | `custom`, `catalog` hoặc `rollback` |
| `available` | string | Image mặc định của catalog. Rỗng nếu template không có phiên bản catalog |
| `update_available` | boolean | Image catalog khác image đang cấu hình. Là `false` khi chưa lưu image nào (`configured` rỗng), như template chế độ build hoặc Cloud Harness, vì không có image để nâng cấp |
| `rollback_warning` | string | Lưu ý khi rollback; hãy hiển thị cạnh mọi thao tác rollback |

## Cập nhật template {#update-template}

```http
PUT /api/workspaces/{slug}/templates/{template_slug}
```

Chỉ gửi các trường muốn đổi: `name`, `port`, `cpu`, `ram`, `replicas` và `custom_image`. Template chạy một replica, nên `replicas` lớn hơn `1` bị từ chối. Đặt `custom_image` khác sẽ ghi `image_source=custom`. Gửi `""` để xóa.

Image tùy chỉnh phải pull được công khai. Nền tảng không gắn thông tin đăng nhập registry cho image không thuộc sở hữu của template, nên image private sẽ pull thất bại. Image private ở registry khác chưa được hỗ trợ.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `400` | Tham chiếu image sai định dạng, body không hợp lệ, `cpu` hoặc `ram` không phải kích thước hợp lệ cho template, hoặc `replicas` lớn hơn `1` |
| `409` | Đổi `custom_image` khi đang có build hoặc deploy bằng image. Hãy đổi image sau khi nó kết thúc. Các trường khác vẫn đổi được. Cũng trả về khi template đang bị xóa |

Tham chiếu hợp lệ có dạng `[host[:port]/]repository[:tag][@algorithm:hex]`, không có khoảng trắng và dài tối đa 512 ký tự. Tag hoặc digest sai định dạng bị từ chối. Tham chiếu đúng định dạng nhưng registry không có image đó sẽ lỗi muộn hơn, khi deploy kéo image.

## Deploy template {#deploy-template}

```http
POST /api/workspaces/{slug}/templates/{template_slug}/deploy
```

**Body (mọi trường đều tùy chọn):**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `mode` | string | `build` (mặc định) hoặc `image`. Các trường bên dưới chỉ áp dụng cho `image` |
| `image_source` | string | `custom` (mặc định) chạy image đã lưu. `catalog` nâng cấp lên image mặc định của catalog và lưu lại. Bị từ chối với `400` khi template không có phiên bản catalog |
| `rollback_to` | string | ID của một deployment trước đó của template này đã chạy. Image của nó được deploy lại và trở thành image đã lưu, nên các lần deploy bằng image sau đó tiếp tục chạy nó |
| `expected_image` | string | Image bạn thấy lần cuối ở `image.configured`. Nếu image đã lưu khác, deploy bị từ chối với `409`. Giá trị rỗng tắt việc kiểm tra |

`image_source` phải là `custom` hoặc `catalog`. Khi có `rollback_to`, nó được ưu tiên và `image_source` không được kiểm tra. Mọi `mode` khác `image` đều chạy build, và các trường về image bị bỏ qua.

::: warning Template Cloud Harness
Pod Cloud Harness được dựng từ release manifest. Không có image để chạy và cũng không có image để rollback, nên `rollback_to`, `image_source` và `expected_image` bị từ chối với `400` trên các template này, bất kể `mode`. Trước đây các trường này bị bỏ qua âm thầm. Hãy gửi body rỗng (hoặc chỉ `mode`).
:::

```bash
# Chạy image đã lưu (mặc định)
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image"}'

# Nâng cấp tường minh, và từ chối nếu image đã bị đổi từ lần bạn xem
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image","image_source":"catalog","expected_image":"registry.example.com/app:1.4.0"}'

# Rollback về một deployment trước đó
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image","rollback_to":"<deployment id>"}'
```

**Phản hồi:** `201 Created` kèm [Deployment](#deployment) và, khi có điều cần báo, một mảng `warnings`.

```jsonc
{
  "id": "…",
  "status": "pending",
  "docker_image": "registry.example.com/app:1.4.0",
  "image_source": "custom",
  "previous_image": "registry.example.com/app:1.4.0",
  "config_fingerprint": "sha256:…",
  "warnings": [
    "A different catalog version is available. This deploy kept your custom image; send image_source=catalog to upgrade explicitly."
  ]
}
```

Nội dung `warnings` do API trả về bằng tiếng Anh.

### Cảnh báo {#warnings}

| Khi nào | Cảnh báo |
|---------|----------|
| Image đã lưu khác phiên bản catalog | Lần deploy giữ nguyên custom image của bạn. Gửi `image_source=catalog` để nâng cấp |
| Dùng `rollback_to` | Rollback image **không** rollback schema hay dữ liệu của database. Nếu phiên bản mới đã migrate chúng, image cũ có thể lỗi hoặc đọc sai. hãy khôi phục bản sao lưu trước nếu đúng như vậy |

### Rollback {#rollback}

`rollback_to` chỉ nhận deployment của cùng template đã thực sự chạy: trạng thái `running` hoặc `stopped`, có thời điểm kết thúc và có ghi image. Build lỗi không được nhận, vì tag nó ghi chưa từng được push. ID khác trả `404`.

Image được khôi phục, nhưng dữ liệu thì không. Hãy sao lưu database và ổ đĩa của template trước khi rollback qua một phiên bản đã đổi schema. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks).

### Lỗi {#errors}

| Trạng thái | Ý nghĩa |
|------------|---------|
| `400` | Tham chiếu image sai định dạng, `image_source` không phải `custom` hoặc `catalog`, không có image để deploy (không có custom image và không có phiên bản catalog), template chưa được cấu hình server cluster, Cloud Harness chưa bật, hoặc template là Cloud Harness mà body có `rollback_to`, `image_source` hoặc `expected_image` (`rollback_to, image_source and expected_image are not supported for Cloud Harness templates`) |
| `404` | `rollback_to` không trỏ tới deployment nào của template này đã chạy |
| `409` | Đang có build hoặc deploy bằng image khác của template này, hoặc `expected_image` không khớp image đã lưu, image bị đổi trong lúc yêu cầu bắt đầu, hoặc template đang bị xóa |

`409` không thay đổi gì. Hãy đọc lại template, kiểm tra khối `image` rồi thử lại. `409` cũng áp dụng cho hai lần gửi lại đồng thời: chỉ một trong hai bắt đầu deploy. Claim đang xử lý quá 90 phút thì không còn chặn deploy mới.

## Deployment {#deployments}

```http
GET /api/workspaces/{slug}/templates/{template_slug}/deployments
GET /api/workspaces/{slug}/templates/{template_slug}/deployments/{id}
```

### Deployment {#deployment}

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | string | ID deployment. Dùng làm `rollback_to` |
| `status` | string | `pending`, `building`, `deploying`, `running`, `failed` hoặc `stopped` |
| `docker_image` | string | Image mà deployment này đã chạy |
| `image_source` | string | `catalog`, `custom` hoặc `rollback` |
| `image_digest` | string | Digest `algorithm:hex` (thường là `sha256:…`) khi tham chiếu được ghim theo digest. Bỏ qua với tham chiếu chỉ có tag |
| `previous_image` | string | Image template đã lưu trước deployment này |
| `config_fingerprint` | string | Hash `sha256:…` của image, cổng, CPU, RAM và số replica mà deployment đã áp dụng. Hai deployment cùng fingerprint đã chạy cùng một cấu hình |
| `trigger_type` | string | `manual`, hoặc `image_only` với deploy bằng image |
| `triggered_by` | string \| null | ID người dùng đã yêu cầu |
| `error_message` | string \| null | Lý do deployment lỗi, nếu có |
| `created_at` / `updated_at` | string (RFC 3339) | Mốc thời gian |

Bốn trường biên nhận này chỉ được ghi với deploy bằng image; deploy kiểu build bỏ qua chúng. `image_source`, `image_digest`, `previous_image`, `config_fingerprint` và `triggered_by` hợp lại là biên nhận deploy: cái gì đã chạy, nó thay thế cái gì và ai yêu cầu.

Tag có thể bị đổi trỏ. Để biết chính xác bản build nào đã chạy, hãy ghim custom image theo digest (`repository:tag@sha256:…`) để `image_digest` được ghi lại.
