# tose up

Triển khai hoặc quản lý ứng dụng với lệnh `tose up`.

## Tóm tắt

```bash
tose up [options]
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

- API key phải bắt đầu bằng `ws_`
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

Chọn file .env:

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

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái sau `tose up`
- [`tose logs`](/vi/commands/logs) - Xem logs triển khai
- [`tose down`](/vi/commands/down) - Dừng triển khai
