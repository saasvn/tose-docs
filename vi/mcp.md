# TOSE MCP Connector

TOSE MCP connector cho phép một MCP client như Claude kiểm tra deployment và đọc log trong một workspace TOSE. Khi bạn phê duyệt rõ ràng, client còn có thể deploy hoặc rollback project.

- **Server URL:** `https://app.tose.sh/mcp` (Streamable HTTP). OAuth issuer là `https://app.tose.sh`. Nếu bạn tự vận hành instance TOSE, hãy dùng origin của chính bạn, xem [Instance tự vận hành](/vi/mcp/oauth#instance-tu-van-hanh).
- **Xác thực:** OAuth 2.1 bằng tài khoản TOSE. Client tự tìm mọi thông tin từ server URL nên bạn không cần dán API key.
- **Bật/tắt:** đơn vị vận hành bật connector bằng `MCP_ENABLED=true`. Nếu `/mcp` trả về 404 thì instance TOSE đó chưa bật connector.

## Kết nối

1. Trong MCP client, thêm custom connector với server URL ở trên.
2. Client mở một trang TOSE trên trình duyệt. Đăng nhập nếu được hỏi.
3. Ở màn hình đồng ý, chọn **một workspace**. Kết nối chỉ thấy được workspace đó.
4. Nếu client xin quyền deploy, sẽ có ô **cho phép deploy và rollback**. Để trống nếu chỉ muốn quyền đọc. Chỉ owner và admin của workspace mới tick được ô này.
5. Bấm **Approve** để quay lại client và hoàn tất kết nối.

Muốn kết nối workspace khác thì thêm connector lần nữa và chọn workspace đó.

## Tools

| Tool | Chức năng | Có thay đổi gì không? |
|------|-----------|-----------------------|
| `list_projects` | Liệt kê project trong workspace kèm deployment mới nhất. Có thể truyền `query` và `limit` (tối đa 100). | Không |
| `get_deployment_status` | Trạng thái của một deployment (hoặc deployment mới nhất) và 5 deployment gần nhất. | Không |
| `inspect_deployment` | Commit, branch, tác giả, image, trigger, thời gian, URL và lỗi của một deployment. | Không |
| `read_logs` | `source=build` đọc build log của một deployment. `source=runtime` đọc log ứng dụng gần đây (tối đa 24 giờ, có thể lọc theo `level`). Trả về tối đa 500 dòng và 64 KB. | Không |
| `list_project_env_keys` | Liệt kê tên các biến môi trường của project và trạng thái đã đặt hay chưa. Cần scope `env:read`. Không bao giờ trả giá trị. | Không |
| `inspect_project_env` | Cùng metadata cho một tên biến. Cần scope `env:read`. Không bao giờ trả giá trị. | Không |
| `plan_project_env_update` | Lập kế hoạch `set`, `rotate` hoặc `delete` cho tối đa 20 biến. Chỉ nhận tên và thao tác. Cần scope `env:write`. | Không, trả về kế hoạch và link phê duyệt |
| `apply_project_env_update` | Lưu các thay đổi bạn đã duyệt trong TOSE. Chỉ nhận project và approval token. Cần scope `env:write`. | **Có**, cần phê duyệt |
| `deploy_project` | Build và deploy commit đầu của branch đã kết nối, đúng commit hiển thị trong kế hoạch. | **Có**, cần phê duyệt |
| `rollback_deployment` | Đưa image của một deployment cũ lên chạy lại. | **Có**, cần phê duyệt |
| `plan_runbook` | Lập kế hoạch restart hoặc rollback chỉ-đọc và trả về `approval_url`. | Không |
| `execute_runbook` | Chạy kế hoạch bạn đã duyệt, một lần cho mỗi `idempotency_key`. | **Có**, cần phê duyệt khi đã đăng nhập |
| `get_runbook` | Đọc kế hoạch, trạng thái phê duyệt và kết quả đã xác minh. | Không |

### Tool ngân sách autoscaling

Khi nền tảng bật [ngân sách autoscaling](/vi/guide/autoscaling-budgets), có thêm hai tool:

| Tool | Chức năng | Có thay đổi gì không? |
|------|-----------|-----------------------|
| `autoscaling_budget_get` | Đọc các trần, mức sử dụng và quỹ dự phòng floor của workspace, hoặc của một project. Có thể truyền `project_slug`; không có thì trả ngân sách workspace. Cần `projects:read`. | Không |
| `autoscaling_budget_plan` | Đề xuất trần hoặc floor mới. Nó trả về một kế hoạch và liên kết duyệt; ngân sách không đổi cho đến khi owner hoặc admin duyệt kế hoạch trên dashboard. Cần `projects:write` và vai trò owner hoặc admin. | Không, cho đến khi có người duyệt |

`autoscaling_budget_plan` nhận các tham số sau:

| Tham số | Ý nghĩa |
|---------|---------|
| `project_slug` | Tùy chọn. Một project của workspace đã kết nối; bỏ qua để dùng ngân sách workspace. |
| `caps` | Bắt buộc. `{"hourly_nano_usd": n hoặc null, "monthly_nano_usd": n hoặc null}`. Cần đủ cả hai key; `null` nghĩa là không có trần. |
| `floor` | Chỉ với project. `{"replicas": 1-100, "cpu": "0.25"-"64", "ram": "0.5"-"256"}`. Bỏ qua để giữ floor hiện có của project. |
| `remove_floor` | Chỉ với project. `true` đề xuất gỡ floor. Không gửi cùng `floor`. |

Kế hoạch project không có `floor` giữ floor của revision ngân sách mà kế hoạch được tạo dựa trên, nên floor mà một người đã đổi trong lúc đó không bị hoàn lại. Floor trên ngân sách workspace là `INVALID_ARGUMENT`.

Agent không bao giờ tự duyệt được kế hoạch ngân sách của mình: không có tool MCP nào duyệt, và việc duyệt cần phiên đăng nhập của một người, trên thực tế là dashboard. Kế hoạch hết hạn sau 30 phút. Đề xuất lại cùng một thay đổi sẽ trả lại cùng kế hoạch đang chờ.

Khi bật ngân sách, `deploy_project` từ chối lần khởi chạy làm vượt trần (`BUDGET_CAP`) hoặc làm quỹ dự phòng floor thiếu tiền (`INSUFFICIENT_BALANCE`). Nếu không kiểm tra được ngân sách, không có gì được khởi chạy và tool trả `UNAVAILABLE` có thể thử lại; hãy thử lại sau ít phút. Xem [Lỗi](/vi/api/errors#mcp-budget-codes).

Connector không có tool gọi API tùy ý. Nó không đọc được giá trị của biến môi trường, và không truy cập được domain, database, thanh toán hay thành viên. Nó chỉ thay đổi được biến qua [tool cập nhật env](#tool-cap-nhat-env) có cổng phê duyệt, nơi bạn tự nhập mọi giá trị trong TOSE, không bao giờ nhập trong chat.

### Tool metadata env

`list_project_env_keys` và `inspect_project_env` trả lời câu hỏi "biến này đã được cấu hình chưa?" mà không có giá trị nào rời khỏi TOSE. Dùng chúng để phân biệt một cấu hình bị thiếu như `S3_ENDPOINT` với một cấu hình bị sai, thay vì đoán từ log.

- **Scope:** cả hai tool cần `env:read`. Scope mặc định tắt và chỉ được cấp khi bạn tick ô riêng của nó trên trang consent. Không có scope thì `tools/list` không hiển thị hai tool. Xem [Scope](/vi/mcp/oauth#metadata-bien-moi-truong-env-read).
- **Mỗi biến trả về:** tên, `state`, có phải secret hay không (`is_secret`), lần thay đổi gần nhất, và `changed_since_deploy` khi project có deployment đang chạy. Không bao giờ có giá trị, độ dài hay tiền tố.
- **Các giá trị `state`:**
  - `set`: đã lưu một giá trị không rỗng.
  - `empty`: biến được lưu với giá trị rỗng.
  - `undecryptable`: TOSE không giải mã được giá trị đã lưu.
  - `unknown`: TOSE không cho người gọi này biết. Thành viên luôn thấy `unknown`; chỉ owner và admin mới thấy `set` hoặc `empty` thật.
  - `unset`: không có biến nào mang tên đó (chỉ với `inspect_project_env`).
- **Danh sách:** `list_project_env_keys` trả tối đa 100 tên mỗi trang, kèm `total`, `redeploy_required` và `next_cursor` (chuỗi mờ). Gửi lại cursor để lấy trang kế tiếp. Cursor chỉ dùng được cho project đã cấp ra nó.
- **Tên trông như giá trị:** nếu một tên đã lưu trông như giá trị bị dán nhầm, ví dụ chứa `=` hoặc `://`, danh sách hiển thị `[withheld]` thay cho tên. `inspect_project_env` từ chối tên như vậy, tên rỗng và tên quá dài bằng `INVALID_ARGUMENT`.
- **Workspace khác:** project của workspace khác trả `NOT_FOUND`, giống như project không tồn tại.
- **Redeploy:** đổi biến không bao giờ tự deploy. Biến đổi sau deployment đang chạy cần redeploy.

### Tool cập nhật env

`plan_project_env_update` và `apply_project_env_update` cho phép agent đổi biến môi trường mà không bao giờ chạm vào giá trị. Agent nói biến nào cần đổi, bạn nhập giá trị trong TOSE và duyệt, rồi agent áp dụng kế hoạch đã duyệt.

- **Scope:** cả hai tool cần `env:write`. Owner hoặc admin bật bằng ô riêng trên trang consent. Scope này không cấp `env:read`, nên kết nối cần liệt kê biến thì phải có cả hai. Không có scope thì `tools/list` không hiển thị hai tool. Xem [Scope](/vi/mcp/oauth#cap-nhat-bien-moi-truong-env-write).
- **Thao tác:** `set` tạo hoặc thay biến, `rotate` thay một biến đã có bằng giá trị mới không rỗng, `delete` xóa biến. `rotate` và `delete` phải nêu biến đã tồn tại, nếu không kế hoạch trả `NOT_FOUND`. Một kế hoạch có 1 đến 20 mục, mỗi mục gồm `op` và `key` (chữ, số và dấu gạch dưới, không bắt đầu bằng chữ số), mỗi tên một mục. Mỗi giá trị tối đa 8 KiB.

1. **Lập kế hoạch.** Gọi `plan_project_env_update` với slug project và các mục `{op, key}`. Chỉ gửi tên và thao tác: request có chứa giá trị sẽ bị từ chối và không có gì được lập. Lệnh gọi không thay đổi gì. Nó trả về kế hoạch, `approval_url` và `approval_token` dùng một lần. `idempotency_key` tùy chọn (1 đến 255 ký tự ASCII in được) giúp client lấy lại, trong 24 giờ, kết quả của kế hoạch đã áp dụng. Cùng key với thay đổi khác trả `IDEMPOTENCY_CONFLICT`.
2. **Duyệt trong TOSE.** Mở `approval_url` khi đã đăng nhập bằng tài khoản owner hoặc admin đã yêu cầu kế hoạch. Nhập giá trị mới cho từng `set` và `rotate` ngay trên trang đó, rồi duyệt. Giá trị đi từ trình duyệt của bạn tới TOSE và không qua client. Biến đã có giữ nguyên cờ secret, biến mới được lưu dưới dạng secret. TOSE mã hóa giá trị nhận được và xóa giá trị đang chờ khi kế hoạch được áp dụng, rút lại hoặc hết hạn.
3. **Áp dụng.** Bảo client tiếp tục. Client gọi `apply_project_env_update` với project và `approval_token`, và chỉ khi đó TOSE mới lưu thay đổi. Kết quả cho biết đã áp dụng gì và, khi có biên nhận deployment, deployment đang chạy có khác không (`redeploy_required`).

- **Kế hoạch cũ cần duyệt lại.** Nếu các biến đã lưu thay đổi sau khi kế hoạch được lập, lệnh áp dụng trả `APPROVAL_STALE`. Hãy bảo agent lập kế hoạch mới bằng `plan_project_env_update` rồi duyệt lại. Phê duyệt đang chờ, hết hạn, bị từ chối hoặc đã rút lại trả `APPROVAL_PENDING`, `APPROVAL_EXPIRED` hoặc `APPROVAL_USED`. Gọi lại lệnh áp dụng với token đã áp dụng sẽ trả kết quả trước đó kèm `replayed: true`.
- **Thay đổi có hiệu lực sau một lần redeploy riêng.** Áp dụng chỉ lưu cấu hình. Ứng dụng đang chạy giữ môi trường hiện tại cho đến khi bạn redeploy, ví dụ bằng `deploy_project`.
- **Giá trị không bao giờ đi qua MCP.** Không tool nào nhận hay trả giá trị, và không có tool nào để hiện hoặc kéo giá trị. Lịch sử audit chỉ ghi tên thao tác và tên biến.
- **Gõ "ok" trong chat không duyệt được gì.** Việc duyệt chỉ diễn ra trên trang TOSE, như mô tả ở [Cơ chế phê duyệt](#co-che-phe-duyet).

### Công cụ feedback {#cong-cu-feedback}

Hai tool cho phép agent báo lỗi của chính TOSE hoặc đề xuất tính năng, qua cùng dịch vụ với [Feedback API](/vi/api/feedback). Chúng chỉ tồn tại khi feedback được bật.

| Tool | Chức năng | Scope |
|------|-----------|-------|
| `submit_feedback` | Gửi báo cáo: `type`, `component`, `title`, `description`, và tùy chọn `reproduction_steps`, `correlation_id`, `idempotency_key`, cùng `environment` và `error_codes` khi `include_diagnostics: true`. Không chỉ định được workspace, người dùng hay repository: người báo là bạn và workspace là của chính kết nối. | `feedback:write` |
| `get_feedback` | Trả về trạng thái của báo cáo bạn đã gửi từ cùng workspace. Người khác nhận `NOT_FOUND`. | `workspace:read` |

`feedback:write` có ô đồng ý riêng trên màn hình kết nối, và bất kỳ thành viên nào cũng cấp được cho kết nối của mình. Không scope nào khác bao hàm nó và nó không cấp gì khác, nên các key `workspace:write` hiện có vẫn hoạt động và không có thêm scope này. Việc đăng là bất đồng bộ: báo cáo mới không bao giờ hiển thị là đã đăng, và `issue_url` chỉ xuất hiện khi GitHub đã xác nhận issue. Bí mật và dữ liệu cá nhân được che trước, diagnostics là tùy chọn, giới hạn là 20 báo cáo mỗi người và 60 mỗi workspace mỗi giờ (`RATE_LIMITED`). Gửi lại với cùng `idempotency_key` trả về báo cáo đầu tiên. Xem [Scope](/vi/mcp/oauth#scope).

### Cơ chế phê duyệt

`deploy_project` và `rollback_deployment` luôn chạy hai bước:

1. Lần gọi đầu không thay đổi gì. Nó trả về một **kế hoạch**, một `approval_url` và một `approval_token` dùng một lần. Kế hoạch cho biết project, phiên bản đang chạy và tác động. Kế hoạch deploy còn cho biết repository, branch và commit sẽ được build. Kế hoạch rollback cho biết deployment đích.
2. Mở `approval_url` trên trình duyệt. TOSE hiển thị kế hoạch dưới tài khoản của bạn. Bấm **Approve** hoặc **Decline**.
3. Bảo client tiếp tục. Client gọi lại tool với token, và chỉ khi đó TOSE mới deploy hoặc rollback.

**Việc phê duyệt diễn ra trong trình duyệt của bạn, tại `approval_url`. Gõ "ok" hay "đồng ý" trong khung chat không phê duyệt được gì.** Client không thể phê duyệt thay bạn: token không có tác dụng cho tới khi bạn phê duyệt kế hoạch trên trang TOSE. Kế hoạch đã bị từ chối sẽ không bao giờ chạy được. Bạn cũng có thể mở lại link và rút lại phê duyệt khi client chưa dùng nó.

Phê duyệt deploy chỉ áp dụng cho commit hiển thị trong kế hoạch. Nếu có người push lên branch trước khi deploy bắt đầu, TOSE từ chối với `APPROVAL_STALE` và không build gì. Hãy yêu cầu kế hoạch mới để xem commit mới.

Token phê duyệt gắn với user, kết nối, project, hành động và deployment đích khi rollback. Token hết hạn sau 10 phút và chỉ dùng được một lần. Nếu client gửi lại một token đã dùng, TOSE trả về deployment ban đầu và không deploy lần nữa.

Mỗi lệnh ghi còn cần đủ các điều kiện sau:

- Kết nối được cấp quyền deploy ở màn hình đồng ý (scope `deployments:write`, hoặc scope hẹp hơn là `deployments:execute` cho deploy và `deployments:rollback` cho rollback).
- Tại thời điểm gọi, bạn vẫn là owner hoặc admin của workspace.
- Project không có deployment nào khác đang chạy.

### Mã lỗi

Khi tool lỗi, nội dung trả về bắt đầu bằng một mã cố định:

| Mã | Ý nghĩa |
|----|---------|
| `NOT_FOUND` | Project hoặc deployment không nằm trong workspace đã kết nối. |
| `INVALID_ARGUMENT` | Thiếu tham số hoặc tham số ngoài phạm vi. |
| `INSUFFICIENT_SCOPE` | Kết nối thiếu scope mà tool này cần, ví dụ kết nối chỉ-đọc gọi tool ghi. Hãy kết nối lại và cho phép deploy. |
| `FORBIDDEN` | Vai trò của bạn không được deploy hay rollback, hoặc, với tool cập nhật env, bạn không phải owner hay admin. |
| `APPROVAL_PENDING` | Bạn chưa phê duyệt kế hoạch. Mở `approval_url`, phê duyệt, rồi bảo client tiếp tục. |
| `APPROVAL_STALE` | Branch có commit mới sau khi bạn phê duyệt. Chưa có gì được deploy. Yêu cầu kế hoạch mới và xem commit mới. Với cập nhật env, các biến của project đã thay đổi sau khi kế hoạch được lập và chưa có gì được lưu. Hãy lập kế hoạch lại. |
| `APPROVAL_INVALID`, `APPROVAL_EXPIRED`, `APPROVAL_USED` | Phê duyệt sai, hết hạn, đã bị từ chối, đã rút lại hoặc đã dùng. Gọi tool không kèm `approval_token` để lấy kế hoạch mới; với cập nhật env, gọi lại `plan_project_env_update`. |
| `INVALID_IDEMPOTENCY_KEY`, `IDEMPOTENCY_CONFLICT` | `idempotency_key` của cập nhật env không phải 1 đến 255 ký tự ASCII in được, hoặc đã được dùng cho thay đổi khác. |
| `DEPLOY_IN_PROGRESS` | Theo dõi deployment đang chạy bằng `get_deployment_status`. |
| `NO_GIT_CONNECTION`, `NO_SERVER`, `NO_IMAGE` | Project chưa sẵn sàng cho thao tác này. Sửa trong dashboard. |
| `CONFLICT` | Project đang bị khóa, ví dụ khi chuyển môi trường. |
| `UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL` | Lỗi tạm thời. Thử lại sau. |

## Prompt mẫu

- "Project TOSE nào của tôi deploy lỗi lần gần nhất?"
- "Vì sao lần deploy mới nhất của `shop-api` lỗi? Cho tôi xem các dòng build log liên quan."
- "Cho xem log lỗi của `shop-api` trong 30 phút qua."
- "Deploy `marketing-site`." Client sẽ hiển thị kế hoạch và đường link để bạn phê duyệt.
- "Rollback `shop-api` về deployment trước bản hiện tại."

## Dữ liệu và quyền riêng tư

- **Connector đọc gì:** project, deployment, build log và runtime log của workspace bạn đã chọn. Với `env:read`, còn đọc tên và trạng thái đã đặt của biến môi trường trong project, không bao giờ đọc giá trị. Với `env:write`, còn lập và áp dụng thay đổi biến mà bạn duyệt trong TOSE, nhưng vẫn không bao giờ nhận giá trị.
- **Không bao giờ trả về:** giá trị biến môi trường, thông tin đăng nhập database, registry hay cluster, và API key.
  - Trước khi trả log, commit message và thông báo lỗi, TOSE xóa giá trị biến môi trường của project và các dạng credential phổ biến: URL có mật khẩu, bearer token, private key, token cloud và GitHub, JWT.
  - Việc xóa này chỉ là best effort, vì vậy đừng in secret ra log ứng dụng.
- **TOSE lưu gì:**
  - Thông tin client đã đăng ký: tên và redirect URI.
  - Hash của token. Access token có hạn 1 giờ, refresh token có hạn 30 ngày.
  - Một bản ghi audit cho mỗi lần gọi tool, gồm user, client, workspace, project, deployment, tool, kết quả và mã lỗi. Deploy và rollback được ghi lại trước khi chạy.
  - Với mỗi kế hoạch deploy hoặc rollback: nội dung kế hoạch hiển thị trên trang phê duyệt và việc bạn có phê duyệt hay không.
  - Với mỗi kế hoạch cập nhật env: thao tác và tên biến (đã mã hóa), cùng giá trị bạn nhập (đã mã hóa) cho đến khi kế hoạch được áp dụng, rút lại hoặc hết hạn. Bản ghi audit chỉ có tên thao tác và tên biến.
  - Tham số và kết quả của các tool khác không được lưu.

## Thu hồi quyền

Refresh token có hạn 30 ngày, vì vậy hãy thu hồi kết nối bạn không còn tin tưởng thay vì chờ nó hết hạn. Bạn có thể thu hồi theo các cách sau:

- Trong dashboard, mở **Settings** của workspace, rồi chọn **Agent access**. Trang này liệt kê các kết nối của bạn, kết nối của workspace này ở đầu và các kết nối khác được gắn tên workspace của chúng. Bấm **Revoke** cạnh kết nối cần thu hồi: client bị đăng xuất ngay và phải kết nối lại. Bạn chỉ thấy và thu hồi được kết nối của chính mình.
- Gỡ connector trong MCP client. Client nào hỗ trợ thu hồi OAuth token sẽ thu hồi ngay.
- Từ phiên dashboard đã đăng nhập, gọi `DELETE /api/mcp/connections/{family_id}`. Dùng `GET /api/mcp/connections` để xem danh sách kết nối. API key không gọi được hai route này; xem [API key và scope](/vi/api/api-keys#route-tu-choi-api-key).
- Khi bạn mất quyền thành viên workspace, kết nối bị cắt ngay. Nếu bạn bị hạ xuống member, quyền deploy và cập nhật env bị gỡ ngay.

## Hỗ trợ

Để được hỗ trợ hoặc báo lỗi connector, hãy liên hệ đơn vị vận hành instance TOSE của bạn và gửi kèm thời điểm gọi cùng mã lỗi.
