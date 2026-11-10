# Liên kết yêu cầu trước đó với tài khoản

Nếu bạn đã gửi yêu cầu qua [tose.sh](https://tose.sh) trước khi đăng ký, bạn có thể liên kết yêu cầu đó với tài khoản TOSE của mình. Việc liên kết là tùy chọn và chỉ diễn ra khi bạn đồng ý.

## Liên kết làm gì

Liên kết cho tose.sh biết yêu cầu bạn gửi trước đó thuộc về tài khoản TOSE của bạn, để đội ngũ biết yêu cầu đến từ tài khoản nào. TOSE không bao giờ tự khớp email để liên kết. Yêu cầu chỉ được liên kết khi bạn tick ô đồng ý và bấm nút.

## Tìm ở đâu

- **Trang Projects:** thẻ "Link an earlier enquiry" hiện cho đến khi bạn dùng xong.
- **Settings của workspace:** thẻ này vẫn còn, để bạn rút lại ủy quyền sau này.

Thẻ bị ẩn khi tài khoản của bạn hoặc bản cài đặt TOSE chưa hỗ trợ liên kết.

## Ai dùng được

Chỉ tài khoản có email **đã xác minh** mới liên kết được:

| Cách đăng nhập | Liên kết được? |
|---|---|
| Google, với email đã xác minh | Có |
| GitHub, với địa chỉ nằm trong danh sách đã xác minh của GitHub | Có |
| Email và mật khẩu, sau khi [xác nhận email](/vi/guide/installation#confirm-your-email) | Có |
| Email và mật khẩu, trước khi xác nhận | Không. Các tài khoản này nhận `409 email_not_verified`. |

Việc kiểm tra chạy ở mỗi lần đăng nhập Google hoặc GitHub. Nếu nhà cung cấp không còn báo email của bạn là đã xác minh, thẻ sẽ bị ẩn trên trang Projects và bạn không thể ủy quyền lại cho đến khi nó báo lại. Nếu bạn đã có một ủy quyền, thẻ ở Settings vẫn hiện để bạn rút lại.

## Dữ liệu nào được chia sẻ

| Gửi tới tose.sh | Không bao giờ gửi |
|---|---|
| Mã băm một chiều có khóa của email | Địa chỉ email của bạn |
| Account id không mang thông tin của bạn | Tên, username hay dữ liệu hồ sơ khác |
| Phiên bản đồng ý bạn đã chấp nhận và thời điểm bạn đồng ý | Project, workspace, thanh toán hay mức sử dụng |
| Dấu hiệu cho biết chính bạn đã xác nhận (`user_confirmed`) | |

TOSE không lưu bản sao yêu cầu, thông tin liên hệ hay email của bạn cho tính năng này. TOSE giữ thời điểm và phiên bản đồng ý làm bằng chứng bạn đã chấp thuận, cùng mã băm email đã gửi, để việc rút lại có thể gỡ đúng liên kết đó ngay cả khi email tài khoản đã đổi.

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
- Sau khi rút lại, thẻ hiện "Authorization withdrawn. The link on tose.sh is being removed."
- Việc rút lại vẫn thành công khi không kết nối được tose.sh: TOSE thử gỡ lại ở nền (mỗi 5 phút, tối đa 20 lần).
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
| `409 email_not_verified` | Email tài khoản chưa được xác minh. Hãy xác nhận trong Settings, hoặc đăng nhập bằng nhà cung cấp đã xác minh nó |
| `502 lead_signal_failed` | Không kết nối được tose.sh. Lần gửi sẽ được thử lại |
| `503 lead_link_unavailable` | Bản cài đặt này chưa bật tính năng liên kết |

Với người tự vận hành (self-hosting): tính năng này tắt trừ khi cả `LEADS_HASH_SECRET` (từ 16 ký tự), `LEADS_LINK_URL` (`https`, là URL `/api/leads/link` của tose-web) và `LEADS_LINK_TOKEN` (từ 32 ký tự) đều được đặt. Secret và token phải bằng giá trị cấu hình trong tose-web (`TOSE_LEADS_HASH_SECRET`, `TOSE_LEADS_LINK_TOKEN`). Với `APP_ENV=production`, server từ chối khởi động nếu chỉ đặt một số biến, hoặc giá trị quá ngắn, hoặc URL không phải `https`.
