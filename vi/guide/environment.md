# Biến môi trường

Quản lý biến môi trường trong triển khai với TOSE CLI.

## Tổng quan

TOSE CLI cung cấp quản lý biến môi trường mạnh mẽ với:

- Hỗ trợ nhiều file `.env`
- Tự động phát hiện file
- Merge thông minh với phát hiện xung đột
- Che giấu giá trị nhạy cảm
- Phân loại file

## Hỗ trợ file .env

### Các mẫu file được hỗ trợ

TOSE CLI tự động phát hiện các mẫu file:

```
.env
.env.local
.env.development
.env.production
.env.staging
.env.test
```

### Phát hiện file

TOSE CLI tìm kiếm thư mục dự án đệ quy:

```bash
$ tose up

✓ Tìm thấy 3 file .env:
  - .env (5 biến)
  - .env.local (3 biến)
  - .env.production (12 biến)
```

## Chọn nhiều file

Chọn một hoặc nhiều file:

```bash
? Chọn file .env để bao gồm:
  ❯◉ .env (5 biến)
   ◉ .env.production (12 biến)
   ◯ .env.local (3 biến)
```

**Điều hướng:**
- Dùng phím mũi tên để di chuyển
- Nhấn Space để chọn/bỏ chọn
- Nhấn Enter để xác nhận

## Merge file

### Thứ tự merge

File được merge theo thứ tự chọn. File sau ghi đè file trước:

```
.env           →  BASE_URL=http://localhost
.env.production →  BASE_URL=https://api.prod.com  (ghi đè)
```

Kết quả: `BASE_URL=https://api.prod.com`

### Phát hiện xung đột

TOSE CLI cảnh báo về xung đột:

```
⚠️  Phát hiện xung đột:
  - BASE_URL (định nghĩa trong .env và .env.production)
  - API_KEY (định nghĩa trong .env.local và .env.production)
```

## Xem trước biến

Xem trước biến trước khi triển khai:

```
Biến môi trường (13 tổng):

NODE_ENV=production
API_URL=https://api.example.com
DATABASE_URL=postgres://... (đã che)
JWT_SECRET=****** (đã che)
PORT=3000
LOG_LEVEL=info
```

## Che giấu giá trị nhạy cảm

TOSE CLI tự động che giấu giá trị chứa:

- `PASSWORD`
- `SECRET`
- `TOKEN`
- `API_KEY`
- `PRIVATE_KEY`
- `AUTH`
- `CREDENTIAL`

Ví dụ:

```bash
# Hiển thị
PORT=3000
NODE_ENV=production

# Đã che
DATABASE_PASSWORD=****** (đã che)
JWT_SECRET=****** (đã che)
API_KEY=****** (đã che)
```

### Giá trị bị che với member của workspace

`member` của workspace không nhận được giá trị biến môi trường: API trả `********` (danh sách env của project) hoặc `***` (danh sách env của template) thay cho giá trị. Chỉ `admin` và `owner` mới thấy giá trị. CLI không bao giờ ghi hoặc gửi các placeholder này như một giá trị thật:

- `tose env pull` bỏ qua các key bị che (hiện trong `skipped_masked` khi dùng `--json`), giữ nguyên giá trị mà file local đã có cho các key đó, và thất bại mà không ghi file khi mọi giá trị đều bị che (`FORBIDDEN`, mã thoát `1`).
- `tose env push`, `tose env set` và `tose template env set` từ chối giá trị là placeholder đã che và không gửi gì (`VALIDATION_ERROR`, mã thoát `2`).
- `tose up`, khi bạn chọn đẩy file env ở prompt, dừng trước khi gửi bất kỳ giá trị nào nếu file chứa placeholder đã che (`VALIDATION_ERROR`, mã thoát `2`). Không có terminal thì `tose up` không đẩy file env.

Việc từ chối này tránh ghi đè giá trị thật bằng placeholder, ví dụ khi sao chép danh sách vào file env. Hãy thay placeholder bằng giá trị thật, hoặc nhờ `admin` hay `owner` của workspace chạy lệnh.

```bash
$ tose env pull
Pulled 6 variables to .env
Skipped 2 masked variable(s) (API_KEY, JWT_SECRET): workspace members cannot read env values.
```

## Best Practices

### 1. Tổ chức file

```
.env                  # Mặc định development
.env.local           # Ghi đè local (gitignored)
.env.production      # Giá trị production
.env.staging         # Giá trị staging
.env.test            # Giá trị test
```

### 2. Git Ignore

```bash
# .gitignore
.env.local
.env*.local
.env.production
.env.staging
```

### 3. Đặt tên biến

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

### 4. File theo môi trường

```bash
# Local development
tose up  # Chọn .env + .env.local

# Production
tose up  # Chọn .env + .env.production

# Staging
tose up  # Chọn .env + .env.staging
```

## Định dạng file

### Cú pháp

```bash
# Comment được hỗ trợ
KEY=value

# Không cần dấu ngoặc kép (nhưng được hỗ trợ)
KEY="value"
KEY='value'

# Giá trị nhiều dòng
KEY="line 1
line 2"

# Giá trị rỗng
EMPTY=
```

### Ký tự đặc biệt

```bash
# Khoảng trắng trong giá trị
NAME=John Doe

# URLs
API_URL=https://api.example.com/v1

# Paths
DATA_PATH=/var/data/app
```

## Quy trình làm việc phổ biến

### Development local

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://localhost/myapp_dev

# .env.local (gitignored)
DATABASE_URL=postgres://localhost/myapp_dev_john
DEBUG=true
```

Triển khai:
```bash
tose up
# Chọn .env và .env.local
```

### Triển khai Production

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://prod-server/myapp
API_URL=https://api.prod.com
LOG_LEVEL=error
```

Triển khai:
```bash
tose up
# Chọn .env và .env.production
```

## Cập nhật biến

### Qua tose up

```bash
tose up
# Chọn "Cập nhật cấu hình"
# Thay đổi lựa chọn file .env
# Hoặc sửa file và chọn lại
```

### Qua Dashboard

1. Đăng nhập vào dashboard
2. Điều hướng đến dự án
3. Vào **Settings** > **Environment Variables**
4. Sửa biến thủ công

## Áp dụng thay đổi không cần build lại {#apply-without-a-rebuild}

Lưu biến môi trường không làm thay đổi các pod đang chạy. Để áp dụng, hãy redeploy: TOSE triển khai lại
image thành công gần nhất với các biến hiện tại và **không build lại**.

```bash
tose env set NODE_ENV=production
tose redeploy
```

Khi các biến đã lưu khác với biến mà deployment đang chạy được triển khai cùng, dự án ở trạng thái
**chờ áp dụng** (pending).

- **Dashboard:** một banner trên dự án báo trạng thái chờ áp dụng, kèm nút **Áp dụng**. Khi sửa biến,
  nút **Lưu & áp dụng** lưu và triển khai chỉ trong một lần bấm.
- **API:** thêm `?apply=true` vào `POST`, `PUT` hoặc `DELETE` trên
  `/api/workspaces/{slug}/projects/{project_slug}/env[/{env_id}]`, hoặc vào `PUT .../env/bulk`.
  Thay đổi được lưu rồi triển khai qua cùng đường với `POST .../redeploy`. Xem
  [Biến môi trường và apply](/vi/api/projects#environment-variables).
- **CLI:** `tose redeploy` áp dụng các biến đã lưu. CLI chưa có cờ để lưu và áp dụng trong một lệnh.

Áp dụng cần cùng quyền với redeploy: vai trò `owner` hoặc `admin` của workspace, scope
`deployments:execute` với API key (ứng dụng OAuth được kết nối cần được phê duyệt), và số dư ví dương.
Nếu thiếu một điều kiện, yêu cầu bị từ chối (`402` khi ví hết tiền, các trường hợp khác `403`) và
**không có gì được lưu**.

Nếu dự án chưa có server hoặc chưa có deployment thành công, thay đổi vẫn được lưu và phản hồi báo
`applied: false` kèm `NO_DEPLOYMENT`. Thay đổi có hiệu lực ở lần deploy tiếp theo.

## Khắc phục sự cố

### Không tìm thấy file .env

Nếu không phát hiện file:

```bash
# Kiểm tra file tồn tại
ls -la .env*

# Xác minh tên file
# Phải khớp: .env, .env.local, .env.production, v.v.
```

### Biến không được áp dụng

Nếu biến không hoạt động:

1. Kiểm tra file đã được chọn khi triển khai
2. Xác minh tên biến đúng
3. Nếu đã lưu biến mà chưa áp dụng, hãy áp dụng (xem [Áp dụng thay đổi không cần build lại](#apply-without-a-rebuild)) hoặc triển khai lại:
   ```bash
   tose up
   # Chọn "Triển khai lại"
   ```

## Tài liệu liên quan

- [Cấu hình](/vi/guide/configuration)
- [Bắt đầu](/vi/guide/getting-started)
- [tose up](/vi/commands/up)
