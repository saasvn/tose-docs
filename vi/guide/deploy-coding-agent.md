# Triển khai một coding agent

TOSE phát hành sẵn các coding agent trong **Kho mẫu**: **Claude Code**, **Codex** và **Pi**. Mỗi agent chạy trong một pod riêng tư của workspace, có ổ đĩa bền vững, và bạn làm việc với nó qua một console mà chỉ owner và admin của workspace mới mở được.

Các phiên bản đã phát hành là **Codex 1.0.0**, **Claude Code 1.0.0**, cùng **Pi 1.0.0** và **1.1.0**. Pi 1.1.0 là mặc định cho agent Pi mới: bản này thêm bảy nhà cung cấp, Node.js kèm npm, uv cho Python và hướng dẫn mô tả container cho Pi. Mỗi bản phát hành được ghim vào một image theo digest, và ứng dụng bạn cài hiển thị image đó ở mục **Nguồn mẫu**.

## Trước khi bắt đầu

- Bạn là **owner hoặc admin** của workspace. Triển khai (tức là duyệt kế hoạch) và mở console đều cần vai trò này. Thành viên thường có thể điền trang triển khai rồi gửi kế hoạch cho owner hoặc admin.
- Ví còn số dư. TOSE chỉ tính phí tính toán và lưu trữ từ [ví trả trước](/vi/guide/pricing). Chi phí dùng model do nhà cung cấp tính: qua API key của bạn, hoặc trừ vào gói Claude hay ChatGPT của bạn.
- Thẻ của agent cho thấy nó sẵn sàng. Thẻ ghi **Chưa sẵn sàng** không thể triển khai, và **Lý do chưa triển khai được** giải thích điều chặn.
- Bạn có API key của nhà cung cấp hoặc một gói để đăng nhập (xem [Chọn nhà cung cấp](#chon-nha-cung-cap)).

## Triển khai một agent {#deploy-an-agent}

1. Mở **Kho mẫu** ở thanh bên của workspace (nhóm **Ứng dụng & agent**). Danh sách **Mẫu agent do TOSE tuyển chọn** có mỗi agent một thẻ, ghi các cách đăng nhập, khoảng kích thước, bản phát hành và phiên bản upstream, nguồn và giấy phép.
2. Chọn một agent rồi chọn **Triển khai**. Agent được triển khai trên một trang duy nhất, **Triển khai** kèm tên agent, gồm các thẻ sau:
   - **Ứng dụng**: **Tên ứng dụng**.
   - **Đăng nhập**: nhà cung cấp (xem [Chọn nhà cung cấp](#chon-nha-cung-cap)). Nếu dùng API key, hãy nhập key ngay tại đây. Key được mã hóa, chỉ gửi đi cùng lần triển khai, không hiển thị lại và không nằm trong kế hoạch. Đăng nhập bằng gói không cần key: bạn đăng nhập sau khi triển khai.
   - **Cấu hình**: **Số nhân CPU** và **Bộ nhớ (GiB)** trong danh sách có sẵn, **Ổ đĩa workspace** (dung lượng của `/workspace`: mặc định **5 GiB**, hoặc 10, 20 hay 50 GiB, mỗi mức kèm giá mỗi tháng), cùng **Tự động ngủ khi không hoạt động** (mặc định **Tắt**). Dung lượng ổ đĩa cố định sau khi cài agent.
   - **Truy cập mạng**: **Chỉ nhà cung cấp mô hình** (mặc định: chỉ host của nhà cung cấp), **Phát triển (giới hạn)** (nhà cung cấp cùng các host mã nguồn và gói đã được duyệt cho những công cụ có trong image của agent) hoặc **Internet công khai không giới hạn** (mọi host công khai, rủi ro cao hơn). Thẻ này cho thấy agent kết nối được tới đâu trong từng chế độ.
   - **Kho mã (không bắt buộc)**: một kho GitHub của workspace, được tải vào `/workspace` khi agent khởi động lần đầu. Bỏ qua mục này để bắt đầu với workspace trống. Bật **Cho phép agent push lên kho mã này** để agent push commit ngược lên kho ([cách push hoạt động](/vi/guide/agent-repository-checkout#cho-agent-push-len-kho-ma)); mặc định tắt.
   - **Nâng cao: phiên bản, model và biến môi trường**: **Bản phát hành** (mặc định là bản mới nhất, với Pi là 1.1.0), **Mô hình** tùy chọn (để trống thì dùng model mặc định của agent) và **Biến môi trường** của riêng bạn.
3. Xem kế hoạch bên cạnh nút **Triển khai**. Khi bạn thay đổi các ô nhập, trang tự lập kế hoạch và hiển thị mức trần chi phí (số tiền tối đa agent có thể tốn mỗi giờ), số giờ ví còn đủ, cùng các điều chặn và cảnh báo nếu có. Sửa các ô được đánh dấu để xem chi phí.
4. Chọn **Triển khai**. Nút này duyệt đúng kế hoạch đang hiển thị, cài đặt và theo dõi tiến trình: duyệt kế hoạch, cài đặt, khởi động agent, cho tới khi **Agent đang chạy**. Thành viên không có quyền duyệt sẽ nhận một liên kết tới kế hoạch để gửi cho owner hoặc admin.
5. Mở trang của ứng dụng. Dùng **Mở console**, hoặc kết nối gói của bạn như mô tả bên dưới.

Trang triển khai không hỏi giới hạn chi phí. Kế hoạch vẫn hiển thị mức trần chi phí để bạn cân nhắc trước khi triển khai. Nếu tạo kế hoạch qua API, bạn vẫn có thể gửi `max_hourly_cost_cents`; khi đó kế hoạch bị chặn nếu mức trần cao hơn.

## Chọn nhà cung cấp {#chon-nha-cung-cap}

| Agent | Nhà cung cấp | Bạn cần |
|-------|--------------|---------|
| Claude Code | **Claude plan (Pro or Max)** | Không cần gì khi triển khai. Sau khi ứng dụng chạy, chọn **Kết nối Claude** ở trang ứng dụng, hoặc đăng nhập bằng `/login` trong console của agent. |
| Claude Code | **Anthropic API key** | `ANTHROPIC_API_KEY`, nhập trên trang triển khai. |
| Codex | **OpenAI API** | `OPENAI_API_KEY`, nhập trên trang triển khai. |
| Codex | **ChatGPT plan** | Không cần gì khi triển khai. Sau khi ứng dụng chạy, chọn **Kết nối ChatGPT** ở trang ứng dụng. |
| Pi | Một trong mười nhà cung cấp từ bản 1.1.0 (bản 1.0.0 có Anthropic, OpenAI và Google); xem [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers) | `PI_API_KEY` của nhà cung cấp đã chọn, nhập trên trang triển khai. Cloudflare Workers AI cần thêm account ID của bạn. |

Nhà cung cấp là một phần của kế hoạch đã duyệt. Để đổi một ứng dụng từ API key sang gói ChatGPT (hoặc ngược lại), hãy cài một ứng dụng mới và dừng ứng dụng cũ.

### Đăng nhập bằng gói Claude

Từ trang ứng dụng, ở máy chủ có cung cấp cách này:

1. Chờ ứng dụng ở trạng thái **Đang chạy**. Trang ứng dụng hiện bảng **Gói Claude** với nút **Kết nối Claude**.
2. Chọn nút đó, mở liên kết tới trang đăng nhập của Anthropic và đăng nhập ở đó trong trình duyệt của bạn.
3. Dán mã mà trang của Anthropic hiển thị vào bảng. TOSE chuyển mã một lần cho Claude Code, không lưu, không ghi log và không trả lại.

Hoặc từ console, cách này luôn dùng được:

1. Mở console của ứng dụng bằng **Mở console**.
2. Lần đầu khởi động, Claude Code hỏi cách đăng nhập. Dùng `/login`; nó hiện một liên kết tới trang của Anthropic.
3. Đăng nhập ở đó trong trình duyệt của bạn rồi dán mã trang hiển thị vào terminal.

Claude Code lưu phiên đăng nhập trên ổ `/home/agent` của agent nên phiên vẫn còn sau khi khởi động lại. Dùng `/status` hoặc `/usage` để xem giới hạn của gói, và `/logout` để đăng xuất. Với **Anthropic API key**, `/login` vẫn dùng được vì Anthropic không cho phép giới hạn một trong hai cách.

Bảng **Gói Claude** được cung cấp ở máy chủ bật `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, và chủ sản phẩm đã cho phép bật trên production từ 2026-11-09; **Ngắt kết nối** trong bảng sẽ đăng xuất agent. Ở máy chủ tắt cờ này, bảng bị ẩn và bạn đăng nhập từ console. Owner hoặc admin nào mở được console cũng dùng được phiên Claude đã kết nối, và Anthropic có thể hạn chế các tài khoản đăng nhập qua bảng này, nên hãy kết nối một tài khoản bạn thấy phù hợp.

### Đăng nhập bằng gói ChatGPT

1. Chờ ứng dụng ở trạng thái **Đang chạy**. Trang ứng dụng hiện bảng **Gói ChatGPT** với nút **Kết nối ChatGPT**.
2. Chọn nút đó. Bảng hiển thị một mã dùng một lần và liên kết tới `https://auth.openai.com/codex/device`.
3. Mở liên kết trong trình duyệt của bạn, đăng nhập ChatGPT và nhập mã.
4. Bảng sau đó hiển thị tài khoản, gói và mức sử dụng, cùng các nút **Kết nối lại** và **Ngắt kết nối**.

Codex nhận token trực tiếp từ OpenAI và giữ chúng trên ổ đĩa của agent. TOSE không nhận token, cookie hay mã ủy quyền, và không bao giờ yêu cầu bạn gửi chúng; TOSE chỉ chuyển tiếp mã thiết bị dùng một lần cho bạn. Người vận hành bật tính năng này bằng `CURATED_SUBSCRIPTION_LOGIN_ENABLED=true`; chủ sản phẩm đã cho phép bật trên production từ 2026-11-09. Trên máy chủ chưa bật, nhà cung cấp hiện "not available on this server" và không chọn được. Owner hoặc admin nào mở được console cũng dùng được phiên ChatGPT đã kết nối, và OpenAI có thể hạn chế các tài khoản đăng nhập theo cách này, nên hãy kết nối một tài khoản bạn thấy phù hợp.

## Triển khai bằng CLI

`tose templates plan|deploy --curated <tên>` lập kế hoạch và cài cùng các agent này từ terminal. Với Pi, CLI kiểm tra nhà cung cấp trước khi lập kế hoạch: nhà cung cấp mới hơn bản Pi mới nhất bị từ chối kèm danh sách được cung cấp, và `cloudflare-workers-ai` cần `CLOUDFLARE_ACCOUNT_ID` trong `variables`. Xem [Nhà cung cấp Pi curated](/vi/commands/templates#curated-pi-providers).

## Mở console

**Mở console** mở agent trong một tab mới. Console không có địa chỉ công khai: chỉ owner và admin của workspace đã đăng nhập mới mở được, một phiên kéo dài tối đa 8 giờ, và nó đóng khi ứng dụng dừng hoặc bạn mất quyền truy cập. API key và ứng dụng được kết nối không thể mở console.

## Giao tác vụ

Ứng dụng được kết nối hoặc API key có `agents:execute` có thể giao tác vụ cho agent và đọc kết quả. Với agent mới có trình chạy tác vụ, **Nhận tác vụ từ ứng dụng đã kết nối và khóa API** **mặc định bật**; owner hoặc admin có thể tắt bất cứ lúc nào trên trang của agent. Xem [Giao tác vụ cho coding agent](/vi/guide/agent-tasks), gồm cả cảnh báo về thông tin đăng nhập của agent.

## Chi phí và quyền kiểm soát

- Tính toán được tính phí khi agent chạy; lưu trữ (dung lượng `/workspace` bạn chọn, mặc định 5 GiB, cộng 1 GiB cho `/home/agent`) được tính phí khi ổ đĩa còn tồn tại, kể cả lúc agent đã dừng. Plan tính giá cả ổ đĩa vào mức trần chi phí.
- Ổ đĩa giữ công việc của bạn qua các lần khởi động lại, ngủ và deploy lại. Dung lượng cố định khi cài, nên hãy chọn đủ chỗ cho kho mã và kết quả build.
- Owner hoặc admin nào cũng có thể dừng hoặc xóa agent bất cứ lúc nào. Agent không giữ thông tin xác thực API TOSE nào cho workspace (khi có push, chỉ có bí mật git proxy cho đúng một kho mã) nên không thể tự thay đổi.
- Với API key, hãy đặt thêm giới hạn chi tiêu ở nhà cung cấp.

Liên quan: [Bảng giá](/vi/guide/pricing), [Bắt đầu](/vi/guide/getting-started).
