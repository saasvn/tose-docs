# Giá và hạn mức của Agent Runtime

::: warning Tình trạng triển khai
Tính năng đo mức sử dụng Agent Runtime **chưa phát hành rộng rãi**. Tính năng đang tắt theo mặc định
(`AGENT_USAGE_ENABLED`), và việc nối với orchestrator của agent, chuyển sang cơ chế nạp tiền mới và
canary trên runtime vẫn đang hoàn thiện. Trang này mô tả cách đo lường như một cam kết hành vi. Cho
đến khi tính năng được bật trên bản cài đặt TOSE của bạn, API usage chưa được đăng ký và trang ví chưa
hiển thị thẻ Agent runtime usage.
:::

Mức sử dụng Agent Runtime được trừ vào [ví](/vi/guide/pricing) của workspace, giống các compute khác.
TOSE đo từng agent và từng lượt chạy bằng số nguyên nano-USD (1 USD = 1.000.000.000) và lưu một sổ cái
chỉ ghi thêm để bạn tự đối chiếu.

## Cách tính một khoảng thời gian

CPU và RAM được đo trong thời gian sandbox ở trạng thái **Ready**:

- Khoảng thời gian bắt đầu khi TOSE **xác nhận sandbox Ready** và kết thúc khi TOSE **xác nhận sandbox
  đã dừng**. Pod lỗi trước khi Ready thì không bị tính phí.
- Giá là `số core × giờ × giá CPU + số GiB RAM × giờ × giá RAM`, theo CPU và RAM sandbox thực sự dùng.
- Mỗi khoản được làm tròn nửa lên đến nano-USD nguyên. Khi một khoảng được chia giữa lượt chạy và thời
  gian rảnh, tổng các phần bằng đúng tổng ban đầu nên việc chia không phát sinh thêm phí.
- **Giá được chốt khi khoảng thời gian mở ra.** Số dư giảm giữa chừng không làm tăng giá của khoảng đang
  chạy, và thay đổi giá về sau chỉ áp dụng cho khoảng mới. Mỗi dòng sổ cái ghi `pricing_version` đã
  dùng để tính.

| Mức sử dụng | Giá |
|-------------|-----|
| CPU dùng chung | $0.02 mỗi core-giờ, ở mọi mức số dư |
| RAM dùng chung | $0.01 mỗi GiB-giờ, ở mọi mức số dư |
| Lưu trữ | [Giá lưu trữ của ví](/vi/guide/pricing#storage) ($0.15 mỗi GiB-tháng) |
| Token model do TOSE quản lý | Xem [Khóa model](#model-keys) |

CPU và RAM của agent dùng mức giá cơ bản và **không được giảm giá theo số dư ví**. Workload giữ một core
và 2 GiB RAM trong một giờ tốn $0.02 + 2 × $0.01 = **$0.04**. Bạn có thể tính trước giá của một
workload bằng [xem trước giá](/vi/api/agent-usage#pricing-preview).

Workspace dùng node pool `dedicated` trả tiền cho cả pool, dù bận hay rảnh, vì không ai khác dùng được
phần dung lượng trống của pool đó.

## Miễn phí, được miễn và phải trả {#free-forgiven-owed}

| Trường hợp | Điều xảy ra |
|------------|-------------|
| Agent **nguội** (không có sandbox chạy) | Compute **$0**. |
| Pod **lỗi trước khi Ready** | Không tính phí. |
| Compute mà ví hoặc hạn mức **không đủ trang trải** | **Được miễn.** Ghi là `forgiven_nano_usd`, không bị thu và không phải trả sau. |
| **Lưu trữ** (ổ đĩa của agent) | **Tính riêng.** Đây là khoản duy nhất có thể phải trả. |

- Compute là trả trước. Trước khi sandbox chạy, TOSE giữ tiền cho nó và tất toán khoản giữ theo thời
  gian Ready đã xác nhận. Bạn không bao giờ bị tính compute vượt quá số tiền đã nạp.
- Lưu trữ được tính theo dung lượng đã cấp được xác nhận của ổ đĩa, kể cả khi agent nguội, đã dừng hoặc
  đã xóa nhưng ổ đĩa vẫn còn. Dừng compute không bao giờ xóa dữ liệu. Lưu trữ không dùng được tiền đang
  giữ cho một lượt chạy.
- Compute được miễn không được hoàn lại và cũng không bị thu sau. Bằng chứng dừng đến muộn sẽ sửa phần
  của lượt chạy và thời gian rảnh bị ảnh hưởng, nhưng không hoàn lại compute đã được miễn.

Xem thêm [Khi số dư bằng không](/vi/guide/pricing#when-the-balance-is-zero).

## Hạn mức cứng

Hạn mức cứng giới hạn chi tiêu của cả workspace, một agent hoặc một lượt chạy:

1. Mở **Wallet & billing** trong dashboard, chọn **Usage**, tìm **Agent runtime usage**.
2. Chọn phạm vi (workspace, agent hoặc lượt chạy), chọn agent hoặc lượt chạy đã có trong workspace và
   nhập hạn mức bằng USD (tối đa chín chữ số thập phân).

Hạn mức `0` chặn compute của phạm vi đó. Khi chi tiêu chạm hạn mức, hạn mức bị **chặn** và **từ chối an
toàn**: lượt chạy dừng, và không có gì được đánh thức hay giữ tiền cho phạm vi đó cho đến khi bạn nâng
hạn mức vượt số đã chi, việc này gỡ chặn. Compute vượt hạn mức được ghi là được miễn. Sandbox đã dừng
vẫn giữ ổ đĩa. Yêu cầu làm vượt hạn mức bị từ chối với `402` và mã `budget_exhausted`.

Ngân sách hằng tháng của ví chỉ là cảnh báo dự báo, không giới hạn chi tiêu Agent Runtime; hạn mức cứng
mới làm việc đó. Bạn cũng có thể quản lý hạn mức bằng [API hạn mức](/vi/api/agent-usage#budgets).

## Khóa model {#model-keys}

Cách tính phí một lời gọi model phụ thuộc agent dùng khóa API của ai:

| | BYOK (tự mang khóa) | Khóa do TOSE quản lý |
|---|---|---|
| Ai thu tiền model | Nhà cung cấp model của bạn | TOSE |
| TOSE tính phí token | **Không.** Chỉ là telemetry | **Có**, theo token |
| Trong sổ cái | `provider_telemetry_nano_usd`, phí TOSE bằng 0 | `charged_nano_usd` |
| TOSE vẫn tính | Hạ tầng (CPU, RAM, lưu trữ) | Hạ tầng và token |

- Với **BYOK**, TOSE chỉ tính hạ tầng. Số token và chi phí của nhà cung cấp được ghi lại để bạn xem cạnh
  mức dùng TOSE, nhưng nhà cung cấp mới là bên thu tiền model.
- Với **khóa do TOSE quản lý**, token được tính theo từng model, bằng nano-USD trên một triệu token.
  Trước mỗi lời gọi, lượt chạy giữ **chi phí tối đa** của lời gọi; biên nhận đã xác minh của nhà cung cấp
  sẽ tất toán lời gọi đúng một lần và trả lại phần chưa dùng. Model **chưa có giá sẽ bị từ chối** thay vì
  đoán giá, và [xem trước giá](/vi/api/agent-usage#pricing-preview) trả `422` cho trường hợp đó. Token
  cache chưa có giá nên chưa bị tính phí.

## Xem mức sử dụng

- **Dashboard:** thẻ **Agent runtime usage** trên trang thanh toán của ví hiển thị khoản TOSE đã tính,
  telemetry BYOK, khoản không tính vì hạn mức hoặc ví đã hết, mức dùng theo lượt chạy, các hạn mức cứng
  và các sự kiện hạn mức gần đây.
- **API:** [API usage và hạn mức của agent](/vi/api/agent-usage) cho chi tiết theo agent và theo lượt
  chạy, dòng sự kiện hạn mức và bước đối soát tính lại mọi khoảng đã đóng từ sự kiện vòng đời, để đối
  chiếu hóa đơn độc lập với sổ cái.

## Liên quan

- [Bảng giá](/vi/guide/pricing)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [API usage và hạn mức của agent](/vi/api/agent-usage)
