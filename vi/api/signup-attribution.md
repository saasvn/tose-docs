# Attribution chiến dịch khi đăng ký

TOSE có thể lưu nguồn của một tài khoản mới, dựa trên các tham số chiến dịch ẩn danh được gửi khi
tạo tài khoản. Trang này liệt kê các tham số được chấp nhận, cách kiểm tra giá trị và những gì không
bao giờ được lưu.

## Áp dụng ở đâu

| Điểm vào | Cách gửi tham số |
|---|---|
| `POST /auth/register` | Trường trong JSON body |
| `GET /auth/github` | Query string |
| `GET /auth/google` | Query string |

## Tham số được chấp nhận

| Tham số | Ý nghĩa |
|---|---|
| `utm_source` | Lượt truy cập đến từ đâu |
| `utm_medium` | Loại kênh |
| `utm_campaign` | Tên chiến dịch |
| `utm_term` | Từ khóa tìm kiếm |
| `utm_content` | Biến thể quảng cáo hoặc liên kết |
| `ref` | Nhãn tham chiếu dạng văn bản tự do |

Mọi tham số khác đều bị bỏ qua.

```bash
curl -X POST https://api.tose.sh/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "username": "you",
    "password": "a-strong-password",
    "utm_source": "newsletter",
    "utm_medium": "email",
    "utm_campaign": "spring-launch"
  }'
```

### `ref` khi đăng nhập OAuth

Ở `GET /auth/github` và `GET /auth/google`, `ref` là **mã giới thiệu** (chương trình referral). Để
gửi kèm nhãn attribution, hãy truyền nó bằng `attr_ref`. Nếu `attr_ref` thiếu hoặc không hợp lệ,
`ref` cũng được đọc làm nhãn attribution. Ở `POST /auth/register`, mã giới thiệu là trường riêng
`referral_code`, nên `ref` ở đó chỉ là attribution.

## Cách kiểm tra giá trị

Mỗi giá trị được kiểm tra riêng, nên một giá trị không hợp lệ không làm mất các giá trị hợp lệ.

- Chỉ văn bản thuần, tối đa 64 ký tự, bắt đầu bằng chữ cái hoặc chữ số. Cho phép chữ cái, chữ số,
  dấu cách và `_ . + -`.
- Bị loại: URL, địa chỉ email, UUID, số điện thoại và giá trị giống token (chuỗi chữ và số liền nhau
  quá dài, hoặc id trông ngẫu nhiên).

Giá trị bị loại không gây lỗi. Yêu cầu vẫn thành công và giá trị đó đơn giản là không được lưu.

## Giá trị được xử lý thế nào

- Lưu một lần, lúc tạo tài khoản. Lần chạm đầu tiên được giữ.
- Các lần đăng nhập sau không bao giờ thay đổi chúng.
- API không trả chúng về.
- Với OAuth, các giá trị đi trong `state` của luồng đăng nhập và được kiểm tra lại ở bước callback.

## Ranh giới quyền riêng tư

- Lead id, token xóa và thông tin liên hệ không bao giờ được nhận qua đường này.
- Tài khoản không bao giờ được ghép với lead marketing bằng địa chỉ email.
- Việc liên kết tài khoản với lead vẫn là thao tác của nhân viên, chỉ thực hiện sau khi người đó xác nhận.

## Liên quan

- [Xác thực](/vi/api/authentication)
