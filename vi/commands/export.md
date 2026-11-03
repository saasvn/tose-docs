# tose export

In danh mục chỉ đọc của một dự án để lập kế hoạch chuyển nền tảng.

`tose export` gọi `GET /api/workspaces/{slug}/projects/{project_slug}/export` và in tài liệu `tose.dev/project-export/v1`: cấu hình tài nguyên, **tên** biến môi trường, domain, metadata volume và image đang chạy, chỉ khi image đó được ghim bằng OCI digest.

::: warning Đây là danh mục, không phải bản backup
Export không sao chép database, volume bền vững hay giá trị biến môi trường của bạn, và không chứng minh rằng việc chuyển sẽ thành công. Hãy đọc `blockers` và `rollback` trong kết quả, đồng thời tự backup PostgreSQL và volume. Xem [hướng dẫn chuyển nền tảng](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md) trong repo TOSE.
:::

## Tóm tắt

```bash
tose export [project] [--workspace <slug>] [--json]
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `[project]` | Tùy chọn. Slug dự án hoặc `workspace/project`. Bỏ trống thì CLI dùng dự án đã liên kết |

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--workspace <slug>` | Workspace chứa dự án |
| `--json` | In một envelope JSON, trong đó `data` là bản export, dành cho script và agent |

Lệnh không bao giờ hỏi lại và chỉ gửi một request `GET`. Lệnh không thay đổi gì trong TOSE.

## Quyền truy cập

| Người gọi | Yêu cầu |
|-----------|---------|
| Thành viên workspace đã đăng nhập | Mọi vai trò |
| API key | Scope `projects:export`. Tạo key có scope này trong phần cài đặt workspace. Xem [API keys](/vi/api/api-keys) |

Thiếu scope, lệnh thoát với `INSUFFICIENT_SCOPE` (mã thoát `3`) và `error.details.required_scope` là `projects:export`. Dự án không tồn tại, hoặc thuộc workspace khác, trả về `NOT_FOUND` (mã thoát `6`).

## Kết quả gồm những gì

| Trường | Nội dung |
|--------|----------|
| `schema_version` | Luôn là `tose.dev/project-export/v1`. CLI từ chối mọi giá trị khác |
| `generated_at` | Thời điểm tạo bản export |
| `source` | `workspace_id`, `project_id`, `name`, `slug`. Đây là định danh trong TOSE, không dùng lại làm ID ở nơi đích |
| `artifact` | `deployment_id`, `commit_sha` và `image_digest`. `image_digest` chỉ có khi image đang chạy mới nhất được ghim bằng OCI digest |
| `resources` | `port`, `replicas`, `cpu`, `ram` |
| `env_keys` | Chỉ **tên** biến môi trường |
| `domains` | Domain tùy chỉnh kèm `dns_status` và `ssl_status` |
| `volumes` | `id`, `size_gib`, `mount_path` và `status` của volume bền vững |
| `blockers` | Những điều chưa được xác minh trước khi chuyển |
| `rollback` | Rollback khôi phục và không khôi phục gì, theo `artifact`, `config`, `schema`, `data` |

### Không bao giờ có

Giá trị biến môi trường, API key, thông tin đăng nhập registry, kubeconfig, build log và mật khẩu database. CLI còn kiểm tra phản hồi theo contract và chỉ in các trường trong bảng trên, nên một trường lạ từ server không đến được terminal hay log của bạn. Nếu một API key xuất hiện trong trường được định nghĩa, nó bị che.

## Blockers và rollback

`blockers` là danh sách mã. Danh sách rỗng không có nghĩa là việc chuyển an toàn. API báo các mã sau:

| Blocker | Ý nghĩa |
|---------|---------|
| `immutable_oci_digest_unavailable` | Image đang chạy mới nhất không được ghim bằng digest, nên thiếu `artifact.image_digest` |
| `volume_backup_and_restore_unverified` | TOSE không backup hay restore volume qua API này. Hãy tự kiểm tra backup và restore |
| `database_dependencies_unresolved` | API không chứng minh được dự án dùng database nào trong workspace |
| `target_capabilities_unverified` | Chưa có kiểm tra nào xác nhận nơi đích hỗ trợ CPU, bộ nhớ, port, volume và health |
| `dns_cutover_requires_approval` | Mọi thay đổi DNS cần một người phê duyệt |

`rollback` cho biết rollback trong TOSE chạy lại **image** cũ với cấu hình **hiện tại**. Rollback không khôi phục biến môi trường, cấu hình ứng dụng, schema hay dữ liệu database. Hãy lập kế hoạch và backup riêng cho từng phần.

## Sử dụng

**Bản tóm tắt cho người đọc:**

```bash
$ tose export web --workspace acme

Project export (tose.dev/project-export/v1, 2026-11-03T08:00:00Z)
This is a read-only inventory, not a backup and not a completed migration. Back up the database and volume separately.

Project:   Web (web)
Artifact:  registry.example/web@sha256:…  commit abc123
Resources: port 3000, 2 replica(s), cpu 500m, ram 512Mi

Environment variable names (values are never exported):
  - DATABASE_URL
  - SESSION_SECRET
Domains:
  - example.com (dns verified, ssl active)
Volumes:
  - /data 5 GiB (bound, vol_1)

Blockers (resolve before any migration):
  - database_dependencies_unresolved
  - dns_cutover_requires_approval

Rollback:
  artifact: image only
  config:   not restored
  schema:   not restored
  data:     not restored
```

**Một tài liệu JSON cho script và agent:**

```bash
tose export web --workspace acme --json > export.json
```

Với `--json`, stdout chỉ có đúng một envelope. `data` là bản export và `message` nhắc lại rằng đây không phải bản backup hay việc chuyển đã hoàn tất.

## Lỗi

| Tình huống | Mã | Mã thoát |
|------------|----|----------|
| Key không có `projects:export` | `INSUFFICIENT_SCOPE` | `3` |
| Không được phép đọc dự án | `forbidden` | `3` |
| Dự án không tồn tại hoặc thuộc workspace khác | `not_found` | `6` |
| `schema_version` khác `tose.dev/project-export/v1` | `ERROR` | `1` |
| Phản hồi sai định dạng | `ERROR` | `1` |

Với `schema_version` không được hỗ trợ, thông báo yêu cầu cập nhật CLI (`npm i -g @tosesh/tose`) và không in gì từ bản export. Toàn bộ mã thoát nằm trong [tổng quan các lệnh](/vi/commands/overview#ma-thoat).

## Liên quan

- [API keys](/vi/api/api-keys) về scope
- [Hướng dẫn chuyển nền tảng](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md) trong `saasvn/tose-app`: backup PostgreSQL và volume, khôi phục sang đích, chuyển DNS và rollback
- [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback)
