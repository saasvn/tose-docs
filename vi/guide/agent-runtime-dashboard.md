---
title: "Agent Runtime trên dashboard"
description: "Tạo agent Pi bằng API key nhà cung cấp của chính bạn, đánh thức, cho ngủ, gửi tin nhắn và theo dõi lần chạy, sự kiện và thao tác của agent trên dashboard TOSE."
---

# Agent Runtime trên dashboard

Agent của Agent Runtime là các agent mà TOSE chạy cho workspace của bạn: chúng thức dậy khi có tin nhắn hoặc trigger, làm việc trong runtime cô lập riêng có ổ đĩa bền vững, rồi ngủ lại. Dashboard có hai trang cho chúng:

- **`/w/<workspace>/agents/runtime`** liệt kê các agent runtime của workspace, và cho phép owner và admin quản lý agent secret và tạo agent.
- **`/w/<workspace>/agents/<agent_id>`** hiển thị một agent cùng các nút điều khiển, lần chạy, sự kiện và thao tác.

Cả hai trang đều có bản tiếng Anh và tiếng Việt. Ngoài agent secret, thứ chỉ owner hoặc admin đã đăng nhập mới quản lý được, các trang chỉ gọi [API agent của workspace](#api-only), nên không làm được gì mà API không làm được.

::: warning Tình trạng khả dụng
Nền tảng TOSE phải bật Agent Runtime (`AGENT_RUNTIME_ENABLED`). Khi tắt, các trang báo **Agent Runtime chưa được bật** và trang Cloud Agents không hiện liên kết tới chúng. Tính năng chưa được phát hành rộng rãi.
:::

Mở **Cloud Agents** trên thanh bên của workspace (`/w/<workspace>/agents`). Khi Agent Runtime được bật, trang đó có liên kết tới nó: **Agent Runtime: các agent thức dậy khi có tin nhắn hoặc trigger**. Các coding agent tuyển chọn (Claude Code, Codex và template Pi, xem [Cloud Agents](/vi/guide/cloud-agents)) vẫn nằm ở trang Cloud Agents và không được liệt kê trong Agent Runtime.

## Khóa model của bạn {#model-key}

Agent runtime gọi model bằng **API key nhà cung cấp của chính workspace bạn**. TOSE không tính phí token model: nhà cung cấp tính, còn TOSE tính phí compute và lưu trữ từ ví trả trước ([giá BYOK](/vi/guide/agent-runtime-pricing#model-keys)). **Agent runtime không hỗ trợ đăng nhập bằng gói thuê bao** (như gói Claude hay ChatGPT).

Khóa được lưu dưới dạng **agent secret của workspace**: một giá trị có tên, được mã hóa, thuộc workspace. Cấu hình agent chỉ giữ **tên** của secret; giá trị không bao giờ hiện trên trang nào, không bao giờ được API trả về, và không bao giờ ghi vào sự kiện hay log.

### Thêm khóa làm agent secret {#agent-secrets}

Thêm khóa ở trang Agent Runtime, trong thẻ **Agent secret**, trước khi tạo agent. Chỉ **owner hoặc admin** đã đăng nhập dashboard mới thấy thẻ này. API key và ứng dụng đã kết nối không bao giờ đọc hay thay đổi được agent secret, và CLI không có lệnh cho việc này, nên hãy làm trên dashboard.

1. Nhập **Tên secret**: từ 1 đến 63 ký tự gồm chữ thường, chữ số, `-` hoặc `_`, ví dụ `anthropic-key`. Agent tham chiếu secret bằng tên này.
2. Dán khóa vào ô **Giá trị**: một dòng, tối đa 8 KiB. Ô nhập được xóa ngay khi giá trị được gửi đi, và giá trị không bao giờ hiển thị lại.
3. Chọn **Lưu secret**.

Thẻ liệt kê tên của từng secret và thời điểm cập nhật gần nhất. Lưu một tên đã có sẽ thay giá trị của nó sau khi bạn xác nhận; **Xoá** cũng hỏi xác nhận trước.

::: warning Một kho chung cho cả workspace
Cùng các agent secret này được dùng bởi mọi thứ tham chiếu tới chúng theo tên: API key nhà cung cấp của agent Pi, thông tin xác thực của MCP server, thông tin đăng nhập hoặc secret của recipe trình duyệt, và API key của nhà cung cấp quyết định cho trình duyệt (tên bắt đầu bằng `decision-`). Thay một giá trị sẽ áp dụng cho tất cả ở lần đọc tiếp theo (agent Pi là ở lần chạy tiếp theo). Xóa một secret sẽ làm tất cả ngừng hoạt động từ lần dùng tiếp theo cho tới khi một secret cùng tên được thêm lại. Lần chạy Pi đang diễn ra vẫn giữ khóa nó đã nhận lúc bắt đầu.
:::

## Danh sách agent {#agent-list}

Danh sách hiển thị mỗi agent runtime cùng trạng thái:

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Đang thiết lập** | TOSE đang chuẩn bị ổ đĩa cho agent. |
| **Đang ngủ** | Không có compute nào chạy. Ổ đĩa và phiên làm việc của agent được giữ lại. |
| **Đang thức** | Runtime của agent đang chạy và được tính phí. |
| **Đã xoá** | Đã xóa qua API. Khi agent còn hiện, trang không có nút điều khiển nào. |

Khi nền tảng vẫn đang thực hiện một yêu cầu, agent còn hiện trạng thái nó đang chuyển sang (ví dụ **Đang chuyển sang: Đang thức**). Trạng thái mà dashboard không biết được hiện bằng giá trị gốc.

### Tạo agent Pi {#create}

Chỉ **owner hoặc admin** của workspace mới tạo được agent. Member xem được danh sách và có thể mở agent để đánh thức, cho ngủ, gửi tin nhắn và hủy lần chạy. Pi là engine đang có. Điền vào **Tạo agent Pi**:

| Ô | Nhập gì |
|---|---------|
| **Tên** | Tối đa 80 ký tự. |
| **Nhà cung cấp model** | `anthropic`, `openai` hoặc `google`. |
| **Model** | ID model của nhà cung cấp, đúng như API của họ yêu cầu. |
| **API key nhà cung cấp** | Chọn agent secret chứa khóa cho nhà cung cấp đó ([thêm trước](#agent-secrets)). Trang không bao giờ đọc hay hiển thị giá trị của nó. |

**Tạo agent** đưa bước thiết lập vào hàng đợi. Agent mới bắt đầu ở trạng thái **ngủ**. Compute chỉ tính phí khi agent thức; ổ đĩa vẫn tính phí lưu trữ cả khi agent ngủ ([miễn phí, được miễn và phải trả](/vi/guide/agent-runtime-pricing#free-forgiven-owed)).

## Trang của một agent {#agent-page}

Chọn một agent trong danh sách để mở trang của nó.

### Trạng thái {#state}

Trang hiển thị trạng thái **Hiện tại** bên cạnh trạng thái **Được yêu cầu**, cùng phiên bản cấu hình. Khi hai trạng thái khác nhau, một ghi chú cho biết nền tảng vẫn đang chuyển agent sang trạng thái được yêu cầu. Mỗi yêu cầu bên dưới được đưa vào hàng đợi, và trạng thái chỉ thay đổi khi nền tảng đã thực hiện xong và kiểm tra lại.

### Điều khiển {#controls}

| Nút | Tác dụng |
|-----|----------|
| **Đánh thức** | Khởi động runtime của agent. Agent đang thức được tính phí từ ví trả trước. |
| **Ngủ sau lần chạy hiện tại** | Để lần chạy đang diễn ra hoàn tất, rồi dừng runtime. Việc đang chờ bắt đầu bị hủy. |
| **Ngủ ngay** | Dừng runtime ngay. Trang hỏi xác nhận trước, vì lần chạy đang diễn ra sẽ bị dừng và có thể kết thúc ở trạng thái **Bị gián đoạn**. Ổ đĩa và phiên làm việc được giữ lại. |

Agent đang thức cũng tự ngủ sau 15 phút không có việc. Một yêu cầu trong hàng đợi, một lần chạy đang diễn ra hoặc một phê duyệt đang chờ sẽ giữ agent thức.

### Gửi tin nhắn {#send}

**Gửi và bắt đầu lần chạy** bắt đầu một lần chạy mới với tin nhắn của bạn và đánh thức agent nếu nó đang ngủ. Chi phí compute trừ vào ví trả trước. Tin nhắn dài tối đa 100.000 byte và **không được hiển thị lại** trên trang.

Nếu ví hoặc ngân sách của agent không đủ cho lần chạy, trang sẽ báo: hãy nạp thêm rồi thử lại ([hạn mức](/vi/guide/agent-runtime-pricing#hard-budgets)).

### Lần chạy {#runs}

Danh sách lần chạy hiển thị trạng thái, thời điểm tạo và thời điểm kết thúc của mỗi lần chạy:

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Trong hàng đợi** | Đang chờ bắt đầu. |
| **Đang chạy** | Engine đang xử lý. |
| **Đang huỷ** | Đã yêu cầu hủy; engine được yêu cầu dừng, và TOSE dừng runtime nếu engine không xác nhận. |
| **Hoàn tất** | Engine đã chạy xong. |
| **Thất bại** | Lần chạy kết thúc với lỗi. |
| **Đã huỷ** | Bị dừng trước khi bắt đầu. |
| **Bị gián đoạn** | Bị dừng khi đang chạy, và engine đã xác nhận việc dừng. |
| **Không rõ kết quả** | Nền tảng không chứng minh được lần chạy đã kết thúc ra sao. |

**Không rõ kết quả** được hiển thị đúng như vậy, không bao giờ bị hiển thị là thành công hay thất bại: hãy tự kiểm tra kết quả của agent trước khi dựa vào nó.

Lần chạy chưa kết thúc có nút **Huỷ lần chạy**, có hỏi xác nhận. Phần việc lần chạy đã làm được giữ lại. Khi đã yêu cầu hủy, nút được thay bằng **Đã yêu cầu huỷ**. Mỗi lần chạy có liên kết tới trang riêng, nơi bạn có thể [steer](/vi/guide/agent-steering#dashboard) lần chạy đang diễn ra bằng một chỉ dẫn bổ sung.

### Sự kiện và thao tác gần đây {#events}

- **Sự kiện** liệt kê những gì nền tảng và engine đã làm cho agent này, mới nhất ở trên. Chi tiết sự kiện được hiển thị dạng văn bản thuần.
- **Thao tác gần đây** liệt kê mỗi lần tạo, đánh thức, ngủ, gửi tin nhắn và hủy, kèm trạng thái (**Trong hàng đợi**, **Đang thực hiện**, **Xong** hoặc **Đã bỏ cuộc**) và người yêu cầu: một người dùng, một API key, một ứng dụng đã kết nối, một lịch chạy, một webhook, một sự kiện nền tảng hoặc chính TOSE.

### Bấm hai lần vẫn an toàn {#retries}

Mỗi nút bị vô hiệu hóa trong khi yêu cầu của nó đang được gửi, và mỗi yêu cầu mang một idempotency key. Nếu phản hồi bị mất (lỗi mạng hoặc lỗi máy chủ), trang thử lại với cùng khóa, nên bấm hai lần hay thử lại chỉ có tác dụng một lần. Tin nhắn mới hoặc thao tác khác dùng khóa mới.

## Chưa có trên dashboard {#api-only}

Những việc sau hiện làm qua API agent của workspace (`/api/workspaces/<workspace>/agents`):

- sửa tên, model hay khóa của agent, và xóa agent;
- [môi trường](/vi/guide/agent-environment-and-auto-sleep#agent-runtime-environment), trigger và MCP server của agent;
- [mức sử dụng và hạn mức](/vi/api/agent-usage) của agent.

## Liên quan

- [Steer một run agent đang chạy](/vi/guide/agent-steering)
- [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing)
- [API usage và hạn mức agent](/vi/api/agent-usage)
- [`tose agents`](/vi/commands/agents)
- [Cloud Agents](/vi/guide/cloud-agents)
