# Giao tác vụ cho coding agent

Một ứng dụng được kết nối (MCP client như Claude Desktop, Claude Code hoặc Cursor) hoặc một API key của workspace có thể giao tác vụ cho coding agent tuyển chọn của bạn (**Claude Code**, **Codex** hoặc **Pi**), theo dõi tác vụ, đọc kết quả và hủy tác vụ. Ví dụ: "sửa test đang lỗi trong repo Y". Agent tự chạy tác vụ trong cùng `/workspace` mà console của nó dùng. TOSE lưu hồ sơ của tác vụ: ai giao và qua đâu, trạng thái, thông điệp cuối của agent và các tệp đã thay đổi.

Mỗi agent chỉ chạy một tác vụ tại một thời điểm. Không có hàng đợi.

## Điều kiện cần

| Điều kiện | Cần làm |
|-----------|---------|
| Máy chủ có cung cấp tác vụ. | Người vận hành đặt `TEMPLATE_AGENT_TASKS_ENABLED=true`. Mặc định **tắt**. Khi tắt, mọi route tác vụ trả `404 TASKS_DISABLED` và dashboard ẩn tab **Tác vụ** và ô của nó trên trang agent. |
| Bản phát hành của agent có trình chạy tác vụ. | Dùng Claude Code 1.1.0, Codex 1.1.0 hoặc Pi 1.2.0 (hoặc mới hơn). Bản cài đặt cũ vẫn chạy như cũ và từ chối tác vụ với `409 TASKS_UNSUPPORTED`. Chưa nâng cấp tại chỗ được bản tuyển chọn, nên hãy [triển khai](/vi/guide/deploy-coding-agent) bản mới thành một bản cài đặt mới rồi chuyển công việc sang bằng git. |
| Chủ sở hữu cho phép. | Mặc định bật với agent mới có trình chạy tác vụ; xem [Bật hoặc tắt](#bat-tinh-nang). |
| Agent đang chạy và đã đăng nhập. | Tác vụ không bao giờ đánh thức agent đang ngủ, không khởi động agent đã dừng và không dùng tài khoản hay key khác. |
| Ví còn số dư. | Tác vụ chạy trên tài nguyên tính toán của agent. Không có phụ phí; nhà cung cấp tính phí mô hình vào key hoặc gói của bạn. |

## Bật hoặc tắt {#bat-tinh-nang}

Công tắc **Nhận tác vụ từ ứng dụng đã kết nối và khóa API** (Accept tasks from connected apps and API keys), trong tab **Tác vụ** của trang agent đã cài, quyết định agent có nhận tác vụ hay không. Mở trang đó từ **Cloud Agents** ở thanh bên của workspace; mục **Agent của bạn** cũng cho biết agent nào đang nhận việc.

- Công tắc **bật sẵn** cho bản cài đặt mới của bản phát hành có trình chạy tác vụ (Claude Code 1.1.0, Codex 1.1.0, Pi 1.2.0 hoặc mới hơn), kể từ tose-app [#701](https://github.com/saasvn/tose-app/pull/701). Khi đó ứng dụng được kết nối hoặc API key có `agents:execute` giao được tác vụ cho agent ngay từ lần khởi động đầu tiên.
- Công tắc vẫn **tắt** với bản cài đặt đã có từ trước, cho tới khi owner hoặc admin bật. Bản phát hành không có trình chạy tác vụ thì không nhận tác vụ được: bật công tắc bị từ chối với `409 TASKS_UNSUPPORTED`.
- Chỉ **owner hoặc admin** của workspace đã đăng nhập mới tắt hoặc bật được (`PUT .../task-delegation` với `{"enabled": false}` hoặc `true`). API key hay ứng dụng được kết nối không bao giờ đổi được công tắc này, dù có scope nào. Khi tắt, tác vụ bị từ chối với `403 TASKS_NOT_ALLOWED`.

::: warning Hãy đọc trước khi để bật
Một tác vụ có thể đọc và gửi lại mọi thứ agent đọc được, kể cả thông tin đăng nhập của nó (ví dụ `~/.claude` hoặc `$CODEX_HOME/auth.json`) hay key của nó. Vì vậy ứng dụng hoặc API key giữ `agents:execute` được tin cậy ngang với owner hoặc admin đã cấp quyền. Trước khi ghi sự kiện hoặc kết quả, agent thay các giá trị thông tin xác thực mà nó biết bằng `[redacted]`, nhưng đây chỉ là nỗ lực tốt nhất: nó bắt được sơ suất, không chặn được một prompt có chủ đích. Chỉ để công tắc bật khi bạn tin tưởng các client đã kết nối với thông tin đăng nhập của agent. Nếu không, hãy tắt ngay sau khi triển khai.
:::

Tác vụ chạy ở mọi chế độ nhà cung cấp, kể cả Claude Code với gói Claude và Codex với gói ChatGPT của bạn. Tác vụ dùng thông tin mà agent đang đăng nhập tại thời điểm đó.

## Công cụ MCP

Khi máy chủ cung cấp tác vụ, client được kết nối thấy bốn công cụ. Người đã kết nối phải là owner hoặc admin của workspace.

| Công cụ | Scope | Chức năng |
|---------|-------|-----------|
| `cloud_agent_list` | `agents:read` | Liệt kê các agent tuyển chọn với `installation_id`, `name`, `agent`, `release`, `status`, delegation đã bật chưa, có hỗ trợ tác vụ không, có tiếp tục được tác vụ đã xong không (`resume_supported`), tác vụ đang chạy và liên kết tới trang của agent. |
| `cloud_agent_run_task` | `agents:execute` | Giao tác vụ: `installation_id`, `prompt`, tùy chọn `timeout_minutes`, tùy chọn `continue_task_id` (tiếp tục tác vụ đã xong khi bản phát hành hỗ trợ) và tùy chọn `request_id` để thử lại an toàn. |
| `cloud_agent_get_task` | `agents:read` | Đọc một tác vụ. Truyền `after` (con trỏ của lần gọi trước) để chỉ nhận sự kiện mới, và `wait_seconds` (0 đến 25) để chờ thay đổi thay vì hỏi liên tục. |
| `cloud_agent_cancel_task` | `agents:control` | Dừng tác vụ đang `starting` hoặc đang chạy. Tác vụ đã kết thúc được trả về nguyên trạng. |

Trước tose-app [#738](https://github.com/saasvn/tose-app/pull/738), các công cụ này tên là `list_template_agents`, `run_template_agent_task`, `get_template_agent_task` và `cancel_template_agent_task`. Tên cũ không còn tồn tại, nên hãy cập nhật danh sách cho phép hoặc script của client nếu còn dùng tên cũ.

Các công cụ không bao giờ bật delegation, không mở console và không nhận bí mật. Khi một lần từ chối có cách khắc phục trên trang của agent (`TASKS_NOT_ALLOWED`, `TASKS_UNSUPPORTED`, `AGENT_SLEEPING`, `PROVIDER_SIGN_IN_REQUIRED`), thông báo chỉ ra trang đó. Các host có MCP Apps hiển thị tác vụ trong một khung trạng thái nhỏ. Màn hình đồng ý ghi về `agents:execute`: "A task can read and send back anything the agent can, including its sign-in."

### Ví dụ hội thoại

> **Bạn:** Tôi có những coding agent nào trong TOSE?
>
> **Trợ lý:** *(gọi `cloud_agent_list`)* Bạn có **claude-code-main** (Claude Code 1.1.0, đang chạy, đã bật tác vụ) và **codex-old** (Codex 1.0.0, chưa có trình chạy tác vụ).
>
> **Bạn:** Nhờ claude-code-main sửa test đang lỗi trong `api/` rồi cho tôi biết đã đổi gì.
>
> **Trợ lý:** *(gọi `cloud_agent_run_task`, sau đó `cloud_agent_get_task` với `wait_seconds`)* Tác vụ đã xong với trạng thái `succeeded`. Agent báo test lỗi do thiếu kiểm tra nil; nó đã sửa trong `api/handler.go` và thêm một ca kiểm thử vào `api/handler_test.go`.

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
| `PUT /task-delegation` với `{"enabled": true}` hoặc `false` | không có: chỉ phiên đã đăng nhập | Công tắc. Trả `{"task_delegation": <giá trị mới>}`. |
| `POST /tasks` | `agents:execute` | Giao tác vụ: `prompt`, `timeout_minutes`, `continue_task_id` và header `Idempotency-Key` tùy chọn. Trả `201`, hoặc `200` khi key trỏ tới một tác vụ trước đó. |
| `GET /tasks` | `agents:read` | Liệt kê tác vụ, mới nhất trước (`?limit=`, mặc định 20, tối đa 100), không kèm sự kiện. |
| `GET /tasks/{task_id}?after=&wait_seconds=` | `agents:read` | Đọc một tác vụ cùng sự kiện. `after` là con trỏ, `wait_seconds` (0 đến 25) chờ thay đổi. |
| `POST /tasks/{task_id}/cancel` | `agents:control` | Dừng tác vụ đang `starting` hoặc đang chạy. Tác vụ đã kết thúc được trả về nguyên trạng. |

```bash
BASE=https://api.tose.sh/api/workspaces/my-team/template-installations/INSTALLATION_ID

# Giao tác vụ
curl -sS -X POST "$BASE/tasks" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Idempotency-Key: fix-test-001" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Fix the failing test in api/ and run the tests.","timeout_minutes":30}'

# Theo dõi: chờ tối đa 25 giây, rồi truyền "next" nhận được làm after
curl -sS "$BASE/tasks/TASK_ID?wait_seconds=25" -H "X-API-Key: $TOSE_API_KEY"
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
| `403 TASKS_NOT_ALLOWED` | Công tắc đang tắt: owner hoặc admin đã tắt, hoặc bản cài đặt có từ trước khi có mặc định mới và chưa ai bật. |
| `409 AGENT_BUSY` | Agent này đang có tác vụ khác ở trạng thái `starting` hoặc `running`. |
| `409 AGENT_SLEEPING` | Agent đang ngủ. Hãy đánh thức nó trên trang của agent hoặc bằng route wake; tác vụ không làm việc này. |
| `409 AGENT_STOPPED` | Agent đã dừng. Tác vụ không khởi động nó. |
| `409 PROVIDER_SIGN_IN_REQUIRED` | Agent chưa đăng nhập vào nhà cung cấp, hoặc chưa có key. |
| `402 INSUFFICIENT_BALANCE` | Ví không đủ trả cho tài nguyên tính toán của agent. |
| `404 TASK_NOT_FOUND`, `404 INSTALLATION_NOT_FOUND` | Không có tác vụ hay bản cài đặt đó trong workspace này. |
| `502 AGENT_UNREACHABLE` | TOSE không liên lạc được với agent. Lần tạo có thể đã được nhận: tác vụ ở `starting` và trong khoảng hai phút chuyển thành `running` hoặc `failed`. Thử lại với cùng `Idempotency-Key` để lấy lại nó. Với lệnh hủy, yêu cầu hủy có thể chưa tới agent; khi đó tác vụ kết thúc khi hết thời hạn. |

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
