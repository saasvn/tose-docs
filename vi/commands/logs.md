# tose logs

Xem logs triển khai với bộ lọc và theo dõi thời gian thực.

## Tóm tắt

```bash
tose logs [options]
```

## Tùy chọn

| Tùy chọn | Alias | Mô tả |
|--------|-------|-------------|
| `--project <id>` | `-p` | Xem logs cho dự án cụ thể |
| `--deployment <id>` | `-d` | Xem logs cho triển khai cụ thể |
| `--lines <số>` | `-n` | Số dòng hiển thị (mặc định: 100) |
| `--follow` | `-f` | Theo dõi logs thời gian thực |
| `--container <tên>` | | Theo dõi một [sidecar](/vi/guide/project-sidecars) thay vì container chính của dự án. Chỉ áp dụng cho log trực tiếp: không kết hợp với `--build` hoặc `-d` |

## Sử dụng

### Xem 50 dòng cuối

```bash
tose logs -n 50
```

### Xem dự án cụ thể

```bash
tose logs --project my-app
```

### Theo dõi logs thời gian thực

```bash
tose logs --follow
```

### Theo dõi một sidecar

Không có `--container`, CLI theo dõi container chính của dự án như trước. Truyền tên sidecar để theo dõi sidecar đó:

```bash
tose logs --follow --container otel-collector
```

Tên được kiểm tra cục bộ và mã hóa URL; container không tồn tại bị API từ chối với `400`. API key vẫn gửi qua header `X-API-Key`, không bao giờ nằm trong URL.

### Tùy chọn kết hợp

```bash
tose logs --project my-app -n 200 --follow
```

## Cấp độ Log

| Cấp độ | Màu | Icon | Mô tả |
|-------|-------|------|-------------|
| INFO | Xanh | ℹ️ | Thông tin |
| WARN | Vàng | ⚠️ | Cảnh báo |
| ERROR | Đỏ | ❌ | Lỗi |
| DEBUG | Xám | 🔍 | Debug |

## Ví dụ đầu ra

```bash
$ tose logs -n 20

Logs triển khai (dep_abc123)

[2025-01-15 10:30:15] INFO ℹ️ Bắt đầu triển khai...
[2025-01-15 10:30:16] INFO ℹ️ Đang nhân bản repository từ GitHub
[2025-01-15 10:30:20] INFO ℹ️ Đang cài đặt dependencies...
[2025-01-15 10:30:45] INFO ℹ️ Chạy npm install
[2025-01-15 10:31:00] INFO ℹ️ Xây dựng thành công
[2025-01-15 10:31:02] INFO ℹ️ Khởi động ứng dụng trên cổng 3000
[2025-01-15 10:31:05] INFO ✅ Ứng dụng đang chạy
```

## Trường hợp sử dụng

### Debug vấn đề triển khai

```bash
tose logs --project my-app -n 200
```

### Giám sát tiến trình triển khai

```bash
tose up
# Trong terminal khác
tose logs --follow
```

### Lưu logs để phân tích

```bash
tose logs -n 1000 > deployment-logs.txt
```

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái triển khai
- [`tose up`](/vi/commands/up) - Triển khai ứng dụng
- [`tose down`](/vi/commands/down) - Dừng triển khai
