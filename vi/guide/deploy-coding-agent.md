# Triển khai một coding agent

TOSE phát hành sẵn các coding agent trong **Kho mẫu**: **Claude Code**, **Codex** và **Pi**. Mỗi agent chạy trong một pod riêng tư của workspace, có ổ đĩa bền vững, và bạn làm việc với nó qua một console mà chỉ owner và admin của workspace mới mở được.

Cả ba agent đều đã phát hành phiên bản 1.0.0. Mỗi bản phát hành được ghim vào một image theo digest, và ứng dụng bạn cài hiển thị image đó ở mục **Nguồn mẫu**.

## Trước khi bắt đầu

- Bạn là **owner hoặc admin** của workspace. Duyệt kế hoạch và mở console đều cần vai trò này.
- Ví còn số dư. TOSE chỉ tính phí tính toán và lưu trữ từ [ví trả trước](/vi/guide/pricing). Chi phí dùng model do nhà cung cấp tính: qua API key của bạn, hoặc trừ vào gói Claude hay ChatGPT của bạn.
- Thẻ của agent cho thấy nó sẵn sàng. Thẻ ghi **Chưa sẵn sàng** không thể triển khai, và **Lý do chưa triển khai được** giải thích điều chặn.
- Bạn có API key của nhà cung cấp hoặc một gói để đăng nhập (xem [Chọn nhà cung cấp](#chon-nha-cung-cap)).

## Triển khai một agent

1. Mở **Kho mẫu** ở thanh bên của workspace (nhóm **Ứng dụng & agent**). Danh sách **Mẫu agent do TOSE tuyển chọn** có mỗi agent một thẻ, ghi các cách đăng nhập, khoảng kích thước, bản phát hành và phiên bản upstream, nguồn và giấy phép.
2. Chọn một agent rồi chọn **Triển khai**.
3. Nhập **Tên ứng dụng**, rồi chọn **Nhà cung cấp** (xem bên dưới). Có thể đặt **Mô hình**; để trống thì dùng model mặc định của agent. Chọn kích thước trong danh sách và chế độ mạng: **Chỉ các máy chủ được duyệt** (mặc định, chỉ host của nhà cung cấp) hoặc **Internet**.
4. Chọn **Lập kế hoạch**. Kế hoạch cho thấy chính xác những gì sẽ được cài và mức trần chi phí theo giờ đã tính giá.
5. Xem lại kế hoạch rồi chọn **Duyệt kế hoạch**. Việc duyệt gắn với kế hoạch này: mọi thay đổi làm nó hết hiệu lực và cần duyệt lại.
6. Chọn **Cài đặt**. Nếu bạn chọn API key, TOSE hỏi key ở bước này. Key được mã hóa, không hiển thị lại và không nằm trong kế hoạch.
7. Khi ứng dụng ở trạng thái **Đang chạy**, mở trang của nó. Dùng **Mở console** (hoặc **Kết nối ChatGPT**, với gói ChatGPT) như mô tả bên dưới.

Biểu mẫu không còn hỏi giới hạn chi phí. Kế hoạch vẫn hiển thị mức trần chi phí để bạn cân nhắc trước khi duyệt. Nếu tạo kế hoạch qua API, bạn vẫn có thể gửi `max_hourly_cost_cents`; khi đó kế hoạch bị chặn nếu mức trần cao hơn.

## Chọn nhà cung cấp {#chon-nha-cung-cap}

| Agent | Nhà cung cấp | Bạn cần |
|-------|--------------|---------|
| Claude Code | **Claude plan (Pro or Max)** | Không cần gì khi cài. Sau khi ứng dụng chạy, đăng nhập bằng `/login` trong console của agent. |
| Claude Code | **Anthropic API key** | `ANTHROPIC_API_KEY`, nhập khi cài. |
| Codex | **OpenAI API** | `OPENAI_API_KEY`, nhập khi cài. |
| Codex | **ChatGPT plan** | Không cần gì khi cài. Sau khi ứng dụng chạy, chọn **Kết nối ChatGPT** ở trang ứng dụng. |
| Pi | Anthropic, OpenAI hoặc Google | `PI_API_KEY` của nhà cung cấp đã chọn, nhập khi cài. |

Nhà cung cấp là một phần của kế hoạch đã duyệt. Để đổi một ứng dụng từ API key sang gói ChatGPT (hoặc ngược lại), hãy cài một ứng dụng mới và dừng ứng dụng cũ.

### Đăng nhập bằng gói Claude

1. Mở console của ứng dụng bằng **Mở console**.
2. Lần đầu khởi động, Claude Code hỏi cách đăng nhập. Dùng `/login`; nó hiện một liên kết tới trang của Anthropic.
3. Đăng nhập ở đó trong trình duyệt của bạn rồi dán mã trang hiển thị vào terminal.

Claude Code lưu phiên đăng nhập trên ổ `/home/agent` của agent nên phiên vẫn còn sau khi khởi động lại. Dùng `/status` hoặc `/usage` để xem giới hạn của gói, và `/logout` để đăng xuất. Với **Anthropic API key**, `/login` vẫn dùng được vì Anthropic không cho phép giới hạn một trong hai cách.

Bảng đăng nhập **Gói Claude** trên dashboard vẫn tắt ở production; hãy đăng nhập từ console.

### Đăng nhập bằng gói ChatGPT

1. Chờ ứng dụng ở trạng thái **Đang chạy**. Trang ứng dụng hiện bảng **Gói ChatGPT** với nút **Kết nối ChatGPT**.
2. Chọn nút đó. Bảng hiển thị một mã dùng một lần và liên kết tới `https://auth.openai.com/codex/device`.
3. Mở liên kết trong trình duyệt của bạn, đăng nhập ChatGPT và nhập mã.
4. Bảng sau đó hiển thị tài khoản, gói và mức sử dụng, cùng các nút **Kết nối lại** và **Ngắt kết nối**.

Codex nhận token trực tiếp từ OpenAI và giữ chúng trên ổ đĩa của agent. TOSE không nhận token, cookie hay mã ủy quyền, và không bao giờ yêu cầu bạn gửi chúng; TOSE chỉ chuyển tiếp mã thiết bị dùng một lần cho bạn. Người vận hành bật tính năng này bằng `CURATED_SUBSCRIPTION_LOGIN_ENABLED=true`. Trên máy chủ chưa bật, nhà cung cấp hiện "not available on this server" và không chọn được. Owner hoặc admin nào mở được console cũng dùng được phiên ChatGPT đã kết nối, và OpenAI có thể hạn chế các tài khoản đăng nhập theo cách này, nên hãy kết nối một tài khoản bạn thấy phù hợp.

## Mở console

**Mở console** mở agent trong một tab mới. Console không có địa chỉ công khai: chỉ owner và admin của workspace đã đăng nhập mới mở được, một phiên kéo dài tối đa 8 giờ, và nó đóng khi ứng dụng dừng hoặc bạn mất quyền truy cập. API key và ứng dụng được kết nối không thể mở console.

## Chi phí và quyền kiểm soát

- Tính toán được tính phí khi agent chạy; lưu trữ (ổ `/workspace` 5 GiB và `/home/agent` 1 GiB) được tính phí khi ổ đĩa còn tồn tại, kể cả lúc agent đã dừng.
- Owner hoặc admin nào cũng có thể dừng hoặc xóa agent bất cứ lúc nào. Agent không giữ thông tin xác thực TOSE nên không thể tự thay đổi.
- Với API key, hãy đặt thêm giới hạn chi tiêu ở nhà cung cấp.

Liên quan: [Bảng giá](/vi/guide/pricing), [Bắt đầu](/vi/guide/getting-started).
