# tose sidecars

Quản lý cấu hình đã lưu của các [sidecar](/vi/guide/project-sidecars) trong dự án. Sidecar **mặc định bị tắt và được bật theo từng workspace**; lệnh này không bật tính năng.

Mọi lệnh đều nhận [tùy chọn chung](/vi/commands/overview), kể cả `--json`.

## tose sidecars get

Hiển thị cấu hình sidecar đã lưu. Đây là cấu hình, không phải bằng chứng container đang chạy: dùng [`tose status`](/vi/commands/status) để xem container đang chạy.

```bash
tose sidecars get [project]
```

## tose sidecars set

Thay thế toàn bộ danh sách đã lưu bằng một file JSON (một danh sách, hoặc object có khóa `sidecars`).

```bash
tose sidecars set [project] --file sidecars.json
```

| Tùy chọn | Mô tả |
|--------|-------------|
| `--file <path>` | Bắt buộc. File JSON, tối đa 256 KiB |

```json
[
  {
    "name": "otel-collector",
    "image": "ghcr.io/acme/collector:1.4@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "registry_credential_id": "<id credential registry của workspace, cho image riêng tư>",
    "cpu": "0.25",
    "ram": "0.25",
    "port": 4318,
    "health_path": "/healthz",
    "env": [{ "name": "OTLP_HEADERS", "from_env": "OTEL_HEADERS" }]
  }
]
```

- Danh sách mới thay thế danh sách đã lưu. File rỗng bị từ chối; dùng `tose sidecars rm` để xóa sidecar.
- Tối đa ba sidecar; `image` phải ghim theo digest. Image riêng tư dùng **ID** credential registry của workspace. CLI từ chối các trường trông như mật khẩu, token hay auth, và không bao giờ in giá trị credential hoặc env.
- CLI kiểm tra cục bộ tên, digest, giới hạn và trường lạ; API vẫn là bên quyết định (registry, khóa env và ổ đĩa phải tồn tại).
- Thay đổi chỉ được **lưu, chưa triển khai**. Pod đang chạy và hóa đơn không đổi cho tới lần triển khai tiếp theo. `--json` trả `applied: false` và `redeploy_required: true`.

```bash
tose sidecars set --file sidecars.json
tose redeploy
```

Nếu workspace chưa được bật, API trả `SIDECARS_DISABLED` (exit code `3`). Các lỗi xác thực giữ nguyên mã của API, ví dụ `SIDECAR_ENV_MISSING`, `SIDECAR_DISK_MISSING`, `SIDECAR_IMAGE_FORBIDDEN`.

## tose sidecars rm

Xóa mọi sidecar đã lưu (gửi danh sách rỗng tường minh). Luôn được phép, kể cả ở workspace tắt sidecar.

```bash
tose sidecars rm [project] [--yes]
```

Lệnh yêu cầu xác nhận; khi không có terminal (hoặc dùng `--json`) hãy thêm `--yes`. Giống `set`, việc xóa áp dụng từ lần triển khai tiếp theo.

Nếu phản hồi của server không chứa danh sách đã lưu (ví dụ server chưa hỗ trợ sidecar), `set` và `rm` báo lỗi `SIDECARS_NOT_CONFIRMED` thay vì báo thành công. [`tose deploy --dry-run`](/vi/commands/deploy) liệt kê sidecar đã lưu và tính giới hạn mỗi replica vào giá dự kiến.

## Liên quan

- [Sidecar của dự án](/vi/guide/project-sidecars)
- [`tose status`](/vi/commands/status): trạng thái từng container và tổng mỗi replica
- [`tose logs --container`](/vi/commands/logs): theo dõi sidecar
- `tose export`: bị từ chối với `SIDECARS_NOT_PORTABLE` khi dự án có sidecar; CLI không bao giờ lặng lẽ bỏ sidecar
