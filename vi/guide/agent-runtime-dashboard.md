---
title: "Agent Runtime trên dashboard"
description: "Tạo agent Pi bằng API key nhà cung cấp của chính bạn, đánh thức, cho ngủ, gửi tin nhắn, thêm trigger và MCP server, theo dõi lần chạy, mức dùng và hạn mức của agent trên dashboard TOSE."
---

# Agent Runtime trên dashboard

Agent của Agent Runtime là các agent mà TOSE chạy cho workspace của bạn: chúng thức dậy khi có tin nhắn hoặc trigger, làm việc trong runtime cô lập riêng có ổ đĩa bền vững, rồi ngủ lại. Dashboard có các trang sau cho chúng:

- **`/w/<workspace>/agents/runtime`** liệt kê các agent runtime của workspace, và cho phép owner và admin quản lý agent secret và tạo agent.
- **`/w/<workspace>/agents/<agent_id>`** hiển thị một agent cùng các nút điều khiển, lần chạy, sự kiện và thao tác. Các tab dẫn tới [Trigger](#triggers), [MCP server](#mcp-servers), [Mức dùng](#usage), [Môi trường](#environment) và [Cài đặt](#settings) của agent.

Tất cả các trang đều có bản tiếng Anh và tiếng Việt. Ngoài agent secret, thứ chỉ owner hoặc admin đã đăng nhập mới quản lý được, các trang chỉ gọi API agent của workspace (`/api/workspaces/<workspace>/agents`), nên không làm được gì mà API không làm được.

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
| **Đã xoá** | Đã xóa trong [Cài đặt](#settings) hoặc qua API. Khi agent còn hiện, trang không có nút điều khiển nào. |

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

## Trigger {#triggers}

Trigger là một prompt được lưu sẵn để bắt đầu một lần chạy. Tab **Trigger** liệt kê các trigger của agent, mỗi trigger **Đang bật** hoặc **Đang tắt**, cùng các lần chạy nó đã bắt đầu trong **Lịch sử**. Owner hoặc admin thêm trigger ở **Thêm trigger** và chọn thứ khởi động nó:

| Khởi động bởi | Khi nào bắt đầu lần chạy |
|---------------|--------------------------|
| **Theo yêu cầu** | Khi ai đó chọn **Chạy ngay** (có hỏi xác nhận). |
| **Theo lịch** | Theo biểu thức cron năm trường, trong múi giờ bạn chọn. Trigger hiển thị thời điểm chạy kế tiếp. |
| **Sự kiện workspace** | Khi có `uptime.down`, `uptime.up`, `deployment.failed`, `deployment.succeeded` hoặc `backup.failed`, cho một project hoặc cho mọi project của workspace. |
| **Webhook có chữ ký** | Khi một request được ký bằng signing secret của trigger tới URL webhook của nó. |

- Prompt được lưu lại và **không hiển thị lại**. Đừng đưa secret vào prompt.
- Thêm trigger không bắt đầu gì cả. Mỗi lần chạy mà trigger bắt đầu sau này được trả từ ví trả trước và đánh thức agent nếu nó đang ngủ.
- Với webhook có chữ ký, URL webhook và **signing secret** chỉ hiển thị **một lần**, ngay sau khi bạn thêm trigger. Hãy sao chép secret rồi chọn **Tôi đã lưu lại**; không thể đọc lại secret này.
- **Tắt** có hỏi xác nhận: các lần chạy mà trigger đã xếp hàng nhưng chưa bắt đầu sẽ bị bỏ, và bật lại cũng không khôi phục chúng.
- Trigger theo sự kiện workspace còn có mục **Lượt giao sự kiện**: 100 lượt mới nhất trao sự kiện cho trigger, kèm trạng thái, số lần thử thất bại và lần thử kế tiếp. Owner hoặc admin có thể **Giao lại** một lượt mà nền tảng đánh dấu là thử lại được, sau khi xác nhận rằng một lần chạy có thể bắt đầu và trừ vào số dư trả trước.

## MCP server {#mcp-servers}

Tab **MCP server** liệt kê các MCP server bên ngoài mà agent được gọi, cùng các tool agent được phép dùng trên mỗi server. TOSE tự thực hiện mọi kết nối tới server; runtime của agent không bao giờ kết nối trực tiếp. Owner hoặc admin kết nối server ở **Kết nối server**:

- **Tên** (chữ thường, chữ số và dấu gạch ngang, tối đa 24 ký tự): agent thấy các tool dưới dạng `mcp__<tên>__<tool>`.
- **URL server**: `https` trên một tên miền DNS công khai, không kèm thông tin đăng nhập, query hay fragment. Địa chỉ riêng và nội bộ bị từ chối.
- **Thông tin xác thực**: không có, một [agent secret](#agent-secrets) chọn theo tên (chỉ gửi tới server này, dưới dạng bearer token), hoặc OAuth.
- Các **tool** agent được gọi, tối đa 50, mỗi tool kèm mức rủi ro do chính bạn chọn: **Đọc** chạy không cần duyệt, **Phá huỷ** luôn chờ một người duyệt, còn **Ghi** chờ duyệt trừ khi bạn tích **Duyệt trước các tool ghi**.

Hộp xác nhận nêu host, secret sẽ được gửi tới đó và các tool sẽ chạy không cần duyệt. Kết nối tạo một phiên bản agent mới, làm dừng các lệnh gọi tool của những lần chạy đã bắt đầu trước đó. **Tool mà server cung cấp** hiển thị danh sách do chính server trả về dưới dạng văn bản không tin cậy; bản thân danh sách này không cho phép gì. **Ngắt kết nối** có hỏi xác nhận, và các tool dừng ngay, kể cả với lần chạy đang diễn ra.

Server kết nối bằng OAuth cần owner hoặc admin **Cấp quyền**: nhập authorization server (issuer), client ID của một OAuth client đã đăng ký với nhà cung cấp, và các scope. Sau **Bắt đầu đăng nhập**, trang hiển thị liên kết tới địa chỉ đăng nhập của nhà cung cấp và địa chỉ redirect mà OAuth client phải cho phép; hãy tiếp tục ở đó trong vòng 10 phút, trên cùng trình duyệt. Trang chỉ hiển thị liên kết `https` thuần và không bao giờ tự mở nó.

## Mức dùng và hạn mức cứng {#usage}

Tab **Mức dùng** hiển thị chi phí của agent trong một khoảng ngày theo UTC. Ba khoản được hiển thị cạnh nhau và không bao giờ cộng lại:

- **TOSE đã tính**: trừ vào ví trả trước.
- **Hoá đơn nhà cung cấp**: khoản nhà cung cấp model tính cho API key của chính bạn. Chỉ để tham khảo; TOSE không bao giờ thu khoản này.
- **Không tính phí**: compute đã đo nhưng ngân sách hoặc ví rỗng không đủ chi trả. Khoản này không bị tính và không bị nợ.

Bên dưới là tổng **Theo loại** (compute, lưu trữ, model, điều chỉnh) và **Theo lần chạy**, cùng **Các dòng sổ cái**, có phân trang. Khoản dưới một cent được hiển thị đủ chữ số thật, không phải `$0.00`.

**Hạn mức cứng** hiển thị hạn mức của agent này và của workspace, kèm số đã dùng và còn lại, **Đã dừng** khi một hạn mức đã chạm (compute bị dừng, ổ đĩa được giữ), và năm sự kiện hạn mức mới nhất của agent. Hạn mức được đặt ở trang ví (**Mở ví và mức dùng**). Xem [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing#hard-budgets).

## Môi trường {#environment}

Tab **Môi trường** cho owner và admin xem, ở chế độ chỉ đọc, [môi trường](/vi/guide/agent-environment-and-auto-sleep#agent-runtime-environment) được lưu với phiên bản hiện tại của agent: các biến cùng giá trị, mỗi tham chiếu secret dưới dạng tên agent secret mà nó trỏ tới, và script cài đặt dưới dạng kích thước, số dòng, chính sách và SHA-256. Trang không bao giờ hiển thị giá trị secret hay nội dung script. Khi nền tảng báo môi trường chưa được áp dụng, trang sẽ nói rõ: đừng cho rằng các biến hay kết quả của script đã có bên trong agent.

## Cài đặt {#settings}

Ở tab **Cài đặt**, owner hoặc admin đổi tên, nhà cung cấp, model hoặc API key nhà cung cấp của agent bằng **Lưu thành phiên bản mới**. Các lần chạy đã bắt đầu vẫn giữ phiên bản lúc bắt đầu. Nếu agent bị thay đổi ở nơi khác sau khi bạn mở trang, không có gì được lưu: hãy tải lại trang rồi thay đổi lại.

**Xoá agent này** yêu cầu bạn gõ tên agent. Xóa sẽ dừng agent và các lần chạy của nó, và các trigger của nó không còn bắt đầu gì nữa. TOSE giữ checkpoint và ổ đĩa của agent cho tới khi việc xóa được xác minh.

## Chưa có trên dashboard {#api-only}

Việc thay đổi [môi trường](/vi/guide/agent-environment-and-auto-sleep#agent-runtime-environment) của agent hiện làm qua API agent của workspace (`/api/workspaces/<workspace>/agents`).

## Liên quan

- [Steer một run agent đang chạy](/vi/guide/agent-steering)
- [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing)
- [API usage và hạn mức agent](/vi/api/agent-usage)
- [Môi trường của agent Agent Runtime](/vi/guide/agent-environment-and-auto-sleep#agent-runtime-environment)
- [`tose agents`](/vi/commands/agents)
- [Cloud Agents](/vi/guide/cloud-agents)
