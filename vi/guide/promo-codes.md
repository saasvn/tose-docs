# Mã khuyến mãi và credit thưởng

Mã khuyến mãi giảm số tiền bạn trả khi nạp ví, hoặc cộng thêm **credit thưởng** vào lần nạp đó. Bạn nhập mã khi nạp tiền vào ví workspace. Trang này mô tả luồng sử dụng và các quy tắc. Các endpoint nằm ở [API mã khuyến mãi](/vi/api/promo-codes).

## Các loại mã {#kinds}

| Loại | Bạn trả | Ví nhận được |
|------|---------|--------------|
| `percent` | Số tiền trừ đi một tỷ lệ phần trăm | **Toàn bộ** số tiền bạn chọn |
| `fixed` | Số tiền trừ đi một khoản cố định bằng USD | **Toàn bộ** số tiền bạn chọn |
| `bonus` | Toàn bộ số tiền | Toàn bộ số tiền, cộng thêm credit khuyến mãi |

Giảm giá không làm giảm số credit ví nhận được (trừ một ngoại lệ, xem [Quy tắc](#rules)): nạp $50 với mã `percent` giảm 20% thì bạn trả $40 và nhận $50. Khoản thanh toán sau giảm không được thấp hơn mức tối thiểu của cổng thanh toán ($1.00 với Polar, 10,000 VND với SePay); mã nào đẩy khoản thanh toán xuống dưới mức này sẽ bị từ chối.

## Dùng mã {#use-a-code}

1. Mở trang **Billing** của workspace và chọn **Top up**.
2. Chọn loại tiền (USD qua Polar, VND qua SePay) và số tiền.
3. Gõ mã vào ô **Promo code (optional)** rồi chọn **Apply**. Trang hiện số tiền bạn sẽ trả. Với mã bonus, trang còn hiện số credit thưởng và số ngày có hiệu lực. Bước Apply chỉ xem trước, chưa giữ chỗ mã.
4. Tiếp tục thanh toán. Mã được kiểm tra lại và giữ chỗ khi khoản thanh toán được tạo.

Mã không phân biệt hoa thường. Mỗi khoản thanh toán dùng một mã.

### Liên kết điền sẵn mã

`https://<app-host>/billing?code=MA-CUA-BAN` mở trang billing của workspace của chính bạn (workspace đầu tiên bạn sở hữu, nếu không có thì workspace đầu tiên bạn tham gia), mở cửa sổ nạp tiền và điền sẵn mã. Liên kết không cần slug của workspace nên dùng được trong email và newsletter. Nếu chưa đăng nhập, bạn sẽ được yêu cầu đăng nhập trước. Muốn vào một workspace cụ thể, dùng `https://<app-host>/w/<workspace-slug>/billing?code=MA-CUA-BAN`.

### Vì sao mã bị từ chối {#why-a-code-can-be-refused}

Mã bị từ chối không làm thay đổi khoản thanh toán. Thông báo cho biết lý do:

| `code` | Ý nghĩa |
|--------|---------|
| `PROMO_NOT_FOUND` | Mã không tồn tại. |
| `PROMO_INACTIVE` | Mã đã bị vô hiệu hóa. |
| `PROMO_NOT_STARTED` | Mã chưa có hiệu lực. |
| `PROMO_EXPIRED` | Mã đã hết hạn. |
| `PROMO_NOT_APPLICABLE` | Mã không áp dụng cho loại thanh toán này. |
| `PROMO_MIN_AMOUNT` | Khoản thanh toán thấp hơn mức tối thiểu của mã. Thông báo nêu mức đó. |
| `PROMO_FIRST_TOPUP_ONLY` | Mã chỉ có hiệu lực cho lần nạp đầu tiên của workspace. |
| `PROMO_BELOW_MINIMUM` | Sau khi giảm, khoản thanh toán sẽ thấp hơn mức tối thiểu của cổng thanh toán. |
| `PROMO_EXHAUSTED` | Mã đã dùng hết lượt. |
| `PROMO_USER_LIMIT` | Bạn đã dùng mã này rồi. |
| `PROMO_CAMPAIGN_USED` | Bạn hoặc workspace này đã dùng một mã khác của cùng chương trình. |

## Quy tắc {#rules}

- **Giới hạn.** Mã có thể có mức tối thiểu, quy tắc chỉ cho lần nạp đầu, ngày bắt đầu và ngày hết hạn, tổng số lượt dùng và số lượt dùng cho mỗi người. Các mã thuộc cùng một **chiến dịch** (campaign) chỉ được dùng một lần cho mỗi người và một lần cho mỗi workspace, tính chung.
- **Một mã cho mỗi khoản thanh toán, không cộng dồn.** Khoản thanh toán dùng mã không tạo [hoa hồng giới thiệu](/vi/guide/referral). Nếu mã bị từ chối khi thanh toán hoàn tất (xem bên dưới), khoản đó vẫn tạo hoa hồng như bình thường.
- **Mặc định chỉ áp dụng cho nạp ví.** Mã chỉ áp dụng cho việc mở khóa template (Dewee, GoClaw) khi nhà vận hành cho phép. Credit thưởng không bao giờ áp dụng cho việc mở khóa template.
- **Thanh toán bỏ dở.** Nếu bạn bắt đầu thanh toán với một mã nhưng không hoàn tất, khoản thanh toán tiếp theo dùng cùng mã (hoặc mã cùng chiến dịch) sẽ thay thế khoản cũ. Thanh toán bỏ dở của chính bạn không khóa mã dùng một lần đối với bạn. Thanh toán chưa hoàn tất của người khác dùng cùng mã, kể cả đồng đội trong workspace với mã của một chiến dịch, vẫn tính vào giới hạn của mã cho đến khi hoàn tất hoặc bị thay thế.
- **Mã có thể bị từ chối khi thanh toán hoàn tất.** Các quy tắc được kiểm tra lại lúc hoàn tất. Nếu mã không còn hợp lệ (ví dụ một lần nạp khác đã hoàn tất trước với mã chỉ cho lần nạp đầu, hoặc một khoản bỏ dở được hoàn tất muộn), phần giảm giá bị bỏ và ví được cộng đúng số tiền bạn thực trả.
- **Lần nạp đầu.** "Đầu" nghĩa là workspace chưa có lần nạp nào đã hoàn tất hoặc đã hoàn tiền trước đó. Workspace có lần nạp đầu đã được hoàn tiền không còn dùng được mã chỉ cho lần nạp đầu.

## Credit thưởng {#bonus-credit}

Mã `bonus` cộng credit khuyến mãi vào ví **sau khi** thanh toán hoàn tất. Lịch sử ví hiện khoản này là giao dịch `promo_credit` kèm ngày hết hạn.

- **Dùng trước.** Mọi khoản trừ ví đều tiêu credit khuyến mãi trước, rồi mới đến credit đã nạp; khoản (grant) sắp hết hạn nhất được dùng trước. Gồm phí compute và lưu trữ tính theo giờ, phí CI job và khoản lưu trữ tồn đọng được thu khi bạn nạp tiền. Referral reversal và `admin_adjust` âm cố ý không tiêu credit thưởng.
- **Không tính vào bậc giá.** Credit thưởng chưa dùng bị loại khỏi số dư quyết định [giá compute](/vi/guide/pricing#compute) của bạn, nên không thể đưa bạn sang bậc giá rẻ hơn.
- **Có hạn dùng.** Khi credit qua ngày hết hạn (`credit_valid_days` của mã, tính từ lúc thanh toán hoàn tất), phần còn lại bị thu hồi bằng giao dịch `promo_expired`. Phần đã dùng cho phí sử dụng thì giữ nguyên. Ví không bao giờ xuống dưới 0 vì việc này.
- **Đi theo số dư.** Khi xoá workspace hoặc chuyển số dư sang ví khác, các credit thưởng đang hoạt động đi theo số dư sang ví nhận. Chúng vẫn hết hạn, và vẫn bị thu hồi khi hoàn tiền toàn bộ, ngay trong ví nhận.
- **Hoàn tiền.** Hoàn tiền toàn bộ khoản thanh toán sẽ giải phóng mã và thu hồi credit thưởng chưa dùng (giao dịch `promo_revoked`). Hoàn tiền một phần giữ nguyên mã và credit.
- **Không phải tiền mặt.** Credit thưởng chỉ dùng để trả phí sử dụng TOSE và không thể rút.

::: warning Hoàn tiền SePay
SePay không gửi thông báo hoàn tiền, nên khoản thanh toán SePay được hoàn không được giải phóng tự động: mã và credit thưởng giữ nguyên cho đến khi TOSE xử lý khoản hoàn. Hoàn tiền Polar được xử lý tự động.

Operator nền tảng có thể giải phóng thủ công một lượt dùng SePay, xem [Vận hành mã giảm giá](/vi/api/promo-codes#admin-release).
:::

## Ra mắt AgentKit × TOSE {#agentkit-launch}

Trong đợt ra mắt AgentKit, mỗi khách hàng nhận một mã riêng dạng `AKTOSE-XXXX-XXXX` để nhận **$100 credit thưởng** cho lần nạp đầu tiên của workspace:

| Điều khoản | Giá trị |
|------------|---------|
| Loại mã | `bonus` |
| Nạp tối thiểu | $20 |
| Áp dụng cho | Lần nạp đầu tiên của workspace (lần nạp đã hoàn tiền vẫn tính là đã nạp) |
| Số lượt dùng | Một lượt cho mỗi mã, một lượt cho mỗi người |
| Hạn dùng credit | 90 ngày kể từ lúc thanh toán |

Điều khoản của mã luôn hiển thị khi bạn bấm Apply, nên nếu khác với bảng này hãy tin phần xem trước. Nếu mã đã dùng, đã hết hạn hoặc đã được bạn dùng rồi, thông báo sẽ nêu lý do.

## Dành cho nhà vận hành nền tảng {#for-operators}

Nhà vận hành tạo và quản lý mã qua REST API của admin console hoặc qua các công cụ MCP chỉ admin nền tảng mới thấy. Xem [Vận hành mã giảm giá](/vi/api/promo-codes#admin).

## Liên quan {#related}

- [API mã khuyến mãi](/vi/api/promo-codes)
- [Bảng giá](/vi/guide/pricing)
- [Chương trình giới thiệu](/vi/guide/referral)
