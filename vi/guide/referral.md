# Chương trình giới thiệu

Chương trình giới thiệu của TOSE trả lại một phần số tiền thanh toán của người bạn giới thiệu dưới dạng **credit trong ví TOSE**. Trang này mô tả những gì nền tảng làm hiện nay. Với quy tắc đang được sửa, trang ghi rõ và dẫn tới issue theo dõi.

::: warning Credit, không phải tiền mặt
Phần thưởng giới thiệu được cộng vào ví workspace dưới dạng credit để trả phí sử dụng TOSE. TOSE không có chức năng chi trả tiền mặt cho credit giới thiệu.
:::

## Các hạng hoa hồng {#cac-hang-hoa-hong}

Hạng của bạn dựa trên **doanh số giới thiệu ròng**: các khoản thanh toán của người bạn giới thiệu đã tạo hoa hồng, trừ phần đã hoàn tiền của các khoản đó.

| Hạng | Tỷ lệ hoa hồng | Đạt hạng khi doanh số giới thiệu |
|------|----------------|-----------------------------------|
| Scout | 20% | Từ $0 (ai cũng bắt đầu ở đây) |
| Builder | 30% | Từ $3,000 (bao gồm mốc) |
| Ambassador | 40% | **Lớn hơn** $5,000 (không bao gồm mốc: đúng $5,000 vẫn là Builder) |

Hoa hồng dùng hạng của bạn **tại thời điểm khoản thanh toán của người được giới thiệu hoàn tất**. Hạng được tính từ doanh số ròng *trước* khoản thanh toán đó, nên khoản thanh toán vượt ngưỡng vẫn nhận tỷ lệ cũ. Việc đổi hạng sau này không bao giờ tính lại hoa hồng đã ghi credit.

Tỷ lệ và ngưỡng là giá trị chính sách do backend nắm giữ. Đừng hard-code. Các trường `tiers` và `rank` của [API tổng quan giới thiệu](#api-tong-quan-gioi-thieu) luôn trả giá trị đang áp dụng.

## Cách một lượt giới thiệu hoạt động

1. **Chia sẻ link.** Mã giới thiệu được tạo lần đầu bạn mở trang Referrals của một workspace (hoặc gọi API tổng quan); trước đó bạn chưa có mã. Link có dạng `https://<app-host>/login?ref=MA_CUA_BAN`. URL chính xác là trường `profile.referral_url` của API tổng quan; trang Referrals trong dashboard workspace hiển thị link kèm nút sao chép.
2. **Người dùng mới đăng ký.** Mã đi qua đăng ký bằng email (`referral_code` trong body) và qua luồng chuyển hướng đăng nhập GitHub, Google. Trang đăng nhập cũng nhớ mã trong cookie `tose_ref` và bộ nhớ trình duyệt để mã không mất khi chuyển hướng.
3. **Mối quan hệ được ghi nhận.** Mỗi người được giới thiệu có đúng một relationship, gắn với mã của bạn và *workspace thụ hưởng*, tức workspace có ví nhận credit của bạn (mặc định là workspace có trang Referrals bạn mở đầu tiên, nếu bạn sở hữu; nếu không thì workspace cũ nhất bạn sở hữu, rồi tới workspace cũ nhất bạn là thành viên).
4. **Người được giới thiệu thanh toán.** Khi một khoản thanh toán hoàn tất, TOSE tạo một hoa hồng cho khoản đó và cộng vào ví thụ hưởng dưới dạng giao dịch `referral_credit`.

### Điều kiện tính hoa hồng

- Chỉ các khoản thanh toán **Polar và SePay đã hoàn tất** mới tạo hoa hồng. Credit khuyến mãi, điều chỉnh của admin và bonus đăng ký cũ không bao giờ tạo hoa hồng.
- Hoa hồng là `số tiền thanh toán × tỷ lệ`, tính bằng cent và làm tròn xuống. Kết quả bằng 0 cent thì không tạo hoa hồng.
- Mỗi khoản thanh toán tạo **tối đa một** hoa hồng. Webhook gửi hai lần không ghi credit hai lần.
- Mỗi người dùng chỉ có **một** người giới thiệu. Mã thứ hai không thay thế mã đầu.
- Tự dùng mã của chính mình sẽ bị bỏ qua (ghi sự kiện `referral_rejected` với lý do `self_referral`). Mã không tồn tại cũng bị bỏ qua.

### Trạng thái hoa hồng

| Trạng thái | Ý nghĩa |
|------------|---------|
| `credited` | Hoa hồng đã vào ví và chưa có khoản nào bị hoàn tiền. |
| `partially_reversed` | Một phần khoản thanh toán đã được hoàn tiền nên phần hoa hồng tương ứng đã bị thu hồi. |
| `reversed` | Toàn bộ khoản thanh toán đã được hoàn tiền và toàn bộ hoa hồng đã bị thu hồi. |

Trang Referrals hiển thị cho từng hoa hồng tỷ lệ thực sự đã áp dụng, trạng thái và số tiền đã đảo. Trạng thái `pending` không được tạo ra.

## Hoàn tiền và các trường hợp xử lý thủ công {#hoan-tien-va-xu-ly-thu-cong}

- **Hoàn tiền Polar tự động.** Khi Polar hoàn tiền một khoản thanh toán, TOSE thu hồi phần hoa hồng tương ứng bằng một giao dịch `referral_reversal` âm trong ví thụ hưởng. Sự kiện hoàn tiền gửi lại không làm thay đổi gì.
- **Hạng theo doanh số ròng.** Doanh số ròng là thanh toán trừ hoàn tiền, nên một khoản hoàn tiền có thể làm hạng của bạn giảm cho các khoản thanh toán *sau đó*. Hoa hồng đã ghi credit không bao giờ bị tính lại.
- **Việc đảo hoa hồng không bao giờ làm ví âm.** Chỉ trừ tối đa số dư dương của ví (không trừ gì nếu số dư đã bằng 0 hoặc âm). Nếu số dư thấp hơn số cần thu hồi, TOSE chịu phần thiếu; workload của bạn không bị tạm dừng hay thu hồi vì việc này.
- **Chưa tự động:** hoàn tiền SePay, và chargeback của cả hai nhà cung cấp, được **nhân viên vận hành TOSE xử lý thủ công**. Cho tới khi họ xử lý, hoa hồng vẫn ở trạng thái credited. Điều chỉnh thủ công chỉ đổi ví: không đổi bản ghi hoa hồng, doanh số ròng hay hạng của bạn.

## Hạn chế đã biết {#han-che-da-biet}

| Khía cạnh | Hiện nay | Theo dõi |
|-----------|----------|----------|
| Hoàn tiền SePay và chargeback | Chưa tự động. Nhân viên vận hành xử lý thủ công (xem [Hoàn tiền và các trường hợp xử lý thủ công](#hoan-tien-va-xu-ly-thu-cong)). | [tose-app#134](https://github.com/saasvn/tose-app/issues/134) |
| Thưởng hai chiều và campaign | Chưa có. Chỉ người giới thiệu được thưởng. Bonus đăng ký của ví là giao dịch `signup_bonus` riêng, không thuộc chương trình giới thiệu. | [tose-app#139](https://github.com/saasvn/tose-app/issues/139) |

## API tổng quan giới thiệu {#api-tong-quan-gioi-thieu}

```http
GET /api/workspaces/{slug}/referrals
Authorization: Bearer <token>
```

Yêu cầu quyền truy cập workspace và scope `billing.read` với [API key có scope](/vi/mcp/agent-access). Trả về:

| Trường | Nội dung |
|--------|----------|
| `profile` | `code`, `referral_url`, `tier_name`, `tier_rate_bps`, `tier_rate_percent`, `beneficiary_workspace` |
| `stats` | `referred_users`, `credited_total` và `referral_volume` (đều đã trừ hoàn tiền), `reversed_total` và bản định dạng (số tiền tính bằng cent) |
| `rank` | Hạng hiện tại, `progress_percent`, và `next` kèm `remaining_amount` tới hạng kế tiếp |
| `tiers` | Ba hạng với `rate_bps`, `threshold_amount`, `is_current`, `is_reached` |
| `relationships`, `commissions`, `events` | 50, 50 và 80 bản ghi mới nhất. Mỗi hoa hồng có `applied_rate_bps`, `status` và `reversed_commission_amount` |
| `reconciliation` | Tổng hoa hồng, giao dịch ví và hạng, để kiểm tra chúng khớp nhau |

Các loại sự kiện có thể gặp: `profile_created`, `relationship_created`, `commission_credited`, `commission_reversed`, `tier_updated`, `referral_rejected` (lý do, như `self_referral`, `invalid_code` hoặc `existing_user`, nằm trong metadata). Danh sách gồm cả sự kiện mà bạn là người được giới thiệu, không chỉ người giới thiệu.

## Link chiến dịch và quyền riêng tư

- Chỉ tham số `ref` được dùng để ghi nhận. Các tham số UTM khác không được dùng để tính thưởng, nên đừng dựa vào chúng để xác định thanh toán đủ điều kiện.
- Trang đăng nhập lưu mã trong cookie `tose_ref` 90 ngày trên domain cookie của TOSE, và trong local storage của trình duyệt không hết hạn. Tham số `ref` trong link mới hơn sẽ thay mã đã lưu.
- Danh sách `relationships` và `commissions` chỉ trả `id` và `username` của người được giới thiệu. Email và định danh OAuth không được hiển thị cho người giới thiệu.

## FAQ

**Xem credit ở đâu?** Trong ví của workspace thụ hưởng, dưới dạng giao dịch `referral_credit`, và ở trang Referrals của dashboard workspace.

**Vì sao tỷ lệ của tôi thấp hơn hạng?** Tỷ lệ của một hoa hồng là hạng của bạn ngay trước khoản thanh toán đó và không bao giờ bị tính lại. Xem [Các hạng hoa hồng](#cac-hang-hoa-hong).

**Đổi workspace thụ hưởng được không?** Hiện chưa có API được tài liệu hóa cho việc này.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân có thể |
|-------------|--------------------|
| Người được giới thiệu không có trong danh sách | Họ đăng ký không kèm mã, hoặc dùng mã không tồn tại. Mã dùng khi đăng nhập vào tài khoản đã tồn tại sẽ bị bỏ qua. |
| Không có hoa hồng cho một khoản thanh toán | Người thanh toán chưa có relationship active, số tiền bằng 0, hoặc hoa hồng làm tròn xuống 0 cent. |
| `403` từ API tổng quan | Key hoặc người dùng thiếu `billing.read` hoặc quyền truy cập workspace đó. |

## Runbook vận hành

Dành cho quản trị viên và moderator TOSE.

- **Nghi ngờ lạm dụng** (tự giới thiệu, tạo nhiều tài khoản): xem `events` của người giới thiệu, sau đó điều chỉnh ví thụ hưởng bằng giao dịch `admin_adjust` và ghi rõ lý do. Không sửa các dòng ledger đã có.
- **Hoàn tiền Polar:** không cần làm gì. Việc đảo là tự động; nếu thất bại, webhook trả 5xx và Polar sẽ gửi lại.
- **Hoàn tiền SePay, hoặc chargeback của cả hai nhà cung cấp:** hoàn tiền cho người thanh toán với nhà cung cấp trước. Nếu khoản đó đã tạo hoa hồng, trừ ví thụ hưởng bằng `POST /admin/api/billing/wallets/:wallet_id/adjust`, mô tả nêu rõ khoản thanh toán. Chỉ trừ tối đa số dư hiện tại; nền tảng chịu phần còn lại. Việc này không đổi bản ghi hoa hồng, doanh số ròng hay hạng. Tương tự với hoàn tiền một phần của Polar đến trước khi hoa hồng tồn tại.
- **Hạng hiển thị sai:** mở API tổng quan; hạng được tính lại từ doanh số giới thiệu ròng khi tải trang và sau mỗi hoa hồng được ghi credit hoặc bị đảo.

## Nhật ký thay đổi

| Ngày | Thay đổi |
|------|----------|
| 2026-11-01 | Phiên bản đầu, viết từ implementation hiện tại. |
| 2026-11-02 | Hạng tại thời điểm thanh toán, đảo hoa hồng khi Polar hoàn tiền, các trường hợp SePay và chargeback xử lý thủ công. |

## Xem thêm

- [Đăng blog qua MCP](./blog-and-editorial-mcp)
- [Bảng giá](./pricing)
