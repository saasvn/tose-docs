# Giao tác vụ cho coding agent

Một ứng dụng được kết nối (MCP client như Claude Desktop, Claude Code hoặc Cursor) hoặc một API key của workspace có thể giao tác vụ cho coding agent tuyển chọn của bạn (**Claude Code**, **Codex** hoặc **Pi**), theo dõi tác vụ, đọc kết quả và hủy tác vụ. Ví dụ: "sửa test đang lỗi trong repo Y". Agent tự chạy tác vụ trong cùng `/workspace` mà console của nó dùng. TOSE lưu hồ sơ của tác vụ: ai giao và qua đâu, trạng thái, thông điệp cuối của agent và các tệp đã thay đổi.

Mỗi agent chỉ chạy một tác vụ tại một thời điểm. Không có hàng đợi.

## Điều kiện cần

| Điều kiện | Cần làm |
|-----------|---------|
| Máy chủ có cung cấp tác vụ. | Người vận hành đặt `TEMPLATE_AGENT_TASKS_ENABLED=true`. Mặc định **tắt**. Khi tắt, mọi route tác vụ trả `404 TASKS_DISABLED` và dashboard ẩn thẻ Tác vụ. |
| Bản phát hành của agent có trình chạy tác vụ. | Dùng Claude Code 1.1.0, Codex 1.1.0 hoặc Pi 1.2.0 (hoặc mới hơn). Bản cài đặt cũ vẫn chạy như cũ và từ chối tác vụ với `409 TASKS_UNSUPPORTED`. Chưa nâng cấp tại chỗ được bản tuyển chọn, nên hãy [triển khai](/vi/guide/deploy-coding-agent) bản mới thành một bản cài đặt mới rồi chuyển công việc sang bằng git. |
| Chủ sở hữu đã cho phép. | Xem [Bật tính năng](#bat-tinh-nang). |
| Agent đang chạy và đã đăng nhập. | Tác vụ không bao giờ đánh thức agent đang ngủ, không khởi động agent đã dừng và không dùng tài khoản hay key khác. |
| Ví còn số dư. | Tác vụ chạy trên tài nguyên tính toán của agent. Không có phụ phí; nhà cung cấp tính phí mô hình vào key hoặc gói của bạn. |

## Bật tính năng {#bat-tinh-nang}

Trên trang của agent đã cài, **owner hoặc admin** của workspace đã đăng nhập bật công tắc **Accept tasks from connected apps and API keys** (nhận tác vụ từ ứng dụng được kết nối và API key). Công tắc tắt với mọi bản cài đặt cho tới khi có người bật. API key hay ứng dụng được kết nối không bao giờ đổi được công tắc này, dù có scope nào.

::: warning Hãy đọc trước khi bật
Một tác vụ có thể đọc và gửi lại mọi thứ agent đọc được, kể cả thông tin đăng nhập của nó (ví dụ `~/.claude` hoặc `$CODEX_HOME/auth.json`) hay key của nó. Vì vậy ứng dụng hoặc API key giữ `agents:execute` được tin cậy ngang với owner hoặc admin đã cấp quyền. Trước khi ghi sự kiện hoặc kết quả, agent thay các giá trị thông tin xác thực mà nó biết bằng `[redacted]`, nhưng đây chỉ là nỗ lực tốt nhất: nó bắt được sơ suất, không chặn được một prompt có chủ đích. Chỉ bật công tắc cho những client bạn tin tưởng với thông tin đăng nhập của agent.
:::

Tác vụ chạy ở mọi chế độ nhà cung cấp, kể cả Claude Code với gói Claude và Codex với gói ChatGPT của bạn. Tác vụ dùng thông tin mà agent đang đăng nhập tại thời điểm đó.

## Công cụ MCP

Khi máy chủ cung cấp tác vụ, client được kết nối thấy bốn công cụ. Người đã kết nối phải là owner hoặc admin của workspace.

| Công cụ | Scope | Chức năng |
|---------|-------|-----------|
| `list_template_agents` | `agents:read` | Liệt kê các agent tuyển chọn với `installation_id`, `name`, `agent`, `release`, `status`, delegation đã bật chưa, có hỗ trợ tác vụ không, tác vụ đang chạy và liên kết tới trang của agent. |
| `run_template_agent_task` | `agents:execute` | Giao tác vụ: `installation_id`, `prompt`, tùy chọn `timeout_minutes`, tùy chọn `continue_task_id` (tiếp tục tác vụ đã xong khi bản phát hành hỗ trợ) và tùy chọn `request_id` để thử lại an toàn. |
| `get_template_agent_task` | `agents:read` | Đọc một tác vụ. Truyền `after` (con trỏ của lần gọi trước) để chỉ nhận sự kiện mới, và `wait_seconds` (0 đến 25) để chờ thay đổi thay vì hỏi liên tục. |
| `cancel_template_agent_task` | `agents:control` | Dừng tác vụ đang chạy. |

Các công cụ không bao giờ bật delegation, không mở console và không nhận bí mật. Khi một lần từ chối có cách khắc phục trên trang của agent (`TASKS_NOT_ALLOWED`, `TASKS_UNSUPPORTED`, `AGENT_SLEEPING`, `PROVIDER_SIGN_IN_REQUIRED`), thông báo chỉ ra trang đó. Các host có MCP Apps hiển thị tác vụ trong một khung trạng thái nhỏ. Màn hình đồng ý ghi về `agents:execute`: "A task can read and send back anything the agent can, including its sign-in."

### Ví dụ hội thoại

> **Bạn:** Tôi có những coding agent nào trong TOSE?
>
> **Trợ lý:** *(gọi `list_template_agents`)* Bạn có **claude-code-main** (Claude Code 1.1.0, đang chạy, đã bật tác vụ) và **codex-old** (Codex 1.0.0, chưa có trình chạy tác vụ).
>
> **Bạn:** Nhờ claude-code-main sửa test đang lỗi trong `api/` rồi cho tôi biết đã đổi gì.
>
> **Trợ lý:** *(gọi `run_template_agent_task`, sau đó `get_template_agent_task` với `wait_seconds`)* Tác vụ đã xong với trạng thái `succeeded`. Agent báo test lỗi do thiếu kiểm tra nil; nó đã sửa trong `api/handler.go` và thêm một ca kiểm thử vào `api/handler_test.go`.

## Scope

| Scope | Cần cho |
|-------|---------|
| `agents:read` | Liệt kê agent, liệt kê tác vụ và đọc một tác vụ. |
| `agents:execute` | Giao tác vụ cho agent. Key tạo không có scope thì không có quyền truy cập agent; hãy cấp scope này một cách tường minh. |
| `agents:control` | Hủy tác vụ. |

Dù có scope, người đứng sau key hoặc kết nối vẫn phải là owner hoặc admin của workspace. Xem [API key và scope](/vi/api/api-keys) và [Giao thức, OAuth và scope](/vi/mcp/oauth).

## REST API

Các route nằm dưới `/api/workspaces/{slug}/template-installations/{id}`. Hợp đồng nằm trong [OpenAPI spec](/vi/api/reference).

| Route | Scope | Mục đích |
|-------|-------|----------|
| `PUT /task-delegation` với `{"enabled": true}` | không có: chỉ phiên đã đăng nhập | Công tắc. Trả `{"task_delegation": true}`. |
| `POST /tasks` | `agents:execute` | Giao tác vụ: `prompt`, `timeout_minutes`, `continue_task_id` và header `Idempotency-Key` tùy chọn. Trả `201`, hoặc `200` khi key trỏ tới một tác vụ trước đó. |
| `GET /tasks` | `agents:read` | Liệt kê tác vụ, mới nhất trước (`?limit=`, mặc định 20, tối đa 100), không kèm sự kiện. |
| `GET /tasks/{task_id}?after=&wait_seconds=` | `agents:read` | Đọc một tác vụ cùng sự kiện. `after` là con trỏ, `wait_seconds` (0 đến 25) chờ thay đổi. |
| `POST /tasks/{task_id}/cancel` | `agents:control` | Dừng tác vụ đang chạy. |

```bash
BASE=https://api.tose.sh/api/workspaces/my-team/template-installations/INSTALLATION_ID

# Giao tác vụ
curl -sS -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $TOSE_API_KEY" \
  -H "Idempotency-Key: fix-test-001" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Fix the failing test in api/ and run the tests.","timeout_minutes":30}'

# Theo dõi: chờ tối đa 25 giây, rồi truyền "next" nhận được làm after
curl -sS "$BASE/tasks/TASK_ID?wait_seconds=25" -H "Authorization: Bearer $TOSE_API_KEY"
```

Một tác vụ có `status`, `final_message` (tối đa 32 KiB), `changed_files` (`repo`, `status`, `path`; `repo` là `.` với chính `/workspace`), `problem_code` và `problem_message`, `ended_by` (người đã dừng nó, hoặc `system`), các mốc thời gian và, khi đọc một tác vụ, `events` kèm `next`, con trỏ cho lần gọi tiếp theo. Prompt không bao giờ được trả lại và không bao giờ được ghi vào nhật ký kiểm toán. Các view bản cài đặt (`GET /template-installations` và `GET /template-installations/{id}`) có `tasks_enabled`, `task_delegation`, `tasks_supported` và `task_resume_supported`.

## Trạng thái

| Trạng thái | Ý nghĩa |
|------------|---------|
| `starting` | TOSE đã gửi tác vụ cho agent. |
| `running` | Agent đang xử lý. |
| `succeeded` | Đã xong. Đọc `final_message` và `changed_files`. |
| `failed` | Kết thúc với lỗi. Xem `problem_code` và `problem_message`. |
| `cancelled` | Có người hủy, hoặc agent bị dừng hay cho ngủ. |
| `timed_out` | Chạy quá thời hạn. |
| `lost` | Agent khởi động lại hoặc trạng thái tác vụ không còn. Tác vụ `lost` không bao giờ được chạy lại. |

## Mã từ chối

Mỗi lần từ chối có mã riêng, không bao giờ lặng lẽ chuyển sang phương án khác.

| Mã | Khi nào |
|----|---------|
| `404 TASKS_DISABLED` | Cờ của máy chủ đang tắt. |
| `409 TASKS_UNSUPPORTED` | Bản phát hành không có trình chạy tác vụ. Hãy cài bản mới hơn. |
| `403 TASKS_NOT_ALLOWED` | Owner chưa bật công tắc. |
| `409 AGENT_BUSY` | Agent này đang có tác vụ khác ở trạng thái `starting` hoặc `running`. |
| `409 AGENT_SLEEPING` | Agent đang ngủ. Hãy đánh thức nó trên trang của agent; tác vụ không làm việc này. |
| `409 AGENT_STOPPED` | Agent đã dừng. Tác vụ không khởi động nó. |
| `409 PROVIDER_SIGN_IN_REQUIRED` | Agent chưa đăng nhập vào nhà cung cấp, hoặc chưa có key. |
| `402 INSUFFICIENT_BALANCE` | Ví không đủ trả cho tài nguyên tính toán của agent. |
| `404 TASK_NOT_FOUND`, `404 INSTALLATION_NOT_FOUND` | Không có tác vụ hay bản cài đặt đó trong workspace này. |
| `502 AGENT_UNREACHABLE` | TOSE không liên lạc được với agent. Lần tạo có thể đã được nhận: tác vụ ở `starting` và trong khoảng hai phút chuyển thành `running` hoặc `failed`. Thử lại với cùng `Idempotency-Key` để lấy lại nó. |

## Giới hạn

- Mỗi agent một tác vụ tại một thời điểm.
- Thời hạn: mặc định 30 phút, tối đa 120.
- Prompt: tối đa 100000 byte và không được để trống.
- Thông điệp cuối tối đa 32 KiB.

## Khi tác vụ đang chạy

- Agent được tính là đang bận nên tự động ngủ không ngắt nó. Dừng agent hoặc cho ngủ sẽ hủy tác vụ đang chạy.
- TOSE kiểm tra các tác vụ đang chạy khoảng 30 giây một lần, nên tác vụ vẫn kết thúc trong TOSE dù không ai theo dõi, và tác vụ quá thời hạn bị kết thúc.
- Gõ trong console không chặn tác vụ. Cả hai làm việc trong cùng `/workspace`, nên hãy dùng nút **Stop** trong danh sách tác vụ khi muốn lấy lại quyền kiểm soát.
- Nhật ký kiểm toán ghi công tắc, mỗi tác vụ được tạo, ai đã hủy và tác vụ kết thúc ra sao, không bao giờ ghi prompt.

Liên quan: [Triển khai coding agent](/vi/guide/deploy-coding-agent), [Quyền truy cập của agent](/vi/mcp/agent-access), [API key và scope](/vi/api/api-keys).
