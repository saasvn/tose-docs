# Tổng quan các lệnh

TOSE CLI cung cấp các lệnh chính sau để quản lý triển khai của bạn.

## Các lệnh có sẵn

| Lệnh | Mô tả | Trường hợp sử dụng phổ biến |
|---------|-------------|-----------------|
| [`tose up`](/vi/commands/up) | Triển khai hoặc quản lý dự án | Triển khai ban đầu, triển khai lại, cập nhật cấu hình |
| [`tose status`](/vi/commands/status) | Kiểm tra trạng thái triển khai | Giám sát tình trạng và tiến trình triển khai |
| [`tose logs`](/vi/commands/logs) | Xem logs triển khai | Debug vấn đề, giám sát đầu ra ứng dụng |
| [`tose down`](/vi/commands/down) | Dừng triển khai | Dừng các triển khai đang chạy |
| [`tose disk`](/vi/commands/disk) | Quản lý ổ đĩa bền vững của dự án | Lưu file upload, SQLite, dữ liệu cần giữ qua các lần triển khai |
| [`tose volumes`](/vi/commands/disk#tose-volumes-list) | Liệt kê và mở rộng mọi ổ đĩa trong workspace | Kiểm tra dung lượng và chi phí lưu trữ |
| [`tose pricing`](/vi/commands/disk#tose-pricing) | Xem bảng giá compute và lưu trữ | Ước tính chi phí |
| [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback) | Rollback về một triển khai trước (cần `--yes`) | Khôi phục sau bản phát hành lỗi |
| [`tose runbook`](/vi/commands/runbook) | Lập kế hoạch, xem lại và chạy restart hoặc rollback do người duyệt trong trình duyệt | Khôi phục có kiểm soát |
| [`tose db create`](/vi/commands/db#tose-db-create) | Tạo database (`--type`, `--server`) | Postgres, pgvector, MySQL, Redis, MongoDB |
| [`tose skills`](/vi/commands/skills) | Liệt kê và cài skill cho agent | Dạy agent dùng TOSE an toàn |

## Cấu trúc lệnh

Tất cả lệnh TOSE CLI theo mẫu này:

```bash
tose <lệnh> [tùy chọn]
```

### Tùy chọn toàn cục

Các tùy chọn này hoạt động với tất cả lệnh:

```bash
-V, --version    # Xuất số phiên bản
-h, --help       # Hiển thị trợ giúp cho lệnh
```

## Tham khảo nhanh

### Triển khai ứng dụng

```bash
# Triển khai tương tác
tose up

# Nhận trợ giúp
tose up --help
```

### Kiểm tra trạng thái

```bash
# Chọn dự án tương tác
tose status

# Kiểm tra dự án cụ thể
tose status --project my-app

# Kiểm tra tất cả dự án
tose status --all
```

### Xem Logs

```bash
# Chọn triển khai tương tác
tose logs

# Xem logs dự án cụ thể
tose logs --project my-app

# Xem 50 dòng cuối
tose logs -n 50

# Theo dõi logs thời gian thực
tose logs --follow

# Xem triển khai cụ thể
tose logs --deployment dep_abc123
```

### Dừng triển khai

```bash
# Dừng tương tác với xác nhận
tose down

# Dừng bắt buộc không có xác nhận
tose down --force

# Dừng dự án cụ thể
tose down --project my-app
```

## Quy trình làm việc lệnh

### Quy trình triển khai ban đầu

```bash
# 1. Điều hướng đến dự án
cd /path/to/your/project

# 2. Triển khai
tose up

# 3. Giám sát trạng thái
tose status

# 4. Xem logs
tose logs
```

### Quy trình cập nhật cấu hình

```bash
# 1. Chạy lệnh up
tose up

# 2. Chọn "Cập nhật cấu hình"

# 3. Cập nhật env vars hoặc cài đặt

# 4. Kiểm tra trạng thái
tose status
```

### Quy trình triển khai lại

```bash
# 1. Kích hoạt triển khai lại
tose up

# 2. Chọn "Triển khai lại với cấu hình mới"

# 3. Giám sát tiến trình
tose logs --follow
```

### Quy trình Debug

```bash
# 1. Kiểm tra trạng thái
tose status --project my-app

# 2. Xem logs gần đây
tose logs --project my-app -n 100

# 3. Theo dõi logs nếu cần
tose logs --project my-app --follow
```

## Đầu ra JSON và lỗi

Với `--json`, stdout chỉ có đúng một tài liệu JSON; tiến trình và cảnh báo đi vào stderr. `--json` không bao giờ tự xác nhận thao tác phá hủy.

```json
{
  "schema_version": "1",
  "status": "error",
  "success": false,
  "error": {
    "code": "not_found",
    "message": "workspace not found",
    "request_id": "req_123",
    "retryable": false,
    "details": null,
    "doc_url": null
  },
  "next_actions": []
}
```

| Trường | Ý nghĩa |
|--------|---------|
| `code` | `code` trong error envelope của API khi API gửi về: giá trị snake_case ổn định như `not_found`, `forbidden`, `credentials_in_url`. Hãy rẽ nhánh theo `code`, không theo `message`. Nếu không có envelope, mã lấy từ HTTP status (`UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, ...). Lỗi 403 do key được báo là `INSUFFICIENT_SCOPE` (kèm `details.required_scope`) hoặc `API_KEY_WORKSPACE_SCOPED` thay cho mã của API. CLI tự sinh một số mã như `INPUT_REQUIRED`, `CONFIRMATION_REQUIRED`, `DEPLOY_FAILED`, `SKILL_INTEGRITY` |
| `request_id` | Lấy từ body lỗi của API hoặc header `X-Request-Id`; hãy nêu khi báo sự cố |
| `retryable` | `true` nghĩa là chạy lại cùng lệnh sau đó có thể thành công |
| `details` | Ngữ cảnh thêm từ API, ví dụ `required_scope`, do CLI đặt khi `code` là `INSUFFICIENT_SCOPE` |
| `doc_url` | Liên kết tới tài liệu về lỗi này, hoặc `null` |

### Mã thoát

| Mã | Tên | Ý nghĩa |
|----|-----|---------|
| `0` | `SUCCESS` | Xong, hoặc đã được nhận và vẫn đang chạy (`status: "pending"`) |
| `1` | `ERROR` | Mọi lỗi khác, gồm lỗi API và mạng |
| `2` | `USAGE` | Flag, tham số hoặc đầu vào sai/thiếu, hoặc API từ chối request là không hợp lệ (400/422, gồm `credentials_in_url`) |
| `3` | `UNAUTHORIZED` | Không có API key, hoặc API từ chối (401/403, gồm thiếu scope) |
| `4` | `CONFIRMATION_REQUIRED` | Lệnh phá hủy cần `--yes` hoặc `--confirm <name>` |
| `5` | `CANCELLED` | Bạn từ chối xác nhận, một lần chờ bị ngắt, hoặc triển khai bị hủy |
| `6` | `NOT_FOUND` | Workspace, dự án hoặc tài nguyên không tồn tại |
| `7` | `TIMEOUT` | Chờ quá lâu; thao tác vẫn có thể hoàn tất |
| `8` | `OPERATION_FAILED` | Một deploy, build hoặc thao tác desktop kết thúc ở trạng thái lỗi |

### API key không bao giờ nằm trong URL

CLI chỉ gửi key trong header `X-API-Key`, kể cả WebSocket của `tose logs -f`, và từ chối mở luồng nếu URL mang tham số chứa credential, chẳng hạn `api_key`, `x-api-key` hoặc `access_token`. Nếu API trả `400 credentials_in_url`, nghĩa là có thứ gì đó đã đặt key vào query string (client cũ, proxy hoặc URL tự dựng). CLI sẽ báo và khuyên bạn đổi key. Cách đổi: tạo key mới, chạy `tose login` với key đó, rồi thu hồi key cũ. Ở chế độ `--json`, lỗi có `code` là `credentials_in_url`.

## Chế độ tương tác vs Dựa trên flag

TOSE CLI hỗ trợ cả gợi ý tương tác và flag dòng lệnh.

### Chế độ tương tác (Khuyến nghị)

Chạy lệnh không có flag để thiết lập hướng dẫn:

```bash
tose status
```

CLI sẽ nhắc bạn:
1. Chọn workspace (nếu nhiều)
2. Chọn dự án
3. Xem kết quả

### Chế độ dựa trên Flag

Sử dụng flag cho scripting hoặc truy cập nhanh:

```bash
tose status --project my-app
tose logs --project my-app -n 50
tose down --project my-app --force
```

## Trợ giúp lệnh

Nhận trợ giúp cho bất kỳ lệnh nào:

```bash
# Trợ giúp chung
tose --help

# Trợ giúp lệnh cụ thể
tose up --help
tose status --help
tose logs --help
tose down --help
```

## Biến môi trường

TOSE CLI tôn trọng các biến môi trường này:

### `TOSE_API_URL`

Ghi đè URL API mặc định:

```bash
export TOSE_API_URL=https://custom-api.tose.sh
tose up
```

### Biến chuẩn

- `HOME` - Được sử dụng cho vị trí file cấu hình (`~/.tose/`)
- `CI` - Được phát hiện trong môi trường CI
- `NO_COLOR` - Tắt đầu ra màu

## File cấu hình

TOSE CLI lưu trữ cấu hình tại:

```bash
~/.tose/config.json
```

Ví dụ nội dung:

```json
{
  "apiKey": "tose_sk_xxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

Để đặt lại cấu hình:

```bash
rm ~/.tose/config.json
tose up  # Sẽ nhắc API key lại
```

## Best Practices

### 1. Sử dụng chế độ tương tác cho thiết lập lần đầu

Gợi ý tương tác giúp bạn hiểu các tùy chọn:

```bash
tose up  # Hướng dẫn qua tất cả tùy chọn
```

### 2. Sử dụng Flag cho tự động hóa

Flag hoạt động tốt hơn trong script:

```bash
tose status --project my-app
```

### 3. Kiểm tra trạng thái sau triển khai

Luôn xác minh triển khai thành công:

```bash
tose up && tose status
```

### 4. Giám sát Logs trong khi triển khai

Xem tiến trình triển khai:

```bash
tose up
# Trong terminal khác
tose logs --follow
```

### 5. Lưu trữ API Key an toàn

Đừng hardcode API key:

```bash
# Tốt: Sử dụng biến môi trường
export TOSE_API_KEY=$(cat ~/.secrets/tose-key)

# Tồi: Hardcode trong script
TOSE_API_KEY="ws_123..."  # Đừng làm thế này
```

## Mã thoát

| Mã | Tên | Ý nghĩa |
|----|-----|---------|
| 0 | `SUCCESS` | Hoàn tất, hoặc đã được chấp nhận và vẫn đang chạy |
| 1 | `ERROR` | Mọi lỗi khác |
| 2 | `USAGE` | Cờ, tham số hoặc dữ liệu đầu vào không hợp lệ hoặc thiếu |
| 3 | `UNAUTHORIZED` | Thiếu API key, hoặc API từ chối key |
| 4 | `CONFIRMATION_REQUIRED` | Lệnh phá hủy cần `--yes` hoặc `--confirm <name>` |
| 5 | `CANCELLED` | Bạn từ chối xác nhận, thao tác chờ bị ngắt, hoặc deployment bị hủy |
| 6 | `NOT_FOUND` | Workspace, dự án hoặc tài nguyên không tồn tại |
| 7 | `TIMEOUT` | Chờ quá lâu; thao tác có thể vẫn hoàn tất |
| 8 | `OPERATION_FAILED` | Thao tác deploy, build hoặc desktop kết thúc ở trạng thái thất bại |
| 9 | `INSUFFICIENT_BALANCE` | Số dư ví của workspace bằng 0 hoặc âm nên deploy, redeploy hoặc rollback bị từ chối. `next_actions` có trang nạp tiền trong trường `url` |

## Tiếp theo

Khám phá chi tiết mỗi lệnh:

- [tose up](/vi/commands/up) - Hướng dẫn triển khai đầy đủ
- [tose status](/vi/commands/status) - Giám sát trạng thái
- [tose logs](/vi/commands/logs) - Xem và theo dõi logs
- [tose down](/vi/commands/down) - Dừng triển khai

Hoặc tìm hiểu về:

- [Cấu hình](/vi/guide/configuration) - Cấu hình TOSE CLI
- [Tích hợp Git](/vi/guide/git) - Thiết lập quy trình làm việc Git
- [Biến môi trường](/vi/guide/environment) - Quản lý env vars
