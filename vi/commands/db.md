# tose db

Quản lý cơ sở dữ liệu trong workspace.

::: tip Lệnh cấp workspace
Lệnh `db` hoạt động ở cấp workspace, không phải cấp dự án. Bạn chỉ cần đã xác thực và chọn workspace.
:::

## tose db list

```bash
tose db list
```

Liệt kê mọi database trong workspace, gồm tên, loại (`db_type`) và trạng thái.

## tose db create

Tạo database mới.

### Tóm tắt

```bash
tose db create [--name <name>] [--type <type>] [--server <id>]
```

Trong terminal, `--name` và `--type` còn thiếu sẽ được hỏi tương tác; `--server` không bao giờ được hỏi. Không có terminal, hoặc khi dùng `--json`, thiếu `--name` hay `--type` sẽ lỗi `INPUT_REQUIRED` và cho biết flag cần truyền. CLI gửi `db_type` và `server_id` lên API, đúng như API yêu cầu.

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--name <name>` | Tên database |
| `--type <type>` | Loại database, xem bên dưới |
| `--server <id>` | Máy chủ chạy database |

### Loại database

| `--type` | Mô tả |
|----------|-------|
| `postgres` | PostgreSQL |
| `pgvector` | PostgreSQL với extension pgvector |
| `mysql` | MySQL |
| `redis` | Kho key-value trong bộ nhớ |
| `mongo` | MongoDB |

`postgresql` và `mongodb` được chấp nhận như bí danh của `postgres` và `mongo`. Giá trị khác bị từ chối trước khi gửi request.

### Chọn máy chủ

- Workspace có **một máy chủ active**: CLI tự chọn máy chủ đó.
- Có **nhiều máy chủ active**: truyền `--server <id>`. Nếu không, lệnh lỗi validation và liệt kê các máy chủ active (`details.servers`).
- **Không có máy chủ active**: lệnh lỗi; hãy thêm máy chủ tại [tose.sh](https://tose.sh) trước.

### Cách dùng

```bash
tose db create --name my-app-db --type postgres --server srv_abc123 --json
```

Database mới có thể chưa active, nên kết quả tạo không kèm thông tin kết nối. Đọc chúng bằng [`tose db info`](#tose-db-info) khi trạng thái là `active`.

---

## tose db info

Hiển thị thông tin kết nối của database.

```bash
tose db info <name-or-id>
```

`<name-or-id>` là tên hoặc ID database. Kết quả gồm loại, trạng thái, port, user, tên database và `connection_url`.

API chỉ trả thông tin kết nối (URL và mật khẩu) cho owner và admin của workspace. Với thành viên khác, các trường này không có: `tose db info` in ghi chú yêu cầu hỏi owner hoặc admin, và với `--json` đối tượng có `credentials_visible: false` cùng `credentials_note`.

## Quy trình: nối database vào dự án

```bash
tose db create --name my-app-db --type postgres
tose db info my-app-db          # sao chép connection URL
tose env set DATABASE_URL=<connection-url>
tose redeploy
```

## Lệnh liên quan

- [`tose env set`](/vi/commands/env#tose-env-set) - Đặt connection URL làm biến môi trường
- [`tose redeploy`](/commands/deploy) - Áp dụng thay đổi env
