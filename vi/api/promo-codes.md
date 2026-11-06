# API mã khuyến mãi

Mã khuyến mãi giảm số tiền nạp ví hoặc cộng credit thưởng vào lần nạp. Ý nghĩa của từng loại mã và các quy tắc nằm ở [Mã khuyến mãi và credit thưởng](/vi/guide/promo-codes). Trang này liệt kê các endpoint.

## Xem trước một mã {#preview}

`POST /api/workspaces/{slug}/wallet/promo/preview`

Kiểm tra mã với một số tiền và cho biết bạn sẽ trả và nhận bao nhiêu. Endpoint không giữ chỗ gì nên gọi bao nhiêu lần cũng được. Cần quyền truy cập workspace. API key cần scope `billing:write` (giống các endpoint nạp tiền), nếu không sẽ nhận `403 insufficient_scope`.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `code` | string | Bắt buộc. Không phân biệt hoa thường. |
| `amount` | integer | Bắt buộc. Cent USD, hoặc VND khi `currency` là `VND`. |
| `currency` | string | `USD` (mặc định) hoặc `VND`. |
| `purpose` | string | `wallet_topup` (mặc định). Giá trị khác được coi là mở khóa template. Bước xem trước dùng `amount` bạn gửi, còn endpoint thanh toán thay bằng phí mở khóa của template, nên hãy xem trước với đúng phí đó. |

```bash
curl -X POST https://<api-host>/api/workspaces/acme/wallet/promo/preview \
  -H "Authorization: Bearer $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"AKTOSE-7QXM-K4HP","amount":5000,"currency":"USD"}'
```

```json
{
  "code": "AKTOSE-7QXM-K4HP",
  "kind": "bonus",
  "currency": "USD",
  "original_amount": 5000,
  "charged_amount": 5000,
  "discount_usd_cents": 0,
  "bonus_cents": 10000,
  "credit_usd_cents": 5000,
  "credit_valid_days": 90
}
```

| Trường | Mô tả |
|--------|-------|
| `original_amount`, `charged_amount` | Số tiền trước khi áp mã và số bạn sẽ trả, theo loại tiền của yêu cầu (VND hoặc cent USD). |
| `discount_usd_cents` | Số tiền giảm, tính bằng cent USD. `0` với mã bonus hoặc match. |
| `bonus_cents` | Credit khuyến mãi được cộng sau khi thanh toán, tính bằng cent USD. `0` nếu loại mã không phải `bonus` hoặc `match_percent`. |
| `total_credit_cents` | Tổng credit đã nạp cộng credit thưởng mà ví nhận được, tính bằng cent USD (`credit_usd_cents` + `bonus_cents`). |
| `credit_usd_cents` | Credit đã nạp mà ví nhận được cho khoản này: toàn bộ số tiền. Nếu mã bị từ chối khi thanh toán hoàn tất, ví nhận số tiền bạn thực trả. |
| `description` | Mô tả của mã, nếu có. |
| `credit_valid_days` | Số ngày credit thưởng được dùng. Chỉ có với mã bonus có hạn. |

Với mã `match_percent`, `bonus_cents` bằng số tiền nạp nhân `percent_off`, tối đa bằng `amount_cents` của mã. Số tiền VND được quy đổi theo tỷ giá tham chiếu trong ngày để áp mức trần đó, và tỷ giá không nằm trong phản hồi. Tỷ giá tham chiếu chỉ quyết định phần thưởng, không bao giờ quyết định số dư được cộng cho số VND bạn trả; số dư đó dùng tỷ giá của ví. Khi nguồn tỷ giá gặp sự cố, TOSE dùng tỷ giá đã lưu gần nhất, hoặc tỷ giá cố định của ví nếu chưa có. Ví dụ cho lần nạp $60 với mã 100% có trần $100:

```json
{
  "code": "AKTOSE-7QXM-K4HP",
  "kind": "match_percent",
  "currency": "USD",
  "original_amount": 6000,
  "charged_amount": 6000,
  "discount_usd_cents": 0,
  "bonus_cents": 6000,
  "credit_usd_cents": 6000,
  "total_credit_cents": 12000,
  "credit_valid_days": 90
}
```

Mã bị từ chối trả `400` kèm `{"error": "...", "code": "PROMO_..."}`. Các giá trị `code` được liệt kê trong [Vì sao mã bị từ chối](/vi/guide/promo-codes#why-a-code-can-be-refused). Workspace bạn không có quyền truy cập trả `404`.

## Thanh toán với mã {#pay}

Cả hai endpoint nạp tiền nhận thêm trường `code` (tùy chọn) trong JSON body:

| Endpoint | Body | Loại tiền |
|----------|------|-----------|
| `POST /api/workspaces/{slug}/wallet/topup/polar` | `{"amount": 5000, "code": "..."}` | Cent USD |
| `POST /api/workspaces/{slug}/wallet/topup/sepay` | `{"amount": 1300000, "code": "..."}` | VND |

Mã được kiểm tra và giữ chỗ trong cùng transaction tạo khoản thanh toán, nên không bao giờ có khoản thanh toán mang một mã chưa được kiểm tra. Mã bị từ chối trả `400` với cùng nội dung như bước xem trước và không tạo thanh toán nào.

Response có thêm đối tượng `promotion` với các trường giống bước xem trước (`null` khi không gửi mã). `amount` là số bạn trả: với Polar, checkout được tạo theo giá sau giảm; với SePay, số tiền chuyển khoản và mã QR dùng giá này. Ví vẫn được cộng đủ số tiền bạn chọn.

Ô nhập mã giảm giá của Polar bị tắt trên các checkout này. Hãy nhập mã trong TOSE trước khi thanh toán.

## Giao dịch ví {#wallet-transactions}

| `type` | Khi nào |
|--------|---------|
| `promo_credit` | Credit thưởng được cộng sau khi thanh toán hoàn tất. |
| `promo_expired` | Phần credit thưởng chưa dùng bị thu hồi khi hết hạn. |
| `promo_revoked` | Phần credit thưởng chưa dùng bị thu hồi sau khi hoàn tiền toàn bộ. |

## Vận hành mã giảm giá {#admin}

::: warning Chỉ dành cho admin nền tảng
Các endpoint và công cụ này dành cho nhà vận hành nền tảng TOSE. Chủ workspace hoặc API key không dùng được.
:::

Mọi số tiền tính bằng cent USD. Mã được lưu ở dạng chữ hoa.

### Các trường của một mã {#code-fields}

| Trường | Mô tả |
|--------|-------|
| `code` | Mã đặt tên sẵn, 3 đến 40 chữ cái, chữ số, `-` hoặc `_`, bắt đầu bằng chữ cái hoặc chữ số. Đưa trường này **hoặc** `prefix` kèm `count`. |
| `prefix`, `count` | Tiền tố 3 đến 20 ký tự (cùng bảng ký tự). Sinh `count` (2 đến 5000) mã tên `PREFIX-XXXX-XXXX`. Mỗi mã dùng một lần (`max_redemptions` 1, `max_per_user` 1). Bảng ký tự bỏ `0`, `O`, `1` và `I`. |
| `kind` | `percent`, `fixed`, `bonus` hoặc `match_percent`. |
| `percent_off` | 1 đến 100: tỷ lệ giảm với `percent`, tỷ lệ của số tiền nạp được tặng với `match_percent`. |
| `amount_cents` | 1 đến 1,000,000, cho `fixed` (số giảm), `bonus` (số credit) và `match_percent` (mức trần của phần thưởng). |
| `emails` | Danh sách địa chỉ, đi kèm `prefix`, thay cho `count`. Tạo mỗi địa chỉ một mã dùng một lần và ghi địa chỉ đó vào mã. Địa chỉ được chuyển thành chữ thường và loại trùng, một địa chỉ không hợp lệ làm cả yêu cầu bị từ chối, và đưa cả `emails` lẫn `count` cũng bị từ chối. Địa chỉ chỉ là ghi chú cho operator, không phải ràng buộc: mã dùng được cho bất kỳ ai đổi trước. |
| `applies_to` | `wallet_topup` và/hoặc `template_unlock`. Mặc định `wallet_topup`. Mã bonus hoặc match không được kèm `template_unlock`. |
| `min_amount_cents` | Khoản thanh toán nhỏ nhất, trước khi giảm, mà mã chấp nhận. |
| `first_topup_only` | Workspace phải chưa có lần nạp nào hoàn tất trước đó. |
| `max_redemptions` | Tổng số lượt dùng. `0` là không giới hạn. |
| `max_per_user` | Số lượt dùng cho mỗi người. Mặc định `1`, `0` là không giới hạn. |
| `credit_valid_days` | Số ngày credit thưởng được dùng (tối đa 3650). `0` là không hết hạn. Chỉ cho mã bonus và match. |
| `starts_at`, `expires_at` | Khoảng hiệu lực theo RFC 3339. `expires_at` phải sau `starts_at`. |
| `campaign` | Gom các mã thành một chương trình: mỗi người và mỗi workspace chỉ dùng tối đa một mã của mỗi chiến dịch. Tối đa 64 ký tự. Chiến dịch cũng có thể có giới hạn suất chung, xem [Giới hạn suất theo chiến dịch](#admin-campaign). |
| `description` | Tối đa 500 ký tự. |

Sau khi tạo, chỉ đổi được `description`, `max_redemptions`, `max_per_user`, `starts_at`, `expires_at` và `status`. Tên mã, `kind`, số tiền, `applies_to`, `min_amount_cents`, `first_topup_only`, `credit_valid_days` và `campaign` là cố định. Hãy tạo mã mới.

### REST {#admin-rest}

Các route thuộc API của admin console và dùng phiên đăng nhập admin console, không dùng API key của workspace.

| Route | Tác dụng |
|-------|----------|
| `POST /admin/api/promo-codes` | Tạo một mã hoặc một lô. Trả `201` với `codes` và `count`. |
| `GET /admin/api/promo-codes` | Liệt kê, mới nhất trước. Query: `campaign`, `status` (`active` hoặc `disabled`), `q` (chuỗi con của mã), `limit` (1 đến 200; giá trị lớn hơn quay về 50, mặc định 50), `offset`. |
| `GET /admin/api/promo-codes/{id}` | Một mã (theo ID hoặc mã) cùng `stats` của sổ cái. |
| `PATCH /admin/api/promo-codes/{id}` | Đổi `description`, `max_redemptions`, `max_per_user`, `starts_at`, `expires_at` hoặc `status`. |
| `POST /admin/api/promo-codes/{id}/disable` | Ngừng áp dụng mã cho các khoản thanh toán mới. |
| `GET /admin/api/promo-codes/{id}/redemptions` | Sổ cái các lượt dùng của mã. |
| `POST /admin/api/promo-codes/redemptions/{id}/release` | Giải phóng một lượt dùng. Body `{"reason"}` (tùy chọn, được lưu cùng lượt dùng). Xem [Giải phóng một lượt dùng](#admin-release). |
| `GET /admin/api/promo-codes/campaigns/{campaign}` | Số mã, `stats` sổ cái và `usage` của giới hạn suất chung của một chiến dịch. |
| `PUT /admin/api/promo-codes/campaigns/{campaign}` | Đặt giới hạn suất chung của chiến dịch. Body `{"max_redemptions": 300}`, bắt buộc, `0` là bỏ giới hạn. Xem [Giới hạn suất theo chiến dịch](#admin-campaign). |
| `GET /admin/api/promo-codes/campaigns/{campaign}/codes.csv` | Tải các mã của chiến dịch dạng CSV với các cột `email`, `code` và `status`, sắp theo email, để trộn vào newsletter. Địa chỉ bắt đầu bằng `=`, `+`, `-` hoặc `@` được thêm dấu nháy đơn phía trước để bảng tính không coi đó là công thức. |

`stats` gồm `reserved`, `redeemed`, `released`, `rejected`, `discount_cents`, `bonus_granted_cents` và `bonus_unspent_cents`.

Vô hiệu hóa mã, hoặc để mã hết hạn, không hủy khoản thanh toán đã giữ chỗ mã đó: khoản đó giữ nguyên giá.

Lỗi trả `{"error", "code"}`: `INVALID` (`400`), `NOT_FOUND` (`404`) và `CONFLICT` (`409`, đã có mã trùng tên). Body sai định dạng trả `400` và lỗi bất ngờ trả `500`, cả hai không có `code`.

### Công cụ MCP {#admin-mcp}

Trên [MCP connector](/vi/mcp), có thêm tám công cụ dành cho admin nền tảng. Chúng cần scope `admin:discounts` **và** người dùng hiện đang là admin nền tảng. Với mọi người khác, chúng bị ẩn khỏi `tools/list` và bị từ chối khi gọi, và việc kiểm tra thất bại theo hướng từ chối nếu tra cứu admin lỗi. Scope bị loại bỏ khi người không phải admin đồng ý cấp quyền, và ở mỗi lần refresh sau khi người dùng không còn là admin.

| Công cụ | Tác dụng | Có thay đổi dữ liệu? |
|---------|----------|----------------------|
| `create_discount_codes` | Tạo một mã hoặc một lô với các trường ở trên. | Có |
| `list_discount_codes` | Liệt kê mã. Bộ lọc `campaign`, `status`, `query`, `limit`, `offset`. | Không |
| `get_discount_code` | Một mã (theo mã hoặc ID) cùng số liệu của nó, hoặc số liệu của một `campaign` kèm giới hạn suất chung: số suất đã dùng và còn lại. | Không |
| `update_discount_code` | Đổi `description`, giới hạn, khoảng hiệu lực hoặc `status`. | Có |
| `disable_discount_code` | Ngừng áp dụng mã cho các khoản thanh toán mới. | Có |
| `list_discount_redemptions` | Sổ cái của một `code` hoặc một `campaign`, mới nhất trước. | Không |
| `release_discount_redemption` | Giải phóng một lượt dùng theo ID, kèm `reason`. | Có |

### Giới hạn suất theo chiến dịch {#admin-campaign}

Một chiến dịch có thể giới hạn tổng số khoản thanh toán mà mọi mã của nó được áp dụng, theo thứ tự đến trước được trước. Đặt bằng `PUT /admin/api/promo-codes/campaigns/{campaign}` hoặc công cụ MCP `set_discount_campaign`, với `max_redemptions` (`0` là bỏ giới hạn). Tên chiến dịch dài 1 đến 64 ký tự và số âm bị từ chối với `INVALID`. Chiến dịch không có giới hạn thì không bị chặn. Khi chạm giới hạn, áp mã của chiến dịch trả `PROMO_CAMPAIGN_EXHAUSTED`.

```json
{
  "campaign": {"name": "agentkit-tose", "max_redemptions": 300},
  "usage": {"campaign": "agentkit-tose", "max_redemptions": 300, "used": 212, "remaining": 88}
}
```

`used` đếm các khoản thanh toán đã dùng mã và các lượt giữ chỗ còn đang giữ suất. `remaining` được bỏ qua khi chiến dịch không có giới hạn. Cùng `usage` này xuất hiện trong `GET /admin/api/promo-codes/campaigns/{campaign}` và trong `get_discount_code` với `campaign`.

- **Giữ suất.** Lượt giữ chỗ của một khoản thanh toán đang chờ giữ suất trong hai giờ. Sau đó suất được mở cho người thanh toán kế tiếp. Nếu khoản thanh toán đó vẫn hoàn tất muộn, nó chỉ nhận giảm giá hoặc phần thưởng khi chiến dịch còn suất. Nếu không, lượt dùng bị từ chối lúc hoàn tất và khoản thanh toán được ghi có số tiền đã trả.
- **Hạ giới hạn** xuống dưới `used` chỉ chặn các lượt dùng mới. Những gì đã tặng không bị thu hồi.

### Giải phóng một lượt dùng {#admin-release}

Một lượt dùng không còn cần giữ, ví dụ sau khi hoàn tiền SePay (SePay không gửi webhook hoàn tiền nên lượt dùng không bao giờ tự được giải phóng), có thể được operator giải phóng. Gọi công cụ MCP `release_discount_redemption` hoặc `POST /admin/api/promo-codes/redemptions/{id}/release` với body `{"reason": "..."}`. Lượt dùng còn ở trạng thái `reserved` (khoản thanh toán chưa hoàn tất) bị từ chối với `CONFLICT` (`409`). Giải phóng một lượt dùng đã hoàn tất sẽ mở lại lượt dùng của mã và thu hồi credit thưởng chưa dùng, giống một lần hoàn tiền toàn bộ khoản Polar. Giải phóng hai lần không gây hại, và ID không tồn tại trả `NOT_FOUND` (`404`).

Mọi thao tác tạo, cập nhật, vô hiệu hóa, giải phóng, đổi giới hạn chiến dịch và xuất CSV đều được ghi vào [audit log](/vi/api/audit) với mức rủi ro cao, từ cả REST lẫn MCP.

### Ví dụ: mã của đợt ra mắt AgentKit {#agentkit-example}

Nhờ một agent có scope admin tạo 300 mã, hoặc gọi `create_discount_codes` với:

```json
{
  "prefix": "AKTOSE",
  "count": 300,
  "campaign": "agentkit-tose",
  "kind": "bonus",
  "amount_cents": 10000,
  "credit_valid_days": 90,
  "min_amount_cents": 2000,
  "first_topup_only": true,
  "max_redemptions": 1,
  "max_per_user": 1,
  "expires_at": "2027-01-03T00:00:00Z"
}
```

Mỗi mã dùng một lần và mã đã dùng hết trả `PROMO_EXHAUSTED`. Để giới hạn cả chiến dịch, ví dụ 300 khoản thanh toán đầu tiên bất kể đã phát bao nhiêu mã, gọi `set_discount_campaign` với `campaign: "agentkit-tose"` và `max_redemptions: 300`. Theo dõi số suất đã dùng và còn lại bằng `get_discount_code` với `campaign: "agentkit-tose"`. Để phát mỗi khách một mã, truyền `emails` thay cho `count`, rồi tải các mã từ `GET /admin/api/promo-codes/campaigns/agentkit-tose/codes.csv`.

## Liên quan {#related}

- [Mã khuyến mãi và credit thưởng](/vi/guide/promo-codes)
- [API key và scope](/vi/api/api-keys)
- [Mã lỗi](/vi/api/errors)
