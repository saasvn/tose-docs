# Triển khai một coding agent

TOSE phát hành sẵn các coding agent **Claude Code**, **Codex** và **Pi** trong menu **Cloud Agents** của workspace (`/w/<workspace>/agents`). Mỗi agent chạy trong một pod riêng tư của workspace, có ổ đĩa bền vững, và bạn làm việc với nó qua một console mà chỉ owner và admin của workspace mới mở được.

Các phiên bản đã phát hành là **Codex 1.0.0**, **Claude Code 1.0.0**, cùng **Pi 1.0.0** và **1.1.0**. Pi 1.1.0 là mặc định cho agent Pi mới: bản này thêm bảy nhà cung cấp, Node.js kèm npm, uv cho Python và hướng dẫn mô tả container cho Pi. Mỗi bản phát hành được ghim vào một image theo digest, và trang của agent hiển thị image đó ở mục **Nguồn mẫu**, trong khối **Nâng cao** của tab **Cài đặt**.

## Trước khi bắt đầu

- Bạn là **owner hoặc admin** của workspace. Triển khai (tức là duyệt kế hoạch) và mở agent đều cần vai trò này. Thành viên thường có thể điền trang triển khai rồi gửi kế hoạch cho owner hoặc admin.
- Ví còn số dư. TOSE chỉ tính phí tính toán và lưu trữ từ [ví trả trước](/vi/guide/pricing). Chi phí dùng model do nhà cung cấp tính: qua API key của bạn, hoặc trừ vào gói Claude hay ChatGPT của bạn.
- Thẻ của agent cho thấy nó sẵn sàng. Thẻ ghi **Chưa sẵn sàng** không thể triển khai, và **Lý do chưa triển khai được** giải thích điều chặn.
- Bạn có API key của nhà cung cấp hoặc một gói để đăng nhập (xem [Chọn nhà cung cấp](#chon-nha-cung-cap)).

## Triển khai một agent {#deploy-an-agent}

1. Mở **Cloud Agents** ở thanh bên của workspace (`/w/<workspace>/agents`). Mục **Agent của bạn** liệt kê các agent đã có trong workspace, kèm trạng thái, bản phát hành, agent có đang nhận việc không (với bản phát hành có trình chạy tác vụ), kho mã và quyền push. Mục **Agent có sẵn** có mỗi agent triển khai được một thẻ, ghi các cách đăng nhập, khoảng kích thước, bản phát hành và phiên bản upstream, nguồn và giấy phép. Nút **Triển khai agent** ở đầu trang đưa bạn tới danh sách đó. Các trang mẫu (**Ứng dụng đã cài**, **Mẫu của tôi** và **Kho mẫu**, tức bước đầu của trình triển khai) không còn liệt kê các agent này.
2. Chọn một agent rồi chọn **Triển khai**. Agent được triển khai trên một trang duy nhất, **Triển khai** kèm tên agent, gồm các thẻ sau:
   - **Ứng dụng**: **Tên ứng dụng**.
   - **Đăng nhập**: nhà cung cấp (xem [Chọn nhà cung cấp](#chon-nha-cung-cap)). Nếu dùng API key, hãy nhập key ngay tại đây. Key được mã hóa, chỉ gửi đi cùng lần triển khai, không hiển thị lại và không nằm trong kế hoạch. Đăng nhập bằng gói không cần key: bạn đăng nhập sau khi triển khai.
   - **Cấu hình**: **Số nhân CPU** và **Bộ nhớ (GiB)** trong danh sách có sẵn, **Ổ đĩa workspace** (dung lượng của `/workspace`: mặc định **5 GiB**, hoặc 10, 20 hay 50 GiB, mỗi mức kèm giá mỗi tháng), cùng **Tự động ngủ khi không hoạt động** (mặc định **Tắt**). Sau này bạn có thể [tăng dung lượng ổ đĩa](#grow-the-disk) trên trang của agent, nhưng không giảm được.
   - **Truy cập mạng**: **Hạn chế** (mặc định: nhà cung cấp cùng GitHub và các kho gói npm, PyPI và Go, cổng 443) hoặc **Internet công khai không giới hạn** (mọi host công khai, rủi ro cao hơn). Xem [Chế độ mạng](/vi/guide/agent-network-modes). Thẻ này cho thấy agent kết nối được tới đâu trong từng chế độ.
   - **Kho mã (không bắt buộc)**: một kho GitHub của workspace, được tải vào `/workspace` khi agent khởi động lần đầu. Bỏ qua mục này để bắt đầu với workspace trống. Bật **Cho phép agent push lên kho mã này** để agent push commit ngược lên kho ([cách push hoạt động](/vi/guide/agent-repository-checkout#cho-agent-push-len-kho-ma)); mặc định tắt.
   - **Nâng cao: phiên bản, model và biến môi trường**: **Bản phát hành** (mặc định là bản mới nhất, với Pi là 1.1.0), **Mô hình** tùy chọn (để trống thì dùng model mặc định của agent) và **Biến môi trường** của riêng bạn.
3. Xem kế hoạch bên cạnh nút **Triển khai**. Khi bạn thay đổi các ô nhập, trang tự lập kế hoạch và hiển thị mức trần chi phí (số tiền tối đa agent có thể tốn mỗi giờ), số giờ ví còn đủ, cùng các điều chặn và cảnh báo nếu có. Sửa các ô được đánh dấu để xem chi phí.
4. Chọn **Triển khai**. Nút này duyệt đúng kế hoạch đang hiển thị, cài đặt và theo dõi tiến trình: duyệt kế hoạch, cài đặt, khởi động agent, cho tới khi **Agent đang chạy**. Thành viên không có quyền duyệt sẽ nhận một liên kết tới kế hoạch để gửi cho owner hoặc admin.
5. Mở trang của agent: chọn **Mở ứng dụng** khi triển khai xong, hoặc sau đó chọn agent trong mục **Agent của bạn** ở **Cloud Agents**. Bản thân trang vẫn là `/w/<workspace>/templates/<app>`, trong đó `<app>` là tên ứng dụng bạn đã đặt. Chọn **Mở agent** ở đầu trang, hoặc kết nối gói của bạn như mô tả bên dưới. Trang này được mô tả ở [Trang của agent](#the-agents-page).

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

1. Chờ ứng dụng ở trạng thái **Đang chạy**. Tab **Cài đặt** của trang agent hiện bảng **Gói Claude** với nút **Kết nối Claude**.
2. Chọn nút đó, mở liên kết tới trang đăng nhập của Anthropic và đăng nhập ở đó trong trình duyệt của bạn.
3. Dán mã mà trang của Anthropic hiển thị vào bảng. TOSE chuyển mã một lần cho Claude Code, không lưu, không ghi log và không trả lại.

Hoặc từ console, cách này luôn dùng được:

1. Mở agent bằng **Mở agent**.
2. Lần đầu khởi động, Claude Code hỏi cách đăng nhập. Dùng `/login`; nó hiện một liên kết tới trang của Anthropic.
3. Đăng nhập ở đó trong trình duyệt của bạn rồi dán mã trang hiển thị vào terminal.

Claude Code lưu phiên đăng nhập trên ổ `/home/agent` của agent nên phiên vẫn còn sau khi khởi động lại. Dùng `/status` hoặc `/usage` để xem giới hạn của gói, và `/logout` để đăng xuất. Với **Anthropic API key**, `/login` vẫn dùng được vì Anthropic không cho phép giới hạn một trong hai cách.

Bảng **Gói Claude** được cung cấp ở máy chủ bật `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, và chủ sản phẩm đã cho phép bật trên production từ 2026-11-09; **Ngắt kết nối** trong bảng sẽ đăng xuất agent. Ở máy chủ tắt cờ này, bảng bị ẩn và bạn đăng nhập từ console. Owner hoặc admin nào mở được console cũng dùng được phiên Claude đã kết nối, và Anthropic có thể hạn chế các tài khoản đăng nhập qua bảng này, nên hãy kết nối một tài khoản bạn thấy phù hợp.

### Đăng nhập bằng gói ChatGPT

1. Chờ ứng dụng ở trạng thái **Đang chạy**. Tab **Cài đặt** của trang agent hiện bảng **Gói ChatGPT** với nút **Kết nối ChatGPT**.
2. Chọn nút đó. Bảng hiển thị một mã dùng một lần và liên kết tới `https://auth.openai.com/codex/device`.
3. Mở liên kết trong trình duyệt của bạn, đăng nhập ChatGPT và nhập mã.
4. Bảng sau đó hiển thị tài khoản, gói và mức sử dụng, cùng các nút **Kết nối lại** và **Ngắt kết nối**.

Codex nhận token trực tiếp từ OpenAI và giữ chúng trên ổ đĩa của agent. TOSE không nhận token, cookie hay mã ủy quyền, và không bao giờ yêu cầu bạn gửi chúng; TOSE chỉ chuyển tiếp mã thiết bị dùng một lần cho bạn. Người vận hành bật tính năng này bằng `CURATED_SUBSCRIPTION_LOGIN_ENABLED=true`; chủ sản phẩm đã cho phép bật trên production từ 2026-11-09. Trên máy chủ chưa bật, nhà cung cấp hiện "not available on this server" và không chọn được. Owner hoặc admin nào mở được console cũng dùng được phiên ChatGPT đã kết nối, và OpenAI có thể hạn chế các tài khoản đăng nhập theo cách này, nên hãy kết nối một tài khoản bạn thấy phù hợp.

## Triển khai bằng CLI

`tose templates plan|deploy --curated <tên>` lập kế hoạch và cài cùng các agent này từ terminal. Với Pi, CLI kiểm tra nhà cung cấp trước khi lập kế hoạch: nhà cung cấp mới hơn bản Pi mới nhất bị từ chối kèm danh sách được cung cấp, và `cloudflare-workers-ai` cần `CLOUDFLARE_ACCOUNT_ID` trong `variables`. Xem [Nhà cung cấp Pi curated](/vi/commands/templates#curated-pi-providers).

## Trang của agent {#the-agents-page}

Trang của agent Claude Code, Codex hay Pi được viết cho người không vận hành máy chủ. Các template khác giữ trang riêng của chúng.

- **Mở agent**, nút lớn phía trên các tab, mở agent (xem [Mở agent](#open-the-console)).
- Trạng thái là **Đang chạy**, **Đang ngủ**, **Đang khởi động…**, **Đã dừng**, **Cần xem lại** (agent gặp lỗi) hoặc **Tạm dừng: ví hết tiền**. Nút **Khởi động lại** nằm ở đầu trang.
- Trang có năm tab: **Tổng quan**, **Tác vụ**, **Kho mã**, **Cài đặt** và **Hoạt động** (tose-app [#770](https://github.com/saasvn/tose-app/pull/770)). Agent không có tab **Tên miền**: console của nó luôn riêng tư.

| Tab | Có gì trong đó |
| --- | --- |
| **Tổng quan** | Sáu ô: **Tác vụ**, **Kho mã**, **Ổ đĩa**, **Tự động ngủ**, **Cấu hình** và **Hoạt động**, bên dưới là khối **Ổ đĩa** (dung lượng, giá mỗi tháng, **Tăng dung lượng**) và khối **Cấu hình** (trạng thái, CPU, RAM, cổng, nút **Đổi CPU và RAM**; tose-app [#779](https://github.com/saasvn/tose-app/pull/779)). Mỗi ô hiển thị một con số và một dòng trạng thái; chọn một ô sẽ đưa bạn tới nơi quản lý mục đó. Dòng trạng thái của ô chuyển sang màu cảnh báo khi có tác vụ lỗi trong 24 giờ qua hoặc có kho mã checkout thất bại, còn dòng của ô **Hoạt động** chuyển sang màu đỏ khi lần khởi động gần nhất thất bại. |
| **Tác vụ** | Bảng 20 [tác vụ](#giao-tac-vu) gần nhất chia ba cột **Đang chạy**, **Hoàn thành** và **Lỗi hoặc đã dừng** (xem [Bảng tác vụ](/vi/guide/agent-tasks#task-board)), bên dưới là **Cài đặt tác vụ** với công tắc **Nhận tác vụ từ ứng dụng đã kết nối và khóa API**. Tab và ô của nó bị ẩn khi máy chủ không cung cấp tác vụ. |
| **Kho mã** | Các kho mã của agent, **Quyền** của từng kho, **+ Thêm kho mã** và **Thử tải lại** (xem [Gắn hoặc đổi kho mã của agent](/vi/guide/agent-repository-checkout#gan-hoac-doi-kho-ma-sau-khi-cai)). |
| **Cài đặt** | Thẻ **Tự động ngủ** (các quy tắc được gấp trong **Tự động ngủ hoạt động thế nào**), bảng đăng nhập gói, **Nâng cao** (luôn mở: **Nguồn mẫu** và **Phiên bản mẫu** để nâng cấp hoặc rollback; tose-app [#779](https://github.com/saasvn/tose-app/pull/779)), **Bí mật và biến môi trường**, và **Dừng hoặc xóa** (**Dừng agent**, **Xóa agent**). Ổ đĩa, CPU và RAM được đổi ở **Tổng quan**, không phải ở đây. |
| **Hoạt động** | **Lịch sử** (các lần deploy) và **Nhật ký trực tiếp**. |

Các ô hiển thị:

- **Tác vụ**: số tác vụ đang chạy, nếu không có thì số tác vụ nhận trong 24 giờ qua, kèm "Chưa có tác vụ nào", "Hôm nay không có lỗi" hoặc "… lỗi hôm nay" (tính trên 20 tác vụ mới nhất của agent). Ô hiện **Đang tắt** khi agent không nhận tác vụ.
- **Kho mã**: số kho sẵn sàng (hoặc đang clone, hoặc lỗi) và tên các kho, hoặc **Chưa có** kèm gợi ý thêm kho.
- **Ổ đĩa**: dung lượng và giá mỗi tháng. Ô cuộn **Tổng quan** xuống khối **Ổ đĩa**, nơi bạn [tăng dung lượng ổ đĩa](#grow-the-disk).
- **Tự động ngủ**: "Sau … phút" hoặc **Đang tắt**, và agent đang thức, đang ngủ hay đang thức dậy. Ô mở tab **Cài đặt** và cuộn tới thẻ **Tự động ngủ**.
- **Cấu hình**: số nhân CPU và bộ nhớ. Ô cuộn **Tổng quan** xuống khối **Cấu hình**, nơi nút **Đổi CPU và RAM** cho phép đổi chúng.
- **Hoạt động**: lần gần nhất agent khởi động và lần đó có thành công không. Ô mở tab **Hoạt động**.

Liên kết có `?tab=` vẫn dùng được: `?tab=variables`, `?tab=advanced` và `?tab=danger` mở **Cài đặt**, còn `?tab=deployments` và `?tab=logs` mở **Hoạt động**. Mọi giá trị `tab` khác sẽ mở **Tổng quan**.

## Tăng dung lượng ổ đĩa {#grow-the-disk}

Khối **Ổ đĩa**, ở tab **Tổng quan** của trang agent bên dưới các ô, hiển thị dung lượng ổ đĩa của agent và giá mỗi tháng. Ổ đĩa chứa cả `/workspace` lẫn `/home/agent`, nên agent cài với `/workspace` mặc định 5 GiB hiển thị **6 GB**.

1. Trong danh sách dung lượng (**Dung lượng mới**), chọn một mức lớn hơn. Khối đưa ra 10, 20, 50, 100 và 200 GB, chỉ những mức lớn hơn ổ đĩa hiện tại, mỗi mức kèm giá mỗi tháng. Khối chỉ hiện khi agent đã có ổ đĩa; để vượt quá 200 GB, hãy dùng API.
2. Chọn **Tăng dung lượng**, kiểm tra dung lượng và giá, rồi chọn **Tăng lên … GB** (hoặc **Hủy**).
3. Khi xong, khối hiển thị **Ổ đĩa hiện là … GB.**

Ổ đĩa được tăng tại chỗ: tệp của bạn được giữ nguyên và agent vẫn chạy. Ổ đĩa không bao giờ giảm được, và lưu trữ tính phí theo dung lượng mới chừng nào ổ đĩa còn tồn tại, kể cả khi agent dừng hoặc ngủ. Chỉ chủ sở hữu hoặc quản trị viên workspace mới tăng được (người khác thấy **Chỉ chủ sở hữu hoặc quản trị viên workspace mới tăng được dung lượng ổ đĩa.**), và cần ví có số dư dương: khi ví hết tiền, khối hiện **Ví đã hết tiền. Hãy nạp thêm để tăng dung lượng ổ đĩa.** kèm liên kết **Nạp tiền vào ví**.

Qua API, tìm ổ đĩa của agent trong `GET /api/workspaces/{slug}/volumes` (`workload_type` là `template` và `workload_id` là ID ứng dụng của bản cài), rồi gửi `PATCH /api/workspaces/{slug}/volumes/{volume_id}` với `{"size_gib": 20}`. Dung lượng nhỏ hơn trả về `400`. Xem [API ổ đĩa](/vi/api/disks). Dung lượng ổ đĩa ghi nhận của agent đi theo volume, nên trang của nó và các plan sau hiển thị đúng ổ đĩa nó thực sự có.

## Mở agent {#open-the-console}

**Mở agent** mở console của agent trong một tab mới (hãy cho phép cửa sổ bật lên nếu trình duyệt chặn). Console không có địa chỉ công khai: chỉ owner và admin của workspace đã đăng nhập mới mở được, một phiên kéo dài tối đa 8 giờ, và nó đóng khi ứng dụng dừng hoặc bạn mất quyền truy cập. API key và ứng dụng được kết nối không thể mở console. Khi agent đang ngủ, nút hiển thị **Đánh thức và mở**: việc đánh thức mất một đến hai phút và ví cần còn tiền (xem [Đánh thức](/vi/guide/agent-environment-and-auto-sleep#waking)).

## Giao tác vụ

Ứng dụng được kết nối hoặc API key có `agents:execute` có thể giao tác vụ cho agent và đọc kết quả. Với agent mới có trình chạy tác vụ, **Nhận tác vụ từ ứng dụng đã kết nối và khóa API** **mặc định bật**; owner hoặc admin có thể tắt bất cứ lúc nào trên trang của agent. Xem [Giao tác vụ cho coding agent](/vi/guide/agent-tasks), gồm cả cảnh báo về thông tin đăng nhập của agent.

## Chi phí và quyền kiểm soát

- Tính toán được tính phí khi agent chạy; lưu trữ (dung lượng `/workspace` bạn chọn, mặc định 5 GiB, cộng 1 GiB cho `/home/agent`, hoặc dung lượng bạn đã tăng lên) được tính phí khi ổ đĩa còn tồn tại, kể cả lúc agent đã dừng. Plan tính giá cả ổ đĩa vào mức trần chi phí.
- Ổ đĩa giữ công việc của bạn qua các lần khởi động lại, ngủ và deploy lại. Sau này bạn có thể [tăng dung lượng](#grow-the-disk) trên trang của agent mà không mất tệp, nhưng không bao giờ giảm được, nên nếu chưa chắc, hãy bắt đầu với dung lượng nhỏ.
- Owner hoặc admin nào cũng có thể dừng hoặc xóa agent bất cứ lúc nào. Agent không giữ thông tin xác thực API TOSE nào cho workspace (khi có push, chỉ có bí mật git proxy cho các kho mã mà nó được push) nên không thể tự thay đổi.
- Với API key, hãy đặt thêm giới hạn chi tiêu ở nhà cung cấp.

Liên quan: [Bảng giá](/vi/guide/pricing), [Bắt đầu](/vi/guide/getting-started).
