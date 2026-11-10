# tose ops

Đọc bức tranh vận hành của các workspace.

## tose ops summary

Hiển thị theo từng workspace: vai trò của bạn, dự án nhóm theo trạng thái deployment mới nhất, ứng dụng đã cài (template) nhóm theo trạng thái, và sự cố đang mở kèm mức nghiêm trọng cao nhất.

```bash
tose ops summary          # bảng theo workspace
tose ops summary --json   # đầu ra cho máy đọc
```

Lệnh gọi `GET /api/operations/summary`.

### Quyền

- API key cần scope `deployments:read`.
- API key chỉ thấy **workspace của chính nó**. Người đã đăng nhập thấy mọi workspace mà họ là thành viên.

Kết quả là một ảnh chụp cơ sở dữ liệu tại `observed_at`. Tối đa 100 workspace được trả về, sắp theo tên; `truncated` là `true` khi bạn thuộc nhiều hơn. Không bao gồm thanh toán.

### Health

| Giá trị | Ý nghĩa |
|---------|---------|
| `degraded` | Có ít nhất một sự cố đang mở. |
| `unknown` | Không có sự cố đang mở. Lần đọc này không có bằng chứng uptime. |

`health` **không bao giờ là `healthy`**: danh sách sự cố trống không chứng minh mọi thứ chạy đúng. Dùng [`tose status`](/vi/commands/status) để kiểm tra trực tiếp một dự án.
