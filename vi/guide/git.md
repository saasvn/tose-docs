# Tích hợp Git

Thiết lập tích hợp Git cho triển khai tự động với TOSE CLI.

## Tổng quan

TOSE CLI tích hợp với Git repository để cho phép:

- **Tự động phát hiện** - Tự động phát hiện Git remote và nhánh
- **Triển khai liên tục** - Triển khai khi Git push
- **Nhiều nhà cung cấp** - Hỗ trợ GitHub, GitLab, Bitbucket
- **Chọn nhánh** - Triển khai từ bất kỳ nhánh nào

## Nhà cung cấp Git được hỗ trợ

- **GitHub** - github.com
- **GitLab** - gitlab.com và self-hosted
- **Bitbucket** - bitbucket.org
- **Generic Git** - Bất kỳ Git server nào

## Tự động phát hiện Git

### Cách hoạt động

Khi chạy `tose up`, TOSE CLI tự động:

1. Kiểm tra thư mục `.git`
2. Đọc `git remote get-url origin`
3. Liệt kê các nhánh có sẵn
4. Gợi ý nhánh hiện tại

### Ví dụ

```bash
$ tose up

✓ Phát hiện Git repository: https://github.com/username/my-app
✓ Nhánh hiện tại: main

? Xác nhận URL Git repository: (Y/n)
```

## Định dạng URL

### Định dạng HTTPS

```bash
https://github.com/username/repo.git
https://gitlab.com/username/repo.git
https://bitbucket.org/username/repo.git
```

### Định dạng SSH

```bash
git@github.com:username/repo.git
git@gitlab.com:username/repo.git
git@bitbucket.org:username/repo.git
```

### GitHub Shorthand

```bash
username/repo
```

Tự động mở rộng thành: `https://github.com/username/repo.git`

## Chọn nhánh

### Chọn tương tác

```bash
? Chọn nhánh:
  ❯ main
    develop
    staging
    feature/new-api
```

## Cấu hình Git thủ công

Nếu tự động phát hiện thất bại:

```bash
$ tose up

? Nhập URL Git repository: https://github.com/username/my-app
? Chọn nhánh: main
```

## Liên kết Repository

Git repository được tự động liên kết khi bạn:

1. Cung cấp URL Git trong `tose up`
2. Xác nhận cấu hình
3. Triển khai

```bash
✓ Git repository đã liên kết
✓ Triển khai đã kích hoạt
```

## Thiết lập triển khai liên tục

### Bước 1: Liên kết Repository trong Dashboard

1. Đăng nhập vào [TOSE Dashboard](https://tose.sh)
2. Điều hướng đến **Settings** > **Git Integration**
3. Nhấp **Connect Repository**
4. Ủy quyền TOSE truy cập nhà cung cấp Git
5. Chọn repository

### Bước 2: Push để triển khai

```bash
git add .
git commit -m "Cập nhật ứng dụng"
git push origin main

# Triển khai tự động kích hoạt
```

### Bước 3: Giám sát triển khai

```bash
tose logs --follow
```

## Làm việc với nhánh

### Triển khai nhánh khác

```bash
tose up
# Nhập URL repository
# Chọn nhánh khác (vd: staging)
```

### Triển khai Feature Branch

```bash
git checkout -b feature/new-feature
git push origin feature/new-feature

tose up
# Chọn nhánh: feature/new-feature
```

## Nhiều môi trường

### Development Environment

```bash
# Triển khai từ nhánh develop
tose up
# Dự án: my-app-dev
# Nhánh: develop
```

### Production Environment

```bash
# Triển khai từ nhánh main
tose up
# Dự án: my-app-prod
# Nhánh: main
```

## Best Practices

### 1. Sử dụng nhánh cho môi trường

```
main → Production
staging → Staging
develop → Development
```

### 2. Commit trước khi triển khai

```bash
git status
git add .
git commit -m "Sẵn sàng triển khai"
git push
tose up
```

### 3. Tag các release

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

## Khắc phục sự cố

### Git Repository không được phát hiện

```bash
# Kiểm tra Git đã khởi tạo
git status

# Kiểm tra remote tồn tại
git remote -v

# Nếu không có remote, thêm một
git remote add origin https://github.com/username/repo.git
```

### Repository không thể truy cập

Nếu TOSE không thể truy cập repository:

1. **Public Repository** - Đảm bảo URL đúng
2. **Private Repository** - Liên kết repository trong dashboard trước
3. **Self-Hosted** - Xác minh TOSE có quyền truy cập mạng

### Nhánh không tìm thấy

```bash
# Fetch nhánh mới nhất
git fetch origin

# Push nhánh nếu chỉ có local
git push origin my-branch
```

## Tài liệu liên quan

- [Bắt đầu](/vi/guide/getting-started)
- [tose up](/vi/commands/up)
- [Biến môi trường](/vi/guide/environment)
- [Cấu hình](/vi/guide/configuration)
