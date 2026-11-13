# TOSE MCP Connector

TOSE MCP connector cho phép một MCP client như Claude kiểm tra deployment, đọc log và incident, làm việc với template và CI trong một workspace TOSE. Khi bạn phê duyệt rõ ràng, client còn có thể deploy hoặc rollback project.

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

## Tools {#tools}

Số lượng tool không cố định. `tools/list` chỉ cho một kết nối thấy những tool mà các [scope](/vi/mcp/oauth#scope) đã duyệt cho phép, và một số nhóm chỉ có khi đơn vị vận hành server bật tính năng tương ứng. Kết nối chỉ-đọc thấy các tool đọc về project, deployment, log, incident, runbook và template, cùng `autoscaling_budget_get` và `get_feedback` khi các tính năng đó được bật. Mọi tool khác cần một scope được cấp trên màn hình đồng ý.

| Nhóm | Scope | Có khi | Chi tiết |
|------|-------|--------|----------|
| [Project, deployment, log, incident và runbook](#deployment-tools) | `deployments:read`, `projects:read`, `logs:read`; `deployments:execute`, `deployments:rollback` (hoặc `deployments:write`) để thay đổi | Luôn có | Trang này |
| [Template](#template-tools) | `projects:read`, `deployments:read`; `projects:write` để tạo bản nháp và publish; thêm `deployments:execute` để cài đặt | Luôn có | [Template registry](/vi/guide/template-registry) |
| [CI](#ci-tools) | `ci:read`, `ci:diagnose`, `ci:execute` | Luôn có | [Trigger và dispatch CI](/vi/guide/ci-triggers-and-forks), [Artifact CI](/vi/guide/ci-artifacts), [Mức dùng và ngân sách CI](/vi/guide/ci-usage-and-budgets) |
| [Biến môi trường](#tool-metadata-env) | `env:read`, `env:write` | Luôn có | Trang này |
| [Ngân sách autoscaling](#tool-ngan-sach-autoscaling) | `projects:read`, `projects:write` | `AUTOSCALING_BUDGET_ENABLED` | [Ngân sách autoscaling](/vi/guide/autoscaling-budgets) |
| [Góp ý về TOSE](#cong-cu-feedback) | `feedback:write`, `workspace:read` | `FEEDBACK_ENABLED` | [Feedback API](/vi/api/feedback) |
| [Cloud agent](#cloud-agent-tools) | `agents:read`, `agents:execute`, `agents:control` | `TEMPLATE_AGENT_TASKS_ENABLED` | [Giao tác vụ cho coding agent](/vi/guide/agent-tasks) |
| Blog | `blog:write`, chỉ platform admin | `BLOG_ENABLED` | [Blog và MCP biên tập](/vi/guide/blog-and-editorial-mcp) |
| Mã giảm giá | `admin:discounts`, chỉ platform admin | Luôn có | [Mã khuyến mãi](/vi/api/promo-codes#admin) |

Instance chạy Agent Runtime (`AGENT_RUNTIME_ENABLED`) còn có các tool agent riêng của nó, như `list_agents` và `run_agent`, dưới các scope `agents:*`, gồm cả `agents:write` và `agents:usage:read`.

Cột "Có thay đổi gì không?" bên dưới cho biết một lần gọi có thay đổi gì trong TOSE không và có cần một người duyệt trước không. Việc duyệt luôn diễn ra trên trình duyệt khi đã đăng nhập TOSE, không bao giờ trong chat; xem [Cơ chế phê duyệt](#co-che-phe-duyet).

### Tool deployment {#deployment-tools}

| Tool | Chức năng | Scope | Có thay đổi gì không? |
|------|-----------|-------|-----------------------|
| `list_projects` | Liệt kê project trong workspace kèm deployment mới nhất. Có thể truyền `query` và `limit` (tối đa 100). | `projects:read` | Không |
| `get_deployment_status` | Trạng thái của một deployment (hoặc deployment mới nhất) và 5 deployment gần nhất. | `deployments:read` | Không |
| `inspect_deployment` | Commit, branch, tác giả, image, trigger, thời gian, URL và lỗi của một deployment. | `deployments:read` | Không |
| `read_logs` | `source=build` đọc build log của một deployment. `source=runtime` đọc log ứng dụng gần đây (tối đa 24 giờ, có thể lọc theo `level`). Trả về tối đa 500 dòng và 64 KB. | `logs:read` | Không |
| `list_incidents` | Liệt kê incident vận hành của workspace (site sập, deployment lỗi, backup thất bại, số dư thấp), mới nhất trước. | `deployments:read` | Không |
| `inspect_incident` | Một incident và các mục mới nhất trong timeline của nó: sự kiện mở và gộp vào incident, thay đổi người phụ trách, ghi chú, hành động và kết quả xác minh. | `deployments:read` | Không |
| `deploy_project` | Build và deploy commit đầu của branch đã kết nối, đúng commit hiển thị trong kế hoạch. | `deployments:execute` | **Có**, cần phê duyệt |
| `deploy_image` | Deploy một OCI image được ghim bằng digest (`registry/repository[:tag]@sha256:…`; chỉ có tag sẽ bị từ chối), không cần build hay kết nối Git. Có thể truyền `registry_credential_id` cho image riêng tư mà một người đã thêm, và `idempotency_key`. | `deployments:execute` | **Có**, cần phê duyệt |
| `rollback_deployment` | Đưa image của một deployment cũ lên chạy lại. | `deployments:rollback` | **Có**, cần phê duyệt |
| `plan_runbook` | Lập kế hoạch restart, rollback hoặc scale chỉ-đọc và trả về `approval_url`. Kế hoạch rollback cần thêm `deployments:rollback`. | `deployments:execute` | Không |
| `execute_runbook` | Chạy kế hoạch bạn đã duyệt, một lần cho mỗi `idempotency_key`. Runbook rollback cần thêm `deployments:rollback`. | `deployments:execute` | **Có**, cần phê duyệt khi đã đăng nhập |
| `get_runbook` | Đọc kế hoạch, trạng thái phê duyệt và kết quả đã xác minh. | `deployments:read` | Không |

`deployments:read` là scope mặc định khi client không xin scope nào, và bao gồm `projects:read` và `logs:read`. `deployments:write` bao gồm `deployments:execute` và `deployments:rollback`. Chỉ owner hoặc admin cấp được các scope ghi.

### Tool template {#template-tools}

| Tool | Chức năng | Scope | Có thay đổi gì không? |
|------|-----------|-------|-----------------------|
| `search_templates` | Tìm trong template registry của workspace, hoặc với `scope: "directory"` tìm trong [thư mục template](/vi/guide/template-directory) công khai khi nền tảng bật nó. | `projects:read` | Không |
| `get_template` | Một definition và version: nguồn gốc, workload, tên biến và tên secret, và `manifest_hash`. | `projects:read` | Không |
| `validate_template` | Kiểm tra một manifest `tose.dev/v1`, gửi dưới dạng `manifest_yaml` hoặc chỉ định bằng definition và version, mà không lưu gì. | `projects:read` | Không |
| `plan_template_deployment` | Lập kế hoạch cài một version đã publish. Không tạo gì: kế hoạch ghim version, đích, cấu hình và trần chi phí theo giờ, rồi trả về `approval_url`. | `deployments:read` | Không, trả về kế hoạch và link phê duyệt |
| `get_template_deployment` | Theo dõi một kế hoạch (`plan_id`) hoặc một bản cài (`installation_id`). | `deployments:read` | Không |
| `create_template_draft` | Lưu một manifest làm bản nháp trong registry của workspace. | `projects:write` | **Có** |
| `publish_template` | Đóng băng một version nháp trong workspace để có thể lập kế hoạch. Gửi `manifest_hash` bạn đã xem. | `projects:write` | **Có** |
| `deploy_template` | Cài một kế hoạch, hoặc áp dụng kế hoạch nâng cấp hay rollback, mà owner hoặc admin đã duyệt tại `approval_url`. | `projects:write` và `deployments:execute` | **Có**, cần phê duyệt |

Tạo bản nháp và publish cần owner hoặc admin. Không tool nào duyệt được kế hoạch template, và việc cài đặt qua cùng [security gate](/vi/guide/template-registry#install-security-gate-gated) như dashboard.

### Tool CI {#ci-tools}

| Tool | Chức năng | Scope | Có thay đổi gì không? |
|------|-----------|-------|-----------------------|
| `ci_list_pipelines` | Liệt kê pipeline CI của workspace. | `ci:read` | Không |
| `ci_list_runs` | Các run mới nhất của một pipeline, kèm commit và trạng thái. | `ci:read` | Không |
| `ci_plan` | Cho biết `ci_run` có nhận run của một commit ngay lúc này không, và liệt kê các job kèm chi phí tối đa. Không khởi chạy và không giữ tiền. | `ci:read` | Không |
| `ci_get_status` | Một run và trạng thái các job, kèm thời gian xếp hàng, chuẩn bị, chạy và dọn dẹp. | `ci:read` | Không |
| `ci_get_logs` | Tối đa 64 KiB log đã che secret của một job. | `ci:read` | Không |
| `ci_get_report` | Báo cáo của một run: trạng thái từng job, các bước kèm exit code, lý do và chi phí, và tổng. | `ci:read` | Không |
| `ci_get_usage` | Mức dùng CI theo ngày, run, pipeline, job hoặc loại. | `ci:read` | Không |
| `ci_get_budget` | Các trần ngân sách CI của workspace và của pipeline. | `ci:read` | Không |
| `ci_list_artifacts` | Metadata của các artifact mà một run đã tải lên. | `ci:read` | Không |
| `ci_get_artifact` | Tối đa 64 KiB của một artifact văn bản đã che secret. | `ci:read` | Không |
| `ci_list_suggestions` | Các đề xuất tối ưu impact của một pipeline. Chỉ đọc: chấp nhận đề xuất cần một người trên dashboard. | `ci:read` | Không |
| `ci_diagnose` | Giải thích vì sao một run không qua: loại lỗi, gợi ý, bước lỗi và phần cuối log. | `ci:diagnose` | Không |
| `ci_propose_issue` | Soạn nháp một GitHub issue cho run lỗi. Chỉ trả về bản nháp, không tạo issue. | `ci:diagnose` | Không |
| `ci_run` | Khởi chạy thủ công một run cho commit mà pipeline đã ghi nhận. | `ci:execute` | **Có**, chạy ngay và trừ vào ví |
| `ci_dispatch` | Khởi chạy một run `workflow_dispatch` cho một branch, với input theo kiểu khai báo. | `ci:execute` | **Có**, chạy ngay và trừ vào ví |
| `ci_cancel` | Hủy một run. Job đang chạy bị tính tiền theo số giây đã chạy. | `ci:execute` | **Có** |
| `ci_set_budget` | Thêm hoặc hạ một trần ngân sách CI. Chỉ owner và admin. | `ci:execute` | **Có**, chỉ làm trần chặt hơn |

`ci:diagnose` và `ci:execute` bao gồm mọi thứ `ci:read` cho phép; các scope deployment không cấp quyền CI nào. **`ci_run` và `ci_dispatch` khởi chạy mà không cần duyệt trên trình duyệt**, và mỗi job được trừ vào ví trả trước của workspace, nên chỉ cấp `ci:execute` cho client bạn tin để tiêu tiền đó. Nâng hoặc bỏ trần ngân sách CI, duyệt run của pull request từ fork và chấp nhận đề xuất impact cần một người đăng nhập TOSE; không tool nào làm được.

### Tool cloud agent {#cloud-agent-tools}

Khi server bật tính năng giao tác vụ cho agent (`TEMPLATE_AGENT_TASKS_ENABLED`), owner hoặc admin của workspace có thể giao tác vụ cho các agent Claude Code, Codex và Pi tuyển chọn của workspace. Cả bốn tool, kể cả tool đọc, đều cần owner hoặc admin; member nhận `FORBIDDEN`. Xem [Giao tác vụ cho coding agent](/vi/guide/agent-tasks).

| Tool | Chức năng | Scope | Có thay đổi gì không? |
|------|-----------|-------|-----------------------|
| `cloud_agent_list` | Liệt kê cloud agent của workspace và agent nào nhận tác vụ. | `agents:read` | Không |
| `cloud_agent_get_task` | Đọc một tác vụ và các sự kiện mới của nó. | `agents:read` | Không |
| `cloud_agent_run_task` | Giao cho agent một tác vụ bằng ngôn ngữ tự nhiên. | `agents:execute` | **Có**, bắt đầu ngay |
| `cloud_agent_cancel_task` | Dừng một tác vụ đang khởi động hoặc đang chạy. | `agents:control` | **Có** |

**`cloud_agent_run_task` bắt đầu tác vụ ngay, không cần duyệt trên trình duyệt.** Tác vụ chỉ chạy trên agent mà chủ của nó đã bật giao việc, và một tác vụ có thể đọc và gửi lại mọi thứ agent đọc được, kể cả thông tin đăng nhập của nó.

### Tool ngân sách autoscaling {#tool-ngan-sach-autoscaling}

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

Khi bật ngân sách, `deploy_project` và `deploy_image` từ chối lần khởi chạy làm vượt trần (`BUDGET_CAP`) hoặc làm quỹ dự phòng floor thiếu tiền (`INSUFFICIENT_BALANCE`). Nếu không kiểm tra được ngân sách, không có gì được khởi chạy và tool trả `UNAVAILABLE` có thể thử lại; hãy thử lại sau ít phút. Xem [Lỗi](/vi/api/errors#mcp-budget-codes).

Connector không có tool gọi API tùy ý. Nó không đọc được giá trị của biến môi trường, và không truy cập được domain, database, thanh toán của workspace hay thành viên. Nó chỉ thay đổi được biến qua [tool cập nhật env](#tool-cap-nhat-env) có cổng phê duyệt, nơi bạn tự nhập mọi giá trị trong TOSE, không bao giờ nhập trong chat.

### Tool metadata env {#tool-metadata-env}

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

### Tool cập nhật env {#tool-cap-nhat-env}

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

`feedback:write` có ô đồng ý riêng trên màn hình kết nối, và bất kỳ thành viên nào cũng cấp được cho kết nối của mình. Với kết nối MCP, nó không bao giờ nằm trong yêu cầu mặc định hay trong scope MCP khác, và nó không cấp gì khác. Với API key, `workspace:write` bao hàm nó, nên các key hiện có vẫn gửi được báo cáo. Việc đăng là bất đồng bộ: báo cáo mới không bao giờ hiển thị là đã đăng, và `issue_url` chỉ xuất hiện khi GitHub đã xác nhận issue. Bí mật và dữ liệu cá nhân được che trước, diagnostics là tùy chọn, giới hạn là 20 báo cáo mỗi người và 60 mỗi workspace mỗi giờ (`RATE_LIMITED`). Gửi lại với cùng `idempotency_key` trả về báo cáo đầu tiên. Xem [Scope](/vi/mcp/oauth#scope).

### Cơ chế phê duyệt {#co-che-phe-duyet}

`deploy_project`, `deploy_image` và `rollback_deployment` luôn chạy hai bước:

1. Lần gọi đầu không thay đổi gì. Nó trả về một **kế hoạch**, một `approval_url` và một `approval_token` dùng một lần. Kế hoạch cho biết project, phiên bản đang chạy và tác động. Kế hoạch deploy còn cho biết repository, branch và commit sẽ được build, và kế hoạch deploy image cho biết image đã ghim. Kế hoạch rollback cho biết deployment đích.
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

- **Connector đọc gì:** project, deployment, build log, runtime log và incident của workspace bạn đã chọn, và khi có scope tương ứng, cả template, run CI kèm log và artifact đã che secret, và kết quả tác vụ của cloud agent. Với `env:read`, còn đọc tên và trạng thái đã đặt của biến môi trường trong project, không bao giờ đọc giá trị. Với `env:write`, còn lập và áp dụng thay đổi biến mà bạn duyệt trong TOSE, nhưng vẫn không bao giờ nhận giá trị.
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
