# Hộp thư thông báo

Hộp thư thông báo liệt kê các ops event của workspace cho từng thành viên đã đăng nhập: uptime lỗi, kết quả deployment, sự kiện billing và backup. Đây là chế độ xem chỉ đọc của chính các event nuôi incident và cảnh báo bên ngoài. Mỗi thành viên có trạng thái đã đọc và tùy chọn riêng.

Mở **Notifications** ở thanh bên của workspace trên dashboard.

## Hộp thư hiển thị gì

- Event được liệt kê mới nhất trước. Các event lặp lại của cùng một incident hiện thành một dòng, với event mới nhất.
- Mỗi dòng có đối tượng `event` (`source`, `kind`, `severity`, `subject`, `summary`, `evidence` đã che thông tin nhạy cảm), `read_at` và `acknowledged_at` của riêng bạn (không có cho đến khi được đặt) và `deliveries`.
- `deliveries` cho biết trạng thái hiện tại của cảnh báo bên ngoài với event đang hiển thị: `channel` (`email`, `discord`, `webhook` hoặc `other`), `status` (`pending`, `sending`, `sent` hoặc `failed`), `attempts` và `updated_at`. Không bao giờ có người nhận, id sink nội bộ hay nội dung lỗi của nhà cung cấp.
- Trạng thái đã đọc và đã xác nhận là theo từng thành viên. Bạn không thấy trạng thái của người khác, và bản thân event không bị thay đổi.

## Đánh dấu đã đọc hoặc đã xác nhận

Đánh dấu đã đọc hoặc đã xác nhận là idempotent: gọi lại vẫn giữ thời điểm ban đầu. Xác nhận một event cũng đánh dấu nó đã đọc nếu trước đó chưa đọc.

## Tùy chọn

Mỗi thành viên đặt được, theo từng workspace:

| Cài đặt | Ý nghĩa |
|---------|---------|
| `inbox_enabled` | Bật hoặc tắt hộp thư trong ứng dụng. Mặc định `true` |
| `min_severity` | Chỉ hiện event từ mức `info`, `warning` hoặc `critical` trở lên. Mặc định `info` |
| `muted_kinds` | Các loại event cần ẩn, ví dụ `uptime.down`. Tối đa 50 loại, không trùng |

Các cài đặt này chỉ đổi hộp thư của bạn. Chúng không đổi cảnh báo qua email, Discord hay webhook, nên tắt một loại event không thể làm câm cảnh báo critical.

## API

Mọi route nằm dưới `/api/workspaces/{slug}` và cần phiên đăng nhập là thành viên workspace. **API key và ứng dụng kết nối bị từ chối với `403`.**

| Method và đường dẫn | Mô tả |
|---------------------|-------|
| `GET /notifications?limit=&cursor=` | Liệt kê hộp thư. `limit` mặc định và tối đa là 100. Phản hồi `{ "notifications": [...], "next_cursor": "..." }`; `next_cursor` là `null` ở trang cuối |
| `POST /notifications/{event_id}/read` | Đánh dấu một event đã đọc. `204` |
| `POST /notifications/{event_id}/ack` | Xác nhận một event. `204` |
| `GET /notifications/preferences` | Đọc tùy chọn của bạn |
| `PUT /notifications/preferences` | Thay thế tùy chọn. Gửi đủ ba trường: `inbox_enabled`, `min_severity`, `muted_kinds` |

```bash
curl "https://api.tose.sh/api/workspaces/$WS/notifications?limit=20" \
  -H "Cookie: tose_token=$TOSE_SESSION"
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| `400` | Tùy chọn không hợp lệ (severity lạ, quá 50 loại, loại trùng hoặc sai định dạng, thiếu trường) hoặc `cursor` không hợp lệ |
| `401` | Chưa đăng nhập |
| `403` | Người gọi là API key hoặc ứng dụng kết nối |
| `404` | Không phải thành viên workspace, hoặc event không tồn tại trong workspace |

## Liên quan

- [Uptime monitor](/vi/api/projects#uptime)
- [Health gate sau deploy](/vi/api/projects#health-gate)
- [Lỗi](/vi/api/errors)
