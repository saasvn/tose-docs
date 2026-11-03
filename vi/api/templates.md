# API template

Các endpoint cho [template 1-click](/vi/commands/template): đọc template, đổi image, deploy và đọc lịch sử deployment.

Endpoint của template nằm dưới `/api/workspaces/{slug}/templates` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Mọi thành viên workspace đều đọc được. Thay đổi template hoặc deploy cần quyền admin của workspace.

## Template chọn image như thế nào

Một template lưu tối đa một **custom image**. Deploy bằng image chạy đúng image đã lưu đó và không bao giờ tự thay bằng image mặc định của catalog.

| `image_source` | Ý nghĩa |
|----------------|---------|
| `custom` | Image do bạn đặt bằng `PUT` (`custom_image`). Không bao giờ bị thay ngầm. Mọi template có từ trước hành vi này đều được coi là `custom`. Template tạo từ catalog bắt đầu với `catalog` và lưu sẵn image của catalog. |
| `catalog` | Image mặc định của catalog, chọn tường minh bằng `image_source=catalog`. |
| `rollback` | Image của một deployment trước đó, chọn tường minh bằng `rollback_to`. |

Khi template chưa lưu image nào, deploy bằng image chạy image mặc định của catalog và ghi nguồn là `catalog`. Lần deploy image đã lưu được ghi trên deployment là `custom`, kể cả khi bản thân template vẫn đang đánh dấu `catalog`.

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
| `update_available` | boolean | Image catalog khác image đang cấu hình |
| `rollback_warning` | string | Lưu ý khi rollback; hãy hiển thị cạnh mọi thao tác rollback |

## Cập nhật template {#update-template}

```http
PUT /api/workspaces/{slug}/templates/{template_slug}
```

Chỉ gửi các trường muốn đổi: `name`, `port`, `cpu`, `ram`, `replicas` và `custom_image`. Template chạy một replica, nên `replicas` lớn hơn `1` bị từ chối. Đặt `custom_image` khác sẽ ghi `image_source=custom`. Gửi `""` để xóa.

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
| `400` | Tham chiếu image sai định dạng, `image_source` không phải `custom` hoặc `catalog`, không có image để deploy (không có custom image và không có phiên bản catalog), template chưa được cấu hình server cluster, hoặc Cloud Harness chưa bật |
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
