# API ổ đĩa, volume & bảng giá

Các endpoint cho [ổ đĩa bền vững](/vi/guide/persistent-disks), volume của workspace và [bảng giá](/vi/guide/pricing).

Endpoint của workspace nằm dưới `/api/workspaces/{slug}` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Endpoint đọc dành cho mọi thành viên workspace; thao tác thay đổi cần quyền admin của workspace.

## Đối tượng {#objects}

### Volume {#volume}

Một ổ đĩa bền vững, thuộc về một dự án, template hoặc cơ sở dữ liệu được quản lý.

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `id` | string | ID volume |
| `workspace_id` | string | Workspace sở hữu |
| `workload_type` | string | `project`, `template` hoặc `database` |
| `workload_id` | string | ID của workload sở hữu |
| `workload_name` | string | Tên của workload sở hữu |
| `pvc_name` | string | Tên PVC Kubernetes |
| `namespace` | string | Namespace Kubernetes |
| `size_gib` | integer | Dung lượng đã cấp phát, tính bằng GiB (dung lượng tính phí) |
| `mount_path` | string | Đường dẫn mount trong container |
| `storage_class` | string | Storage class |
| `status` | string | `provisioning`, `bound`, `resizing`, `failed` hoặc `released` |
| `last_error` | string | Lỗi cấp phát hoặc mở rộng gần nhất, nếu có |
| `billing_starts_at` | string (RFC 3339) | Thời điểm bắt đầu tính phí lưu trữ |
| `released_at` | string \| null | Thời điểm ổ đĩa bị xóa và dừng tính phí |
| `created_at` / `updated_at` | string (RFC 3339) | Mốc thời gian |
| `monthly_cost_usd` | number | Chi phí của dung lượng hiện tại cho một tháng 730 giờ |
| `hourly_cost_usd` | number | Chi phí của dung lượng hiện tại mỗi giờ |

### StoragePricing {#storagepricing}

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `usd_per_gib_month` | number | Giá mỗi GiB mỗi tháng |
| `hours_per_month` | integer | Số giờ trong một tháng tính phí (`730`) |
| `min_size_gib` | integer | Dung lượng nhỏ nhất (`1`) |
| `max_size_gib` | integer | Dung lượng lớn nhất (`1000`) |
| `version` | string | Phiên bản bảng giá ghi vào usage |
| `enabled` | boolean | Lưu trữ hiện có đang tính phí hay không |

## Volume {#volumes}

### Liệt kê volume {#list-volumes}

Mọi ổ đĩa trong workspace (dự án, template và cơ sở dữ liệu).

```http
GET /api/workspaces/{slug}/volumes
```

**Phản hồi:**

```jsonc
{
  "volumes": [ /* Volume */ ],
  "pricing": { /* StoragePricing */ }
}
```

### Mở rộng volume {#resize-volume}

Tăng dung lượng ổ đĩa. Cần quyền admin.

```http
PATCH /api/workspaces/{slug}/volumes/{volume_id}
```

**Body:**

```json
{ "size_gib": 30 }
```

**Phản hồi:** `{ "volume": Volume }`

Chỉ được tăng dung lượng. `size_gib` nhỏ hơn sẽ trả về `400` kèm hướng dẫn di chuyển dữ liệu sang ổ đĩa mới nhỏ hơn. Tăng dung lượng khi ví hết tiền sẽ trả về `403`.

## Ổ đĩa dự án {#project-disk}

### Lấy ổ đĩa dự án {#get-project-disk}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/disk
```

**Phản hồi:**

```jsonc
{
  "disk": null,
  "pricing": { /* StoragePricing */ }
}
```

`disk` là một Volume, hoặc `null` khi dự án stateless.

### Tạo hoặc cập nhật ổ đĩa dự án {#create-or-update-project-disk}

Bật ổ đĩa cho dự án, tăng dung lượng hoặc đổi đường dẫn mount. Cần quyền admin.

```http
PUT /api/workspaces/{slug}/projects/{project_slug}/disk
```

**Body:**

```json
{ "size_gib": 10, "mount_path": "/data" }
```

**Phản hồi:**

```jsonc
{
  "disk": { /* Volume */ },
  "redeploy_required": true
}
```

Thay đổi có hiệu lực ở lần triển khai tiếp theo. Quy tắc dung lượng và đường dẫn mount xem tại [Ổ đĩa bền vững](/vi/guide/persistent-disks#size). Không thể giảm dung lượng.

### Xóa ổ đĩa dự án {#delete-project-disk}

Xóa ổ đĩa cùng **toàn bộ dữ liệu** và dừng tính phí lưu trữ. Cần quyền admin.

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}/disk?confirm={project_slug}
```

Tham số `confirm` phải trùng với slug của dự án. Trả về `409` khi dự án còn bản triển khai đang chạy; hãy dừng dự án trước.

**Phản hồi:** `{ "message": "..." }`

### Tạo dự án kèm ổ đĩa {#create-project-with-a-disk}

`POST /api/workspaces/{slug}/projects` nhận thêm đối tượng `disk` (tùy chọn):

```json
{
  "name": "my-app",
  "disk": { "size_gib": 10, "mount_path": "/data" }
}
```

Bỏ `disk` để tạo dự án stateless.

## Bảng giá {#pricing}

### Lấy bảng giá {#get-pricing}

Công khai, không cần xác thực.

```http
GET /api/pricing
```

**Phản hồi:**

```json
{
  "compute": {
    "tiers": [
      { "min_balance_usd": 0, "cpu_usd_per_hour": 0.02, "ram_gb_usd_per_hour": 0.01 },
      { "min_balance_usd": 100, "cpu_usd_per_hour": 0.014, "ram_gb_usd_per_hour": 0.007 },
      { "min_balance_usd": 200, "cpu_usd_per_hour": 0.012, "ram_gb_usd_per_hour": 0.006 }
    ]
  },
  "storage": {
    "usd_per_gib_month": 0.15,
    "hours_per_month": 730,
    "min_size_gib": 1,
    "max_size_gib": 1000,
    "version": "...",
    "enabled": true
  }
}
```

## Bản ghi sử dụng {#usage-records}

`GET /api/workspaces/{slug}/wallet/usage` trả về các bản ghi sử dụng theo giờ. Mỗi bản ghi có thêm:

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `kind` | string | `compute` hoặc `storage` |
| `volume_id` | string \| null | Volume được tính phí, với bản ghi `storage` |
| `storage_gib` | integer | Dung lượng tính phí, với bản ghi `storage` |
| `cost_nano_usd` | integer | Chi phí lưu trữ chính xác, đơn vị một phần tỷ đô la |

Với bản ghi `storage`, `cost_nano_usd` là số tiền chính xác; phần dưới 1 cent được cộng dồn trên ví và chỉ trừ khi đủ một cent. `cost_usd` (cent) chứa chi phí compute.

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Bảng giá](/vi/guide/pricing)
- [`tose disk` / `tose volumes` / `tose pricing`](/vi/commands/disk)
