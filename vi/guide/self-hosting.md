# Tự host

Trang này nêu cấu hình mà TOSE API cần khi bạn tự chạy nó trên production. Mã nguồn và file triển
khai nằm trong [`saasvn/tose-app`](https://github.com/saasvn/tose-app).

## Secret bắt buộc khi chạy production

Khi `APP_ENV=production`, API kiểm tra cấu hình lúc khởi động và **từ chối khởi động** nếu thiếu
bất kỳ biến nào dưới đây. Thông báo lỗi liệt kê mọi key còn thiếu.

| Biến | Mục đích |
|------|----------|
| `JWT_SECRET` | Ký session token. |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL. |
| `ENCRYPTION_KEY` | Mã hóa các secret được lưu như kubeconfig và biến môi trường. Khóa mã hóa là SHA-256 của giá trị này. |

Mọi giá trị `APP_ENV` khác đúng `production` (kể cả `prod`, `Production`, `staging` hoặc không đặt) đều bỏ qua bước kiểm tra này, và API dùng giá trị phát triển cục bộ
cho `JWT_SECRET` và `DATABASE_URL`, và bước kiểm tra luôn qua. Đừng dựa vào các giá trị mặc định đó
cho một hệ thống thật. Mặc định là `development`, vì vậy hãy đặt `APP_ENV=production` một cách
tường minh.

Hãy sinh giá trị ngẫu nhiên đủ mạnh, lưu trong secret manager và không bao giờ commit.

```bash
export APP_ENV=production
export JWT_SECRET="$(openssl rand -hex 32)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgres://user:password@db.internal:5432/tose?sslmode=require"
```

### Giữ `ENCRYPTION_KEY` không đổi

Nó mã hóa kubeconfig, biến của project và template, và bản sao lưu database. Đổi nó khiến dữ liệu
đã mã hóa không đọc được, và không có công cụ mã hóa lại. Hãy sao lưu nó cùng với database, và chạy
`cmd/seed` với cùng giá trị.

### Host từng chạy mà không có `ENCRYPTION_KEY`

Các bản build cũ suy ra khóa mã hóa từ `JWT_SECRET` khi `ENCRYPTION_KEY` chưa đặt. Dữ liệu của
chúng được mã hóa bằng khóa đó. Trước khi triển khai bản có bước kiểm tra production, hãy đặt
`ENCRYPTION_KEY` đúng bằng giá trị `JWT_SECRET` hiện tại trong cùng nguồn cấu hình. Sau đó có thể
xoay `JWT_SECRET` mà không mất dữ liệu.

## Credential không nằm trong URL và log

Với request REST, API chỉ đọc credential từ header `X-API-Key`, `Authorization: Bearer` và cookie `tose_token`. API
từ chối giá trị `api_key`, `access_token` và `tose_sk_` trong query string bằng
`400 credentials_in_url`, và access log chỉ ghi đường dẫn, không ghi query string. Nếu reverse
proxy hoặc load balancer của bạn ghi toàn bộ URL, các log đó nằm ngoài tầm kiểm soát của API, nên
hãy tắt việc ghi query ở đó. Xem [Xác thực](/vi/api/authentication).

## Công bố hợp đồng API

API phục vụ spec OpenAPI tại `/api/openapi.yaml`, nên một instance tự host tự có tài liệu. Hãy sinh
client theo base URL của bạn. Xem [Tài liệu REST API](/vi/api/reference).

## Tài liệu liên quan

- [Xác thực](/vi/api/authentication)
- [Mã lỗi](/vi/api/errors)
