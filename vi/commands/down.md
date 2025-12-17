# tose down

Dừng các triển khai đang chạy.

## Tóm tắt

```bash
tose down [options]
```

## Mô tả

Lệnh `tose down` dừng các triển khai đang hoạt động.

::: warning Đang phát triển
Lệnh `tose down` hiện đang trong quá trình phát triển. Việc tích hợp API đầy đủ đang chờ xử lý.
:::

## Tùy chọn

| Tùy chọn | Alias | Mô tả |
|--------|-------|-------------|
| `--project <id>` | `-p` | Dừng triển khai của dự án cụ thể |
| `--force` | `-f` | Bỏ qua gợi ý xác nhận |

## Sử dụng

### Chế độ tương tác

```bash
tose down
```

### Dừng dự án cụ thể

```bash
tose down --project my-app
```

### Dừng bắt buộc không có xác nhận

```bash
tose down --project my-app --force
```

## Ví dụ phiên

```bash
$ tose down

? Chọn workspace:
  ❯ My Personal Workspace

? Chọn dự án để dừng:
  ❯ my-api-server (Đang chạy)
    frontend-app (Đang chạy)

Dự án: my-api-server
  Trạng thái hiện tại: Đang chạy
  ID triển khai: dep_abc123
  URL: https://my-api-server.tose.app

⚠️  Cảnh báo: Điều này sẽ dừng tất cả triển khai đang chạy cho dự án này.

? Bạn có chắc muốn dừng triển khai này? (y/N)
```

## Trường hợp sử dụng

### Dừng để bảo trì

```bash
tose down --project my-app
# Thực hiện bảo trì
tose up  # Triển khai lại khi sẵn sàng
```

### Dừng khẩn cấp

```bash
tose down --project my-app --force
```

## Điều gì xảy ra khi dừng

1. **Tắt graceful** - Ứng dụng nhận SIGTERM
2. **Connection draining** - Kết nối đang hoạt động hoàn thành
3. **Dừng container** - Container bị chấm dứt
4. **Dọn dẹp tài nguyên** - Tài nguyên được giải phóng
5. **Cập nhật trạng thái** - Triển khai được đánh dấu "Đã dừng"

## Best Practices

### 1. Kiểm tra trạng thái trước

```bash
tose status --project my-app
tose down --project my-app
```

### 2. Sử dụng xác nhận trong Production

```bash
# Chế độ tương tác yêu cầu xác nhận
tose down
```

### 3. Triển khai lại sau bảo trì

```bash
tose down --project my-app
# Thực hiện bảo trì
tose up
tose status
```

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra nếu triển khai đã dừng
- [`tose up`](/vi/commands/up) - Triển khai lại sau khi dừng
- [`tose logs`](/vi/commands/logs) - Xem logs trước khi dừng
