# tose export

In ra bản kiểm kê chỉ đọc, không chứa bí mật của một dự án để lập kế hoạch di chuyển.

::: warning Không phải bản sao lưu, không phải đã di chuyển
Export liệt kê những gì đang có và những gì chưa được chứng minh. Nó không sao lưu gì và không bao giờ báo một cuộc di chuyển là đã xong. Hãy sao lưu database và volume riêng.
:::

## Tóm tắt

```bash
tose export [project] --workspace <slug>
tose export web --workspace acme --json > export.json
```

Gọi `GET /api/workspaces/{slug}/projects/{project_slug}/export` và in tài liệu `tose.dev/project-export/v1`. API key cần scope `projects:export`; thiếu scope thì lệnh thoát mã `3` (`INSUFFICIENT_SCOPE`). Dự án không tồn tại thoát mã `6`.

## Nội dung

- `resources`, `domains`, `volumes`, và image đang chạy chỉ khi được ghim bằng OCI digest.
- `env_keys` và `env_refs`: **tên** biến, biến nào là secret, và `value_recoverable` (TOSE còn giải mã được giá trị đã lưu hay không). Giá trị không bao giờ được xuất.
- `databases[].backup_refs` (và `volumes[].backup_refs`, luôn rỗng vì TOSE không sao lưu volume): ID, thời điểm, kích thước, SHA-256, định dạng, thời hạn giữ và `download_path` (chỉ admin). Không có khóa lưu trữ hay thông tin đăng nhập. Bản sao lưu không có `sha256` được tạo trước khi TOSE ghi checksum.
- `blockers`: những gì export không chứng minh được, ví dụ `database_backup_unavailable`, `database_restore_unverified`, `volume_backup_unavailable`, `env_values_unrecoverable`.
- `migration`: kế hoạch `tose.dev/data-migration/v1` gồm năm bước và bằng chứng mỗi bước cần. Nguồn vẫn phục vụ và được giữ lại nếu một bước thất bại. `status` luôn là `not_started`; CLI từ chối export nói khác.
- `rollback`: rollback khôi phục gì. Xem [biên nhận rollback](/vi/commands/deployment#bien-nhan-rollback).

Export từ server cũ không có các trường này vẫn dùng được; các trường đó chỉ vắng mặt.

## Checksum làm bằng chứng

API gửi `X-Tose-Export-Sha256`, là SHA-256 của nội dung phản hồi. Với `--json`, `data.export_checksum` cho biết hash CLI tính trên đúng các byte nhận được:

| `status` | Ý nghĩa |
|----------|---------|
| `verified` | Khớp header của server. Có thể ghi làm bằng chứng `record_export`. |
| `absent` | Server không gửi header. Hash chỉ tính cục bộ, **chưa** được server xác nhận. |
| `malformed_header` | Header không phải SHA-256. Coi như chưa xác nhận. |

`sha256` bao phủ đúng các byte server đã gửi, không phải `data` đã lọc mà CLI in ra. Muốn lưu tệp có hash khớp, hãy tải export trực tiếp từ API. Không khớp là lỗi (thoát mã `1`) và không in nội dung export.

## Liên quan

- [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback)
- [`tose db`](/vi/commands/db)
