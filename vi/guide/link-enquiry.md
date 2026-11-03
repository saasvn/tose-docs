# Liên kết yêu cầu trước đó với tài khoản

Nếu bạn đã gửi yêu cầu qua [tose.sh](https://tose.sh) trước khi đăng ký, bạn có thể liên kết yêu cầu đó với tài khoản TOSE của mình. Việc liên kết là tùy chọn và chỉ diễn ra khi bạn đồng ý.

## Liên kết làm gì

Liên kết cho tose.sh biết yêu cầu bạn gửi trước đó thuộc về tài khoản TOSE của bạn, để đội ngũ biết yêu cầu đến từ tài khoản nào. TOSE không bao giờ tự khớp email để liên kết. Yêu cầu chỉ được liên kết khi bạn tick ô đồng ý và bấm nút.

## Tìm ở đâu

- **Trang Projects:** thẻ "Link an earlier enquiry" hiện cho đến khi bạn dùng xong.
- **Settings của workspace:** thẻ này vẫn còn, để bạn rút lại ủy quyền sau này.

Thẻ bị ẩn khi tài khoản của bạn hoặc bản cài đặt TOSE chưa hỗ trợ liên kết.

## Ai dùng được

Chỉ tài khoản có email **đã được nhà cung cấp đăng nhập xác minh** mới liên kết được:

| Cách đăng nhập | Liên kết được? |
|---|---|
| Google, với email đã xác minh | Có |
| GitHub, với địa chỉ nằm trong danh sách đã xác minh của GitHub | Có |
| Email và mật khẩu | Không. Các tài khoản này nhận `409 email_not_verified`. |

Việc kiểm tra chạy ở mỗi lần đăng nhập Google hoặc GitHub. Nếu nhà cung cấp không còn báo email của bạn là đã xác minh, thẻ sẽ bị ẩn cho đến khi nó báo lại.

## Dữ liệu nào được chia sẻ

| Gửi tới tose.sh | Không bao giờ gửi |
|---|---|
| Mã băm một chiều có khóa của email | Địa chỉ email của bạn |
| Account id không mang thông tin của bạn | Tên, username hay dữ liệu hồ sơ khác |
| Phiên bản đồng ý bạn đã chấp nhận | Project, workspace, thanh toán hay mức sử dụng |

TOSE không lưu bản sao yêu cầu, thông tin liên hệ hay email của bạn cho tính năng này. TOSE chỉ giữ thời điểm và phiên bản đồng ý làm bằng chứng bạn đã chấp thuận.

## Liên kết một yêu cầu

1. Đăng nhập bằng Google hoặc GitHub.
2. Mở trang **Projects**, hoặc **Settings** trong workspace.
3. Trong "Link an earlier enquiry", tick ô đồng ý.
4. Bấm **Link my enquiry**.

Thẻ sẽ hiện **Linked.** Nếu không kết nối được tose.sh, thẻ hiện "Last attempt failed. You can try again." TOSE cũng thử gửi lại ở nền (mỗi 5 phút, tối đa 20 lần), và bạn có thể bấm nút lần nữa.

tose.sh trả lời giống nhau dù có tìm thấy yêu cầu khớp với mã băm của bạn hay không, nên việc liên kết không làm lộ ai đã liên hệ tose.sh.

## Rút lại ủy quyền

Bấm **Withdraw my authorization** trên thẻ (nút này hiện ở Settings khi còn một ủy quyền).

- Liên kết bị gỡ trên tose.sh và tài khoản này không liên kết thêm gì nữa.
- Việc rút lại luôn thành công. Nếu không kết nối được tose.sh, thẻ hiện "Authorization withdrawn. The link on tose.sh is being removed." và TOSE thử gỡ lại ở nền (mỗi 5 phút, tối đa 20 lần).
- Nếu bạn ủy quyền lại, việc gỡ đang chờ sẽ bị hủy.

## Xóa chính yêu cầu đó

Rút lại ủy quyền chỉ gỡ liên kết, không xóa yêu cầu. Để xóa yêu cầu, hãy viết tới [privacy@tose.sh](mailto:privacy@tose.sh).

## Dành cho lập trình viên

Liên kết là tính năng ở cấp tài khoản và chỉ dùng được bằng session. API key và OAuth grant, gồm cả CLI và MCP, không gọi được các route này, và không có lệnh CLI nào cho tính năng này.

| Method và path | Mục đích |
|---|---|
| `GET /api/account/lead-link` | Trạng thái hiện tại (`none`, `pending`, `linked`, `failed` hoặc `revoked`), điều kiện đủ và nội dung đồng ý |
| `POST /api/account/lead-link` | Ủy quyền. Gửi `application/json` với `authorize: true` và `consent_version` hiện tại (`415` với content type khác) |
| `DELETE /api/account/lead-link` | Rút lại (`204`) |

| Lỗi | Ý nghĩa |
|---|---|
| `400 consent_required` | Request không có `authorize: true` |
| `400 consent_outdated` | Nội dung đồng ý đã đổi. Tải lại và đồng ý lại |
| `409 email_not_verified` | Email tài khoản chưa được nhà cung cấp đăng nhập xác minh |
| `502 lead_signal_failed` | Không kết nối được tose.sh. Lần gửi sẽ được thử lại |
| `503 lead_link_unavailable` | Bản cài đặt này chưa bật tính năng liên kết |

Với người tự vận hành (self-hosting): tính năng này tắt trừ khi cả `LEADS_HASH_SECRET`, `LEADS_LINK_URL` và `LEADS_LINK_TOKEN` đều được đặt, và các giá trị phải khớp với cấu hình của tose-web.
