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

## Thumbnail của project

Thumbnail của project là ảnh chụp trang https công khai của project, được chụp sau mỗi lần deploy. API không bao
giờ chạy trình duyệt trong pod của chính nó. Mỗi lần chụp là một pod tồn tại ngắn cùng một NetworkPolicy trong
namespace `tose-thumbnail` trên cluster của project, và cả hai bị xóa khi chụp xong.

Những gì giới hạn pod chụp ảnh:

- **Mạng.** Egress chỉ được phép tới địa chỉ mà API đã phân giải và ghim, dạng `<ip>/32` trên TCP 443. Không có
  DNS, không có ingress, và không có đường tới dải mạng của cluster hay metadata endpoint.
- **Danh tính.** Pod không có service-account token và không có Secret.
- **Trình duyệt.** Sandbox của Chromium luôn bật và worker từ chối chạy bằng root.

Để bật thumbnail cho API tự host:

1. Áp dụng `deploy/thumbnail` từ [`saasvn/tose-app`](https://github.com/saasvn/tose-app) lên cluster. Thư mục này tạo namespace,
   policy default-deny, quota và một Role. Gán Role đó cho danh tính trong kubeconfig của API.
2. Publish image build từ `images/thumbnail-shot` và đặt `THUMBNAIL_IMAGE` cho API.
3. Nếu seccomp profile mặc định của container runtime chặn user namespace (containerd chặn với pod không có
   capability), hãy cài một profile cục bộ trên node cho phép chúng và đặt `THUMBNAIL_SECCOMP_PROFILE` là đường dẫn
   của profile đó trong thư mục seccomp của kubelet.

Nếu chưa đặt `THUMBNAIL_IMAGE`, việc chụp bị bỏ qua và ghi log với tiền tố `[screenshot]`. Deploy không bị ảnh hưởng.
Nếu đã đặt image nhưng thiếu namespace hoặc Role, mỗi lần deploy ghi log các lần chụp thất bại và vẫn thành công.

Cluster do workspace sở hữu hiện không có thumbnail.

Chi tiết vận hành, gồm giới hạn của pod và cách kiểm tra policy, nằm trong `docs/operations.md` (mục "Project
thumbnails") và `deploy/thumbnail/README.md` của `saasvn/tose-app`.

## Tài liệu liên quan

- [Xác thực](/vi/api/authentication)
- [Mã lỗi](/vi/api/errors)
