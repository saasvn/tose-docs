# API ổ đĩa, volume & bảng giá

Các endpoint cho [ổ đĩa bền vững](/vi/guide/persistent-disks), volume của workspace và [bảng giá](/vi/guide/pricing).

Endpoint của workspace nằm dưới `/api/workspaces/{slug}` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Endpoint đọc dành cho mọi thành viên workspace; thao tác thay đổi cần quyền admin của workspace.

## Đối tượng {#objects}

### Volume {#volume}

Một ổ đĩa bền vững, thuộc về một dự án, template, cơ sở dữ liệu được quản lý hoặc cloud desktop.

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `id` | string | ID volume |
| `workspace_id` | string | Workspace sở hữu |
| `workload_type` | string | `project`, `template`, `database` hoặc `desktop` |
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

Mọi ổ đĩa trong workspace (dự án, template, cơ sở dữ liệu và cloud desktop).

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

Chỉ được tăng dung lượng. `size_gib` nhỏ hơn sẽ trả về `400` kèm hướng dẫn di chuyển dữ liệu sang ổ đĩa mới nhỏ hơn. Tăng dung lượng khi ví hết tiền sẽ trả về `403`. Ổ đĩa home của cloud desktop chỉ tăng được sau khi đã bind (trả về `409` trước lần khởi động đầu tiên) và không vượt quá giới hạn ổ đĩa desktop của nền tảng (vượt quá trả về `400`).

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

Công khai: gửi request không cần API key hay session. Trả về giá CPU và RAM theo giờ ở mức tiêu chuẩn, các mức [thưởng khi nạp tiền](#get-top-up-bonus) và bảng giá lưu trữ bền vững.

```http
GET /api/pricing
```

**Phản hồi:**

```json
{
  "compute": {
    "cpu_usd_per_hour": 0.02,
    "ram_gb_usd_per_hour": 0.01,
    "tiers": [
      { "min_balance_usd": 0, "cpu_usd_per_hour": 0.02, "ram_gb_usd_per_hour": 0.01 }
    ]
  },
  "topup_bonus": {
    "currency": "USD",
    "bands": [
      { "min_amount_usd": 100, "bonus_percent": 10, "most_popular": false },
      { "min_amount_usd": 250, "bonus_percent": 15, "most_popular": false },
      { "min_amount_usd": 500, "bonus_percent": 20, "most_popular": true },
      { "min_amount_usd": 1000, "bonus_percent": 25, "most_popular": false }
    ],
    "note": "..."
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

| Trường | Mô tả |
|--------|-------|
| `compute.cpu_usd_per_hour` | Giá một vCPU-giờ. Mức tiêu chuẩn cho mọi workspace |
| `compute.ram_gb_usd_per_hour` | Giá một GB RAM mỗi giờ. Mức tiêu chuẩn cho mọi workspace |
| `compute.tiers` | **Đã deprecated.** Giữ lại cho client cũ. Luôn chỉ có một phần tử (`min_balance_usd: 0`) với mức giá tiêu chuẩn. Hãy đọc `cpu_usd_per_hour` và `ram_gb_usd_per_hour`. Trường này có thể bị gỡ ở bản sau |
| `topup_bonus` | Cùng bảng với [`GET /api/billing/topup-bonus`](#get-top-up-bonus) |
| `storage` | Bảng giá lưu trữ bền vững |

### Lấy bảng thưởng khi nạp tiền {#get-top-up-bonus}

Công khai: gửi request không cần API key hay session. Trả về credit thưởng mà một lần nạp ví nhận được. Xem [Thưởng khi nạp tiền](/vi/guide/pricing#top-up-bonus) để biết các quy tắc.

```http
GET /api/billing/topup-bonus
```

**Phản hồi:**

```json
{
  "currency": "USD",
  "bands": [
    { "min_amount_usd": 100, "bonus_percent": 10, "most_popular": false },
    { "min_amount_usd": 250, "bonus_percent": 15, "most_popular": false },
    { "min_amount_usd": 500, "bonus_percent": 20, "most_popular": true },
    { "min_amount_usd": 1000, "bonus_percent": 25, "most_popular": false }
  ],
  "note": "The bonus applies to one payment and is added as separate, non-expiring credit. Admin and promotional credit earn no bonus. A refund takes back the bonus in proportion."
}
```

| Trường | Mô tả |
|--------|-------|
| `bands[].min_amount_usd` | Một lần nạp nhỏ nhất đạt mức này |
| `bands[].bonus_percent` | Credit thưởng, tính theo phần trăm của lần nạp đó |
| `bands[].most_popular` | `true` cho mức được màn hình nạp tiền làm nổi bật |

Các mức được liệt kê từ thấp đến cao. Lần nạp dưới mức đầu tiên không có thưởng. Thanh toán có mã khuyến mãi không được thưởng, và hoàn tiền sẽ thu hồi thưởng theo tỷ lệ. Phần thưởng hiện trong lịch sử ví dưới dạng giao dịch `topup_bonus` (và `topup_bonus_clawback` khi bị thu hồi). Trường `note` là văn bản tiếng Anh do máy chủ trả về.

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
