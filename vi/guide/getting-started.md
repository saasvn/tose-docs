# Bắt đầu

Hướng dẫn này sẽ đưa bạn qua việc triển khai ứng dụng đầu tiên với TOSE CLI.

## Yêu cầu

Trước khi bắt đầu, đảm bảo bạn có:

- [Node.js 14+](/vi/guide/installation#yêu-cầu) đã cài đặt
- [TOSE CLI](/vi/guide/installation) đã cài đặt toàn cục
- Tài khoản TOSE với API key
- Một dự án sẵn sàng triển khai (tùy chọn: có Git repository)

## Bước 1: Chuẩn bị dự án

Điều hướng đến thư mục dự án:

```bash
cd /path/to/your/project
```

TOSE CLI hoạt động tốt nhất với các dự án có:

- Git repository đã khởi tạo (tùy chọn nhưng khuyến nghị)
- Biến môi trường trong các file `.env` (tùy chọn)
- Ứng dụng Node.js chạy trên cổng cụ thể

::: tip Tích hợp Git
Nếu dự án của bạn được kết nối với Git repository (GitHub, GitLab, Bitbucket), TOSE CLI sẽ tự động phát hiện và cung cấp triển khai liên tục.
:::

## Bước 2: Triển khai ứng dụng

Chạy lệnh triển khai:

```bash
tose up
```

TOSE CLI sẽ hướng dẫn bạn qua quy trình thiết lập tương tác.

### 2.1 Xác thực

Nếu đây là lần đầu, bạn sẽ được nhắc nhập API key:

```
? Nhập TOSE API key: tose_sk_xxxxxxxxxxxxx
```

API key của bạn sẽ được lưu an toàn vào `~/.tose/config.json` để sử dụng sau.

::: tip Lấy API Key
Bạn có thể lấy API key từ [TOSE Dashboard](https://tose.sh) > Settings > API Keys
:::

### 2.2 Chọn Workspace

Nếu bạn có nhiều workspace, hãy chọn một:

```
? Chọn workspace:
  ❯ My Personal Workspace
    Company Team Workspace
```

Đối với tài khoản một workspace, bước này được bỏ qua tự động.

### 2.3 Chọn dự án

Chọn dự án hiện có hoặc tạo mới:

```
? Bạn muốn làm gì?
  ❯ Tạo dự án mới
    Chọn dự án hiện có: my-app
    Chọn dự án hiện có: api-server
```

Nếu tạo dự án mới:

```
? Nhập tên dự án: my-awesome-app
```

### 2.4 Cấu hình Git

TOSE CLI sẽ cố gắng tự động phát hiện Git repository:

```
✓ Phát hiện Git repository: https://github.com/username/my-awesome-app

? Xác nhận URL Git repository: (Y/n)
```

Các định dạng được hỗ trợ:
- HTTPS: `https://github.com/username/repo.git`
- SSH: `git@github.com:username/repo.git`
- Rút gọn: `username/repo`

Chọn nhánh:

```
? Chọn nhánh:
  ❯ main
    develop
    feature/new-ui
```

### 2.5 Cấu hình cổng

Chỉ định cổng ứng dụng chạy:

```
? Nhập cổng ứng dụng: (3000)
```

Các cổng phổ biến:
- `3000` - Node.js/React (mặc định)
- `8080` - Java/Spring
- `5000` - Python/Flask
- `4200` - Angular

### 2.6 Biến môi trường

TOSE CLI sẽ tìm kiếm các file `.env` trong dự án:

```
✓ Tìm thấy 3 file .env

? Chọn file .env để bao gồm:
  ❯◉ .env (5 biến)
   ◯ .env.local (3 biến)
   ◯ .env.production (8 biến)
```

Xem trước biến đã chọn:

```
Xem trước biến môi trường (13 tổng):
  NODE_ENV=production
  API_URL=https://api.example.com
  DATABASE_URL=postgres://... (đã che)
  JWT_SECRET=****** (đã che)
  PORT=3000
```

::: tip Giá trị nhạy cảm
TOSE CLI tự động che giấu các giá trị nhạy cảm như password, token và API key trong xem trước.
:::

### 2.7 Tóm tắt cấu hình

Xem xét cấu hình trước khi triển khai:

```
📋 Tóm tắt cấu hình

Dự án: my-awesome-app
  ID: prj_xyz789
  Slug: my-awesome-app
  Cổng: 3000

Git Repository:
  URL: https://github.com/username/my-awesome-app
  Nhánh: main

Biến môi trường:
  13 biến từ:
    - .env (5 biến)
    - .env.production (8 biến)

? Tiếp tục triển khai? (Y/n)
```

### 2.8 Triển khai

Sau khi xác nhận:

```
✓ Dự án được tạo thành công
✓ Biến môi trường đã tải lên
✓ Git repository đã liên kết
✓ Triển khai đã được kích hoạt

🚀 Triển khai bắt đầu!
  ID: dep_new123
  URL: https://my-awesome-app.tose.app

Xem logs: tose logs --deployment dep_new123
Kiểm tra trạng thái: tose status --project my-awesome-app
```

## Bước 3: Giám sát triển khai

Kiểm tra trạng thái triển khai:

```bash
tose status
```

Đầu ra:

```
Trạng thái triển khai

Deployment ID: dep_new123
Trạng thái: Đang xây dựng
Tạo: Vừa xong
URL: https://my-awesome-app.tose.app

Tiến trình xây dựng:
  ✓ Đang nhân bản repository
  ⏳ Đang cài đặt dependencies
  ⏳ Đang xây dựng ứng dụng
  ⏳ Đang khởi động container
```

## Bước 4: Xem Logs

Theo dõi log triển khai thời gian thực:

```bash
tose logs
```

Hoặc xem 50 dòng cuối:

```bash
tose logs -n 50
```

## Bước 5: Truy cập ứng dụng

Sau khi triển khai, ứng dụng của bạn có sẵn tại:

```
https://[project-slug].tose.app
```

Ví dụ:
```
https://my-awesome-app.tose.app
```

## Quy trình làm việc phổ biến

### Cập nhật cấu hình triển khai

```bash
tose up
# Chọn "Cập nhật cấu hình"
```

### Triển khai lại ứng dụng

```bash
tose up
# Chọn "Triển khai lại với cấu hình mới"
```

### Xem trạng thái

```bash
tose status --project my-awesome-app
```

### Theo dõi logs

```bash
tose logs --follow
```

### Dừng triển khai

```bash
tose down
```

## Best Practices môi trường

### Tổ chức file .env

Sử dụng các file khác nhau cho các môi trường:

```bash
.env                 # Mặc định/development
.env.local          # Ghi đè local (gitignored)
.env.production     # Giá trị production
.env.staging        # Giá trị staging
```

### Quy ước đặt tên

Sử dụng tên rõ ràng, viết hoa:

```bash
# Tốt
DATABASE_URL=postgres://...
API_KEY=abc123
JWT_SECRET=secret123

# Tránh
db=postgres://...
key=abc123
```

## Khắc phục sự cố

### Git Repository không được phát hiện

Nếu phát hiện Git thất bại:

1. Đảm bảo bạn đang trong Git repository:
   ```bash
   git status
   ```

2. Kiểm tra remote URL:
   ```bash
   git remote get-url origin
   ```

3. Nhập URL thủ công khi được nhắc

### API Key không hợp lệ

Nếu API key không hoạt động:

1. Xác minh nó bắt đầu bằng `tose_sk_`
2. Kiểm tra nó chưa hết hạn trong dashboard
3. Thử tạo key mới

### Triển khai thất bại

Nếu triển khai thất bại:

1. Kiểm tra logs để tìm lỗi:
   ```bash
   tose logs -n 100
   ```

2. Xác minh biến môi trường
3. Kiểm tra cổng ứng dụng đúng
4. Đảm bảo Git repository có thể truy cập

## Tiếp theo

Sau khi triển khai ứng dụng đầu tiên:

- [Tìm hiểu về tất cả lệnh](/vi/commands/overview)
- [Cấu hình biến môi trường](/vi/guide/environment)
- [Thiết lập tích hợp Git](/vi/guide/git)
- [Khám phá tùy chọn cấu hình](/vi/guide/configuration)

## Nhận trợ giúp

Cần hỗ trợ?

- Xem trợ giúp lệnh: `tose --help`
- Kiểm tra lệnh cụ thể: `tose up --help`
- Truy cập [tài liệu](/)
- Email: tobi@wearetopgroup.com
- [GitHub Issues](https://github.com/tosesh/tose/issues)
