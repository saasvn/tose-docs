# Xác thực API

Mỗi request tới TOSE API mang đúng một credential. API kiểm tra theo thứ tự sau:

| Thứ tự | Credential | Cách gửi | Dùng bởi |
|--------|------------|----------|----------|
| 1 | API key | Header `X-API-Key: tose_sk_...` | Script, CI, CLI |
| 2 | Session token | Header `Authorization: Bearer <token>` | Ứng dụng hoạt động thay mặt người dùng đã đăng nhập |
| 3 | Session token | Cookie `tose_token` | Phiên trình duyệt |

## API key

```bash
curl -sS https://api.tose.sh/api/workspaces \
  -H "X-API-Key: $TOSE_API_KEY"
```

Một API key thuộc về một workspace. Trên mọi route có `{slug}`, key chỉ hoạt động với workspace
của nó, slug khác trả về `403 forbidden`. Key đã thu hồi hoặc hết hạn trả về `401 unauthenticated`.

### Tạo key

1. Đăng nhập vào [TOSE Dashboard](https://tose.sh).
2. Mở **Settings** > **API Keys**.
3. Chọn **Create New API Key** và sao chép key. Key bắt đầu bằng `tose_sk_`.
4. Lưu key trong secret manager hoặc biến môi trường.

```bash
export TOSE_API_KEY=tose_sk_xxxxxxxxxxxx
```

::: warning
Không commit API key. Không đặt key vào URL, query string, dòng log hoặc code phía client.
:::

## Session token

Ứng dụng hoạt động thay mặt người dùng đã đăng nhập gửi session token trong
`Authorization: Bearer <token>`. Trình duyệt dùng cookie `tose_token`, chứa cùng token đó.

## Không đặt credential trong URL

URL bị ghi vào log của proxy, lịch sử trình duyệt và công cụ analytics, nên API từ chối credential
trong URL. Request bị trả về `400` với mã `credentials_in_url`, trước cả bước xác thực, khi query
string có một trong các thứ sau:

- tham số `api_key` hoặc `access_token` (kiểm tra cũng áp dụng cho `apikey` và `x-api-key`, không phân biệt hoa thường);
- bất kỳ giá trị nào bắt đầu bằng `tose_sk_`.

```bash
# Bị từ chối: 400 credentials_in_url
curl "https://api.tose.sh/api/workspaces?api_key=tose_sk_xxxx"

# Đúng
curl https://api.tose.sh/api/workspaces -H "X-API-Key: $TOSE_API_KEY"
```

```json
{
  "error": "Credentials must not be sent in the URL. Send the API key in the X-API-Key header.",
  "code": "credentials_in_url",
  "message": "Credentials must not be sent in the URL. Send the API key in the X-API-Key header.",
  "request_id": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "retryable": false,
  "doc_url": "https://docs.tose.sh/api/errors#credentials_in_url"
}
```

API không dùng secret trong request bị từ chối, nhưng secret đó đã đi qua một URL. Hãy xoay (rotate)
mọi key đã bị gửi theo cách này.

Access log của API ghi đường dẫn request chứ không ghi query string, nên các token ngắn hạn mà một
số luồng vẫn mang trong URL không xuất hiện trong log.

## WebSocket

Các endpoint WebSocket xác thực ngay trên request HTTP upgrade, bằng cùng header hoặc cookie.

Desktop gateway đọc session token từ danh sách `Sec-WebSocket-Protocol`
(`tose.desktop.token.{token}`). Tham số `?token=` là đường cũ mà API vẫn chấp nhận cho client cũ.
Đừng dùng nó trong code mới. Xem [API Desktops](/api/desktops#gateway) (tiếng Anh).

## Lỗi xác thực

| Status | Mã | Nguyên nhân | Cách xử lý |
|--------|----|-------------|------------|
| 400 | `credentials_in_url` | Credential nằm trong query string | Chuyển sang header |
| 401 | `unauthenticated` | Không có credential, hoặc không hợp lệ, đã thu hồi, hết hạn | Gửi key hoặc token hợp lệ |
| 403 | `forbidden` | Credential không được truy cập workspace hoặc hành động này | Dùng key của workspace đó |
| 403 | `insufficient_scope` | Key thiếu scope cần thiết | Tạo key có scope đó |

Xem [Mã lỗi](/vi/api/errors) về envelope.

## CI/CD

```yaml
- name: Deploy
  env:
    TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
  run: tose up
```

CLI đọc `TOSE_API_KEY` từ môi trường. Xem [Cấu hình](/vi/guide/configuration).
