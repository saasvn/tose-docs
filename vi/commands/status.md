# tose status

Kiểm tra trạng thái triển khai của bạn.

## Tóm tắt

```bash
tose status [options]
```

## Tùy chọn

| Tùy chọn | Alias | Mô tả |
|--------|-------|-------------|
| `--project <id>` | `-p` | Kiểm tra dự án cụ thể theo ID hoặc slug |
| `--all` | `-a` | Hiển thị trạng thái cho tất cả dự án |

## Sử dụng

### Chế độ tương tác

```bash
tose status
```

### Kiểm tra dự án cụ thể

```bash
tose status --project my-app
```

### Kiểm tra tất cả dự án

```bash
tose status --all
```

## Ví dụ đầu ra

```
Trạng thái triển khai

Dự án: my-api-server
  Slug: my-api-server
  URL: https://my-api-server.tose.app

Triển khai mới nhất:
  ID: dep_xyz789
  Trạng thái: ✅ Đang chạy
  Phiên bản: v12
  Tạo: 2 giờ trước

Sức khỏe:
  Replicas: 2/2 khỏe mạnh
  Uptime: 99.8%
  Kiểm tra cuối: 30 giây trước
```

## Các giai đoạn trạng thái

| Giai đoạn | Icon | Mô tả |
|-------|------|-------------|
| Pending | ⏳ | Triển khai đang chờ |
| Building | 🔨 | Đang xây dựng ứng dụng |
| Deploying | 🚀 | Đang triển khai container |
| Running | ✅ | Đang chạy thành công |
| Failed | ❌ | Triển khai thất bại |
| Stopped | ⏸️ | Đã dừng thủ công |

## Giới hạn tiến trình

Khi bên vận hành hệ thống TOSE đã khai báo giới hạn tiến trình (PID) theo Pod, `tose status --json` trả về nó ở `data.resources.pids.limit`. Đầu ra dạng văn bản không in giá trị này. Giới hạn dùng chung cho container của dự án và các sidecar, là khai báo chứ không phải kiểm tra trực tiếp, và thiếu trường nghĩa là chưa biết giới hạn, không nhất thiết là không giới hạn. Xem [API dự án](/vi/api/projects#process-limit).

## Lệnh liên quan

- [`tose up`](/vi/commands/up) - Triển khai ứng dụng
- [`tose logs`](/vi/commands/logs) - Xem logs chi tiết
- [`tose down`](/vi/commands/down) - Dừng triển khai
