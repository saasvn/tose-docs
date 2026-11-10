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

### Dòng giới hạn tiến trình {#process-limit-line}

Khi bên vận hành hệ thống TOSE đã khai báo giới hạn tiến trình (PID) theo Pod, đầu ra dạng văn bản thêm một dòng sau `Memory:`:

```
CPU:     2000m
Memory:  4Gi
PIDs:    4096 per Pod (operator-declared, shared by the Pod's containers; not verified live)
```

- **Do bên vận hành khai báo, không kiểm tra trực tiếp.** Con số là giá trị bên vận hành cấu hình, không phải số đọc trực tiếp từ node.
- **Dùng chung cho cả Pod.** Container của dự án và mọi sidecar cùng dùng một ngân sách; đây không phải giới hạn theo từng container.
- **Không có dòng nghĩa là chưa biết, không phải không giới hạn.** Nếu thiếu dòng `PIDs:`, TOSE không biết giới hạn. Đừng hiểu đó là "không giới hạn".
- **Server cũ.** Server không gửi trường này thì dòng bị bỏ qua và CLI không in thêm gì.
- **Không phải cam kết.** TOSE chưa thực thi giới hạn này, nên đừng dựa vào nó để chặn một tiến trình chạy mất kiểm soát.

Với `tose status --json`, giá trị nằm ở `data.resources.pids.limit`, và chỉ xuất hiện khi đã có khai báo. Xem thêm [API dự án](/vi/api/projects#status).

## Các giai đoạn trạng thái

| Giai đoạn | Icon | Mô tả |
|-------|------|-------------|
| Pending | ⏳ | Triển khai đang chờ |
| Building | 🔨 | Đang xây dựng ứng dụng |
| Deploying | 🚀 | Đang triển khai container |
| Running | ✅ | Đang chạy thành công |
| Failed | ❌ | Triển khai thất bại |
| Stopped | ⏸️ | Đã dừng thủ công |

## Lệnh liên quan

- [`tose up`](/vi/commands/up) - Triển khai ứng dụng
- [`tose logs`](/vi/commands/logs) - Xem logs chi tiết
- [`tose down`](/vi/commands/down) - Dừng triển khai
