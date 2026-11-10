# tose up

Triển khai hoặc quản lý ứng dụng với lệnh `tose up`.

## Tóm tắt

```bash
tose up [--workspace <slug>] [--project <slug>] [--disk-size <gib> --disk-mount <path>] [--env-file <path>] [--non-interactive] [-y]
```

## Mô tả

Lệnh `tose up` là lệnh triển khai chính trong TOSE CLI. Nó xử lý:

- Tạo dự án mới
- Cập nhật dự án hiện có
- Cấu hình Git repository
- Quản lý biến môi trường
- Kích hoạt triển khai

Đây là lệnh tương tác hướng dẫn bạn qua toàn bộ quy trình triển khai.

## Sử dụng

### Sử dụng cơ bản

```bash
tose up
```

Điều này khởi chạy wizard tương tác sẽ:

1. Xác thực với API key
2. Chọn hoặc tạo workspace
3. Chọn hoặc tạo dự án
4. Cấu hình Git repository (tùy chọn)
5. Đặt cổng ứng dụng
6. Chọn file biến môi trường
7. Xem xét tóm tắt cấu hình
8. Triển khai ứng dụng

## Các bước quy trình làm việc

### Bước 1: Xác thực

Nếu chưa được cache, nhập API key:

```
? Nhập TOSE API key của bạn:
```

- API key phải bắt đầu bằng `tose_sk_`
- Key được lưu vào `~/.tose/config.json`
- Được sử dụng cho tất cả lệnh trong tương lai

### Bước 2: Chọn Workspace

Chọn từ các workspace có sẵn:

```
? Chọn workspace:
  ❯ My Personal Workspace
    Company Team
```

### Bước 3: Chọn dự án

Chọn dự án hiện có hoặc tạo mới:

```
? Bạn muốn làm gì?
  ❯ Tạo dự án mới
    my-existing-app
    api-server
```

Khi tạo dự án mới, bạn có thể gắn ổ đĩa lưu trữ bền vững:

| Tùy chọn | Mô tả |
|--------|-------------|
| `--disk-size <gib>` | Gắn ổ đĩa bền vững với dung lượng này (1–1000 GiB) cho dự án mới |
| `--disk-mount <path>` | Đường dẫn mount của ổ đĩa, ví dụ `/data` |

```bash
tose up --disk-size 10 --disk-mount /data
```

Với dự án đã có, dùng [`tose disk set`](/vi/commands/disk#tose-disk-set). Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks).

### Bước 4: Cấu hình Git

Tự động phát hiện hoặc nhập thủ công Git repository:

```
✓ Phát hiện: https://github.com/user/repo

? Xác nhận URL Git repository: (Y/n)
```

Định dạng được hỗ trợ:
- `https://github.com/user/repo.git`
- `git@github.com:user/repo.git`
- `user/repo` (GitHub shorthand)

### Bước 5: Cấu hình cổng

Nhập cổng ứng dụng:

```
? Nhập cổng ứng dụng: (3000)
```

### Bước 6: Biến môi trường

Biến môi trường chỉ được tải lên khi bạn đồng ý rõ ràng: trả lời có trong terminal, hoặc truyền `--env-file <path>`. Khi chạy headless, xem [Chạy headless và CI](#chạy-headless-và-ci).

Trong terminal, chọn file .env:

```
✓ Tìm thấy 3 file .env

? Chọn file .env:
  ❯◉ .env (5 biến)
   ◉ .env.production (8 biến)
   ◯ .env.local (3 biến)
```

### Bước 7: Tóm tắt cấu hình

Xem xét trước khi triển khai:

```
📋 Tóm tắt cấu hình

Dự án: my-app
  ID: prj_abc123
  Slug: my-app
  Cổng: 3000

Git Repository:
  URL: https://github.com/user/my-app
  Nhánh: main

Biến môi trường:
  13 biến từ 2 file

? Tiếp tục triển khai? (Y/n)
```

### Bước 8: Triển khai

Sau khi xác nhận:

```
✓ Dự án được tạo/cập nhật
✓ Biến môi trường đã tải lên
✓ Git repository đã liên kết
✓ Triển khai đã kích hoạt

🚀 Triển khai bắt đầu
  ID: dep_xyz789
  URL: https://my-app.tose.app
```

### API key không có `deployments:execute`

Kết nối Git và bắt đầu triển khai là hai quyền riêng. Với API key có `projects:write` nhưng không có `deployments:execute`, `tose up` vẫn kết nối Git, nhưng tắt tự động triển khai. Lệnh không bắt đầu lần triển khai nào và thoát với lỗi `INSUFFICIENT_SCOPE`:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "Git is connected, but no deployment was started: this API key lacks the `deployments:execute` scope. Run `tose deploy` with a key that includes it.",
    "details": {
      "required_scope": "deployments:execute",
      "git_connected": true,
      "deploy_skipped": true
    }
  }
}
```

Dự án đã được thiết lập xong nên không cần làm lại. Hãy chạy [`tose deploy`](/vi/commands/deploy) với key có `deployments:execute`. Cho đến lúc đó, mỗi lần push Git sẽ không tự động triển khai. Xem [Scope và tự động triển khai](/vi/api/authentication#scopes-and-automatic-deploys) và [API Key và scope](/vi/api/api-keys).

## Chạy headless và CI

Với `--json`, `--non-interactive` hoặc khi không có terminal (CI, agent, pipe), `tose up` không bao giờ hỏi.

### Thiếu thông tin: lỗi `INPUT_REQUIRED`

API key thuộc về một workspace, nên `tose up` dùng workspace đó mà không hỏi; bạn chỉ cần `--workspace` (hoặc `TOSE_WORKSPACE`) khi API trả về nhiều workspace. Thông tin thường bị thiếu là dự án.

Nếu không thể xác định workspace, dự án hoặc K8S server mà không hỏi, `tose up` thoát với mã `2` và mã lỗi `INPUT_REQUIRED`. Trường hợp server áp dụng khi có nhiều server đang hoạt động và dự án chưa được gán server nào.

Khi đó không có gì được tạo hay ghi: không tạo dự án, không kết nối Git, không ghi `.tose.json`, không đặt workspace mặc định trong cấu hình người dùng. Bạn có thể bổ sung thông tin và chạy lại an toàn.

Cách khắc phục: truyền giá trị hoặc đặt biến môi trường:

```bash
tose up --workspace my-ws --project my-app --json
# hoặc
TOSE_WORKSPACE=my-ws TOSE_PROJECT=my-app tose up --json
```

`--json` chỉ chọn định dạng đầu ra. Nó không bao giờ ngầm hiểu là đồng ý, nên không tự tạo dự án hay tải biến môi trường lên.

### Đẩy biến môi trường bằng `--env-file`

```bash
tose up --workspace my-ws --project my-app --env-file ./.env.production --json
```

Đây là cách duy nhất để đẩy biến môi trường khi chạy headless.

| Hành vi | Chi tiết |
|---------|----------|
| Kiểm tra trước | File được đọc và kiểm tra trước khi gửi bất kỳ request nào. File thiếu, không đọc được, rỗng, hoặc chứa giá trị che (masked) sẽ làm lệnh thất bại trước khi tạo gì. |
| Giá trị được giữ kín | Giá trị không bao giờ được in ra, và được che ngay cả khi server trả lại. |
| Thất bại thì dừng | Nếu tải lên lỗi, lệnh dừng trước khi triển khai. Lệnh không quay lại đẩy từng biến một, nên không bao giờ báo thành công khi chỉ một phần biến được tải lên. |

### Khi không có `--env-file`

File env tìm thấy trong thư mục không được tải lên. Kết quả JSON báo trong `env`:

| `env.status` | Ý nghĩa |
|--------------|---------|
| `pushed` | Biến đã được tải lên. `env.variables` là số lượng. |
| `skipped` | Không tải gì lên. `env.reason` cho biết lý do, ví dụ `env_files_found_no_consent` (có file nhưng không có `--env-file`), `none_requested` (không có file env) hoặc `declined` (bạn trả lời không ở câu hỏi). |

### Không có repository GitHub cục bộ

Dự án mới không được tạo khi thư mục không có repository GitHub cục bộ, vì không thể triển khai. `tose up` thất bại với `GIT_CONNECTION_REQUIRED` và không tạo gì. Lệnh không thể biết trước GitHub App của TOSE có truy cập được repository hay không; việc đó được kiểm tra khi kết nối Git.

### Key thiếu `deployments:execute`

Git được kết nối nhưng không có lần triển khai nào bắt đầu; xem [API key không có `deployments:execute`](#api-key-khong-co-deployments-execute).

### Kết quả JSON

```json
{
  "success": true,
  "data": {
    "workspace": "my-workspace",
    "project": "my-app",
    "deployment": { "id": "dep_abc123", "status": "pending" },
    "env": { "status": "skipped", "reason": "none_requested" }
  }
}
```

Khi thư mục có file `.env` nhưng bạn không truyền `--env-file`, không có gì được tải lên và kết quả báo rõ: `"env": { "status": "skipped", "reason": "env_files_found_no_consent" }`.

## Trường hợp sử dụng

### Triển khai lần đầu

```bash
cd /path/to/your-app
tose up
# Chọn "Tạo dự án mới"
```

### Triển khai lại sau thay đổi code

```bash
cd /path/to/your-app
tose up
# Chọn "Triển khai lại với cấu hình mới"
```

### Cập nhật biến môi trường

```bash
tose up
# Chọn "Cập nhật cấu hình"
# Cập nhật file .env hoặc lựa chọn
```

## Best Practices

### 1. Commit trước khi triển khai

```bash
git status
git add .
git commit -m "Sẵn sàng triển khai"
git push
tose up
```

### 2. Xem xét tóm tắt cấu hình

Luôn xem xét trước khi xác nhận:
- Kiểm tra số cổng
- Xác minh nhánh Git
- Xác nhận biến môi trường

### 3. Kiểm tra trạng thái sau triển khai

```bash
tose up
tose status
```

## Khắc phục sự cố

### API Key không được chấp nhận

```bash
rm ~/.tose/config.json
tose up
```

### Git Repository không được phát hiện

1. Kiểm tra bạn đang trong Git repository:
   ```bash
   git status
   ```

2. Xác minh remote tồn tại:
   ```bash
   git remote -v
   ```

### `INSUFFICIENT_SCOPE` sau dòng "Git đã kết nối"

Key thiếu `deployments:execute`. Git đã được kết nối và chưa có lần triển khai nào bắt đầu. Hãy chạy `tose deploy` với key có scope đó, hoặc thêm scope vào key. Xem [API key không có `deployments:execute`](#api-key-khong-co-deployments-execute).

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái sau `tose up`
- [`tose logs`](/vi/commands/logs) - Xem logs triển khai
- [`tose down`](/vi/commands/down) - Dừng triển khai
