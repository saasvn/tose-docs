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

### Dự án có sidecar

`CPU` và `Memory` vẫn là giới hạn của riêng container dự án. `pod total` là một replica tính cả các sidecar, tức lượng được tính phí cho mỗi replica. Một pod chỉ được tính là sẵn sàng khi mọi container của nó sẵn sàng. Sidecar đã lưu là cấu hình áp dụng ở lần triển khai tiếp theo; các dòng container cho biết cái đang chạy. Xem [sidecar của dự án](/vi/guide/project-sidecars).

```bash
$ tose status

Pods:    0/1 ready
  pod-abc-1  Running  restarts=3  age=5m
    - my-app  ready  state=running  restarts=0
    - otel-collector  not ready  state=waiting (CrashLoopBackOff)  restarts=3
CPU:     0.5  (project container; pod total 0.75 incl. sidecars, billed per replica)
Memory:  1  (project container; pod total 1.25 GB incl. sidecars, billed per replica)

Saved sidecars: (apply at the next deployment)
  otel-collector: 0.25 vCPU / 0.25 GB, ghcr.io/acme/collector:1.4@sha256:…
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
