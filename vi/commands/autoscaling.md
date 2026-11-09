# tose autoscaling

Đọc và thay đổi [ngân sách autoscaling](/vi/guide/autoscaling-budgets): trần chi phí theo giờ và theo tháng cho workspace hoặc project, cùng floor của project.

Mọi lệnh đều nhận [tùy chọn chung](/vi/commands/overview#global-options), kể cả `--json`. Nhà vận hành nền tảng phải bật ngân sách; nếu không, các lệnh thất bại với `FEATURE_DISABLED` (mã thoát `6`).

**Phạm vi.** Mọi lệnh làm việc trên workspace trừ khi bạn truyền `--project <slug>`. Project lấy từ `TOSE_PROJECT`, `.tose.json` hay `tose use` không được dùng ở đây, nên một thay đổi cấp workspace không bao giờ bị áp vào một project do nhầm.

## tose autoscaling budget get

Hiển thị các trần, mức sử dụng hiện tại, quỹ dự phòng floor và các kế hoạch đang chờ duyệt.

### Cú pháp

```bash
tose autoscaling budget get [--project <slug>] [--json]
```

### Cách dùng

```bash
# Ngân sách workspace
tose autoscaling budget get

# Một project
tose autoscaling budget get --project api --json
```

Với `--json`, trường `data` là đối tượng [WorkspaceBudget hoặc ProjectBudget](/vi/api/autoscaling-budget#shapes). Ở đó số tiền tính bằng nano-USD; đầu ra thường hiển thị USD.

---

## tose autoscaling budget set

Đề xuất trần mới và, với project, floor mới. CLI luôn xác thực bằng API key, nên `set` không bao giờ tự áp dụng thay đổi: nó tạo một kế hoạch để owner hoặc admin của workspace đã đăng nhập duyệt. Key cần `projects:write`, và người sở hữu key cần vai trò owner hoặc admin của workspace.

### Cú pháp

```bash
tose autoscaling budget set [--project <slug>]
  [--hourly <usd>|none] [--monthly <usd>|none]
  [--floor-replicas <n> --floor-cpu <cores> --floor-ram <gib> | --no-floor]
  [--if-match <etag>] [--json]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--project <slug>` | Đổi một project thay vì workspace |
| `--hourly <usd>` | Trần theo giờ tính bằng USD, hoặc `none` để xóa |
| `--monthly <usd>` | Trần theo tháng tính bằng USD, hoặc `none` để xóa |
| `--floor-replicas <n>` | Số replica của floor, từ 1 đến 100. Cần `--project`, `--floor-cpu` và `--floor-ram` |
| `--floor-cpu <cores>` | CPU mỗi replica của floor, từ 0.25 đến 64 |
| `--floor-ram <gib>` | RAM mỗi replica của floor tính bằng GiB, từ 0.5 đến 256 |
| `--no-floor` | Xóa floor của project |
| `--if-match <etag>` | Chỉ áp dụng nếu ngân sách vẫn ở ETag này |

Cần ít nhất một tùy chọn về trần hoặc floor. Cờ bạn bỏ qua giữ nguyên giá trị hiện tại.

Số tiền USD có tối đa 9 chữ số thập phân và được đổi sang nano-USD chính xác, nên `0.05` được gửi là `50000000`.

### Cách hoạt động

1. `set` đọc ngân sách hiện tại, vì API cần đủ mọi key trần trong mỗi lần ghi.
2. Nó gộp các cờ bạn truyền vào và gửi kết quả cùng ETag vừa đọc làm `If-Match` (hoặc `--if-match` của bạn). Lần ghi luôn có điều kiện. Nếu có người đổi ngân sách ở giữa, lần ghi thất bại với `PRECONDITION_FAILED` và không có gì thay đổi. Hãy chạy lại `get` rồi thử lại.
3. Lỗi mạng hoặc lỗi gateway được thử lại với cùng body và cùng `If-Match`. Đề xuất lại cùng một thay đổi sẽ trả về kế hoạch đang chờ, nên thử lại không bao giờ tạo kế hoạch thứ hai.

### Cách dùng

```bash
# Trần theo giờ $0.05 và trần theo tháng $30
tose autoscaling budget set --hourly 0.05 --monthly 30

# Xóa trần theo giờ, giữ trần theo tháng
tose autoscaling budget set --hourly none

# Luôn giữ ít nhất một replica 0.5 CPU, 1 GiB chạy trong project api
tose autoscaling budget set --project api --floor-replicas 1 --floor-cpu 0.5 --floor-ram 1
```

### Phê duyệt

API không áp dụng thay đổi. Nó lưu một kế hoạch, và `set` thoát với mã `0`. CLI in `Approval needed: open <url>`. Với `--json`, kết quả có `status: "pending"`, `data.plan`, `data.approval_url`, và một mục `next_actions` có `url` là cùng liên kết đó. Khi có `--project`, một mục thứ hai chỉ cách kiểm tra ngân sách của project sau khi được duyệt:

```json
{
  "schema_version": "1",
  "status": "pending",
  "success": true,
  "data": {
    "plan": { "id": "plan_01", "status": "pending", "expires_at": "2026-11-09T10:30:00Z" },
    "approval_url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
  },
  "message": "Approval needed: open https://tose.sh/w/acme/autoscaling?plan=plan_01",
  "next_actions": [
    {
      "command": "tose autoscaling budget get --json",
      "description": "Lists this plan under pending_plans until a signed-in owner or admin approves it in the dashboard",
      "url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
    }
  ]
}
```

Owner hoặc admin đã đăng nhập mở liên kết và duyệt kế hoạch trên dashboard. CLI không có lệnh duyệt, và `--yes` không bỏ qua bước này, vì việc duyệt diễn ra trên server. Kế hoạch hết hạn sau 30 phút. `tose autoscaling budget get` liệt kê các kế hoạch đang chờ, kể cả của project; sau đó hãy chạy lệnh này để xem kế hoạch đã được áp dụng chưa.

### Lỗi

Với `--json`, lỗi dùng [envelope chuẩn](/vi/api/errors). `code` của API được giữ nguyên, trừ ba trường hợp CLI tự đặt tên (`FEATURE_DISABLED`, `INSUFFICIENT_SCOPE`, `API_KEY_WORKSPACE_SCOPED`):

| `error.code` | Ý nghĩa |
|--------------|---------|
| `VALIDATION_ERROR` | Một cờ sai hoặc thiếu, ví dụ `--floor-cpu` mà không có `--floor-replicas`. Chưa gửi gì. Mã thoát `2`. |
| `PRECONDITION_FAILED` | Ngân sách đã đổi kể từ lúc đọc. Chạy `get` rồi thử lại. Mã thoát `1`. |
| `FEATURE_DISABLED` | Server này chưa bật ngân sách autoscaling. Sau khi một route ngân sách trả `404`, CLI kiểm tra `GET /api/public/features` và báo mã này khi `autoscaling_budget` là `false`. Mã thoát `6`. |
| `not_found` | Chủ sở hữu API key không còn là thành viên của workspace. Mã thoát `6`. |
| `NOT_FOUND` | Project không tồn tại trong workspace. Mã thoát `6`. |
| `forbidden` | Vai trò của bạn trong workspace quá thấp. Mã thoát `3`. |
| `INSUFFICIENT_SCOPE` | API key thiếu scope (`projects:read`, hoặc `projects:write` cho `set`). Hãy tạo key có scope đó. Mã thoát `3`. |
| `API_KEY_WORKSPACE_SCOPED` | Workspace không tồn tại, hoặc API key thuộc về workspace khác. API key không phân biệt được hai trường hợp này, nên hãy kiểm tra slug rồi dùng key tạo trong workspace đó. Mã thoát `3`. |
| `INVALID_ARGUMENT` | API từ chối một giá trị, ví dụ floor có chi phí cao hơn trần theo giờ của project. Mã thoát `2`. |
| `unavailable` | API không hoàn tất được request (`503`). Với lệnh ghi bên trong `set`, CLI thử tối đa ba lần với cùng body và `If-Match` trước khi báo lỗi; `503` ở một lệnh đọc được báo ngay. Lỗi có `retryable: true`. Mã thoát `1`. |
| `BUDGET_CAP`, `INSUFFICIENT_BALANCE` | Do deploy, redeploy và các lệnh khác làm tăng mức phân bổ trả về. Xem [Mã lỗi](/vi/api/errors#BUDGET_CAP). `INSUFFICIENT_BALANCE` thoát với mã `9` và `next_actions` của nó dẫn tới trang nạp tiền. |

## Liên quan

- [Hướng dẫn ngân sách autoscaling](/vi/guide/autoscaling-budgets)
- [API ngân sách autoscaling](/vi/api/autoscaling-budget)
