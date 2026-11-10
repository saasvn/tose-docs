# tose env

Quản lý biến môi trường của dự án.

## tose env list

Liệt kê tất cả biến môi trường.

### Tóm tắt

```bash
tose env list [project]
```

### Sử dụng

```bash
$ tose env list

KEY                          VALUE                                    SECRET
DATABASE_URL                 postgresql://user:pass@host/db           no
API_KEY                      ****...                                  yes
NODE_ENV                     production                               no
PORT                         3000                                     no
JWT_SECRET                   ****...                                  yes
```

### Kết quả JSON

```bash
$ tose env list --json
```

```json
{
  "success": true,
  "data": [
    {
      "id": "env_abc123",
      "key": "DATABASE_URL",
      "value": "postgresql://user:pass@host/db",
      "is_secret": false
    },
    {
      "id": "env_def456",
      "key": "API_KEY",
      "value": "sk-xxxx...",
      "is_secret": true
    }
  ]
}
```

---

## tose env set

Đặt một hoặc nhiều biến môi trường.

### Tóm tắt

```bash
tose env set <KEY=VALUE...> [--apply]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--apply` | Triển khai thay đổi ngay. Xem [Lưu và áp dụng thay đổi](#saving-and-applying-changes) |

### Sử dụng

**Đặt một biến:**

```bash
$ tose env set NODE_ENV=production

✓ Set 1 variable(s)
```

**Đặt nhiều biến:**

```bash
$ tose env set DATABASE_URL=postgres://... API_KEY=secret PORT=3000

✓ Set 3 variable(s)
```

### Hành vi

- Biến mới được tạo
- Biến đã có cùng key được cập nhật
- Các biến khác được giữ nguyên (merge)

### Kết quả JSON

```json
{
  "success": true,
  "data": {
    "created": 2,
    "updated": 1,
    "deleted": 0
  }
}
```

---

## tose env rm

Xóa một hoặc nhiều biến môi trường.

### Tóm tắt

```bash
tose env rm <KEY...> [--yes] [--apply]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--yes` | Xác nhận việc xóa. Bắt buộc khi không có terminal hoặc khi dùng `--json` |
| `--apply` | Triển khai thay đổi ngay. Xem [Lưu và áp dụng thay đổi](#saving-and-applying-changes) |

### Sử dụng

```bash
$ tose env rm DEBUG OLD_VAR UNUSED_KEY

  Deleted: DEBUG
  Deleted: OLD_VAR
  Not found: UNUSED_KEY

Deleted 2 variable(s)
```

### Kết quả JSON

```json
{
  "success": true,
  "data": {
    "deleted": 2
  }
}
```

---

## tose env push

Đẩy file env local lên dự án.

### Tóm tắt

```bash
tose env push [file] [--replace] [--apply]
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `[file]` | Đường dẫn file env (mặc định: `.env`) |

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--replace` | Thay thế toàn bộ biến hiện có (mặc định: merge). Cần `--yes` khi không có terminal hoặc khi dùng `--json` |
| `--apply` | Triển khai thay đổi ngay. Xem [Lưu và áp dụng thay đổi](#saving-and-applying-changes) |

### Sử dụng

**Đẩy file mặc định (merge):**

```bash
$ tose env push

✓ Pushing 5 variables to my-app...
✓ 5 variables pushed
```

**Đẩy một file cụ thể:**

```bash
$ tose env push .env.production

✓ Pushing 12 variables to my-app...
✓ 12 variables pushed
```

**Thay thế toàn bộ biến:**

```bash
$ tose env push .env.production --replace

✓ Pushing 12 variables to my-app...
✓ 12 variables pushed (replaced all)
```

### Định dạng file env

```bash
# Comment bị bỏ qua
KEY=value
ANOTHER_KEY=value with spaces
QUOTED="value in double quotes"
SINGLE_QUOTED='value in single quotes'

# Dòng trống bị bỏ qua
DATABASE_URL=postgres://user:pass@host:5432/db
```

### Kết quả JSON

```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 0,
    "deleted": 0
  }
}
```

---

## tose env pull

Kéo biến môi trường của dự án về file local.

### Tóm tắt

```bash
tose env pull [file]
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `[file]` | Đường dẫn file đầu ra (mặc định: `.env`) |

### Sử dụng

```bash
$ tose env pull

✓ Fetching environment variables...
Pulled 8 variables to .env
```

**Kéo về một file cụ thể:**

```bash
$ tose env pull .env.local

✓ Fetching environment variables...
Pulled 8 variables to .env.local
```

File được tạo chứa mỗi dòng một cặp `KEY=VALUE`:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
API_KEY=sk-xxxxxxxxxxxx
NODE_ENV=production
PORT=3000
```

### Kết quả JSON

```json
{
  "success": true,
  "data": {
    "pulled": 8,
    "file": ".env",
    "skipped_masked": []
  }
}
```

---

## Lưu và áp dụng thay đổi {#saving-and-applying-changes}

`tose env set`, `tose env rm` và `tose env push` **mặc định chỉ lưu**. Các pod đang chạy nhận thay đổi ở lần triển khai tiếp theo.

Thêm `--apply` để triển khai thay đổi ngay. Cách triển khai giống [`tose redeploy`](/vi/commands/deploy#tose-redeploy): dùng image thành công gần nhất, **không build lại**.

```bash
tose env set LOG_LEVEL=debug --apply
tose env push prod.env --apply
tose env rm OLD_FLAG --yes --apply
```

CLI gửi `?apply=true` tới API và báo kết quả sau khi thay đổi đã được lưu:

| Kết quả | Ý nghĩa | Mã thoát |
|---------|---------|----------|
| `applied: true` | Đã lưu và đã triển khai. Kết quả có `deployment_id` và `status` | `0` |
| `NO_DEPLOYMENT` hoặc `NO_SERVER` | Đã lưu. Dự án chưa có deployment hoặc server để triển khai, nên thay đổi có hiệu lực ở lần deploy tiếp theo | `0` |
| `ROLLOUT_FAILED` và các code khác | Đã lưu nhưng việc triển khai không diễn ra. Chạy `tose redeploy` để thử lại | `8` |
| `INSUFFICIENT_BALANCE` | Đã lưu nhưng ví không đủ để trả cho lần triển khai. Hãy nạp tiền rồi chạy `tose redeploy` | `9` |
| Phản hồi không có `apply` | Server cũ không báo kết quả. Thay đổi chỉ được lưu. Với `--json`, `apply` là `{ "applied": false }`, không có nghĩa là thất bại | `0` |

Với `--json`, kết quả có thêm `apply` (kết quả từ API) và `apply_message` (một câu mô tả kết quả):

```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 0,
    "deleted": 0,
    "apply": { "applied": true, "deployment_id": "dep_abc123", "status": "running" },
    "apply_message": "Saved and applied: rolled out to the running project. Deployment dep_abc123 (running)."
  }
}
```

### Trường hợp bị từ chối

Một số điều kiện khiến yêu cầu bị từ chối. Chúng được báo như lỗi và API **không lưu gì**:

- Số dư ví bằng 0 hoặc âm (`INSUFFICIENT_BALANCE`, mã thoát `9`).
- API key thiếu scope `deployments:execute` (`INSUFFICIENT_SCOPE`).
- Ứng dụng đã kết nối cần được phê duyệt trước.

Với `--apply`, CLI không bao giờ quay lại gửi từng biến một sau khi bị từ chối. Nếu lệnh cần nhiều lần ghi và lần cuối bị từ chối, các lần ghi trước vẫn được lưu và CLI sẽ nói rõ điều đó.

### Chỉ khởi động lại một lần

Khi các biến được ghi từng cái một, hoặc xóa nhiều key, chỉ lần ghi hoặc xóa **cuối cùng** yêu cầu triển khai. Dự án khởi động lại một lần, không phải một lần cho mỗi biến.

Việc ghi từng biến chỉ xảy ra với server cũ không có route bulk. Khi đó `--json` trả `set` (với `env set`) hoặc `pushed` (với `env push`) thay cho các số đếm ở trên, cùng với `apply` và `apply_message`. `tose env rm` không yêu cầu triển khai khi không có key nào tồn tại.

Giá trị vẫn được che như mô tả ở [Giá trị bị che với member của workspace](#masked-values-for-workspace-members).

---

## Giá trị bị che với member của workspace {#masked-values-for-workspace-members}

Chỉ `admin` và `owner` của workspace mới đọc được giá trị biến môi trường. Với `member`, API trả placeholder `********` thay cho mỗi giá trị trong danh sách env của project (và `***` trong danh sách env của template). CLI nhận ra các placeholder này và không bao giờ coi chúng là giá trị thật:

| Lệnh | Hành vi khi giá trị bị che |
|------|----------------------------|
| `tose env list` | Hiển thị placeholder đúng như API trả về |
| `tose env pull` | Bỏ qua các key bị che và liệt kê chúng trong `skipped_masked` khi dùng `--json`. Giá trị mà file local đã có cho key bị che được giữ nguyên. Nếu mọi giá trị đều bị che, lệnh thất bại mà không ghi file (`FORBIDDEN`, mã thoát `1`) |
| `tose env push`, `tose env set`, `tose template env set` | Từ chối giá trị là placeholder đã che và không gửi gì (`VALIDATION_ERROR`, mã thoát `2`) |
| `tose up` | Khi bạn chọn đẩy file env ở prompt, dừng trước khi gửi bất kỳ giá trị nào nếu file chứa placeholder đã che (`VALIDATION_ERROR`, mã thoát `2`). Không có terminal thì `tose up` không đẩy file env |

Việc từ chối này tránh ghi đè giá trị thật bằng placeholder, ví dụ khi sao chép danh sách vào file env. Hãy thay placeholder bằng giá trị thật, hoặc nhờ `admin` hay `owner` của workspace chạy lệnh.

```bash
$ tose env pull
Pulled 6 variables to .env
Skipped 2 masked variable(s) (API_KEY, JWT_SECRET): workspace members cannot read env values.
```

```json
{
  "success": true,
  "data": {
    "pulled": 6,
    "file": ".env",
    "skipped_masked": ["API_KEY", "JWT_SECRET"]
  }
}
```

---

## Ví dụ quy trình

### Đồng bộ biến giữa các môi trường

```bash
# Kéo từ staging
tose env pull .env.staging --workspace my-ws --project staging-app

# Sửa local
vim .env.staging

# Đẩy lên production
tose env push .env.staging --workspace my-ws --project prod-app
```

### Đặt biến trong CI/CD

```bash
tose env set \
  NODE_ENV=production \
  DATABASE_URL=$DATABASE_URL \
  API_KEY=$API_KEY \
  --workspace my-ws \
  --project my-app \
  --apply
```

### Thay thế toàn bộ môi trường

```bash
# Thay toàn bộ biến bằng một bộ mới
tose env push .env.production --replace

# Kiểm tra
tose env list
```

## Lệnh liên quan

- [`tose up`](/vi/commands/up) - Triển khai (tự động đẩy biến môi trường)
- [`tose redeploy`](/vi/commands/deploy#tose-redeploy) - Triển khai lại để áp dụng các thay đổi env đã lưu (hoặc dùng `--apply`)
- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái dự án
