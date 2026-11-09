# tose autoscaling

Đọc và thay đổi [ngân sách autoscaling](/vi/guide/autoscaling-budgets): trần chi phí theo giờ và theo tháng cho workspace hoặc project, cùng floor của project.

Mọi lệnh đều nhận [tùy chọn chung](/vi/commands/overview#global-options), kể cả `--json`. Nhà vận hành nền tảng phải bật ngân sách; nếu không, API trả `404`.

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

Đổi các trần và, với project, cả floor. Cần vai trò admin hoặc owner của workspace.

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
2. Nó gộp các cờ bạn truyền vào và gửi kết quả cùng ETag vừa đọc làm `If-Match` (hoặc `--if-match` của bạn). Nếu có người đổi ngân sách ở giữa, lần ghi thất bại với `PRECONDITION_FAILED` và không có gì thay đổi. Hãy chạy lại `get` rồi thử lại.
3. Lỗi mạng hoặc lỗi gateway được thử lại với cùng body và cùng `If-Match`, nên thử lại chỉ áp dụng thay đổi tối đa một lần. Nếu lần thử lại thấy ngân sách đã chứa đúng thay đổi của bạn, lệnh báo thành công.

### Cách dùng

```bash
# Trần theo giờ $0.05 và trần theo tháng $30
tose autoscaling budget set --hourly 0.05 --monthly 30

# Xóa trần theo giờ, giữ trần theo tháng
tose autoscaling budget set --hourly none

# Luôn giữ ít nhất một replica 0.5 CPU, 1 GiB chạy trong project api
tose autoscaling budget set --project api --floor-replicas 1 --floor-cpu 0.5 --floor-ram 1
```

### Phê duyệt với API key

Kết quả tiếp theo phụ thuộc vào cách bạn đăng nhập:

| Đăng nhập | Kết quả | Mã thoát |
|-----------|---------|----------|
| Phiên người dùng | Thay đổi được áp dụng. Ngân sách được in ra. Với `--json`, `status` là `ok` và `data` là ngân sách mới. | `0` |
| API key của workspace | API không áp dụng thay đổi. Nó trả một kế hoạch. | `0` |

Với API key, CLI in `Approval needed: open <url>`. Với `--json`, kết quả có `status: "pending"`, `data.plan`, `data.approval_url`, và một mục `next_actions` có `url` là cùng liên kết đó:

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
      "description": "After a signed-in owner or admin approves this plan in the dashboard, confirm it was applied",
      "url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
    }
  ]
}
```

Owner hoặc admin đã đăng nhập mở liên kết và duyệt kế hoạch trên dashboard. CLI không có lệnh duyệt, và `--yes` không bỏ qua bước này, vì việc duyệt diễn ra trên server. Kế hoạch hết hạn sau 30 phút. Sau đó hãy chạy `tose autoscaling budget get` để xem nó đã được áp dụng chưa.

### Lỗi

Với `--json`, lỗi dùng [envelope chuẩn](/vi/api/errors) và `code` của API được giữ nguyên:

| `error.code` | Ý nghĩa |
|--------------|---------|
| `VALIDATION_ERROR` | Một cờ sai hoặc thiếu, ví dụ `--floor-cpu` mà không có `--floor-replicas`. Chưa gửi gì. Mã thoát `2`. |
| `PRECONDITION_FAILED` | Ngân sách đã đổi kể từ lúc đọc. Chạy `get` rồi thử lại. |
| `NOT_FOUND` | Workspace hoặc project không tồn tại, hoặc ngân sách chưa được bật. Mã thoát `6`. |
| `FORBIDDEN` | Vai trò hoặc scope quá thấp. Mã thoát `3`. |
| `INVALID_ARGUMENT` | API từ chối một giá trị, ví dụ floor có chi phí cao hơn trần theo giờ của project. Mã thoát `2`. |
| `UNAVAILABLE` | API không hoàn tất được request (`503`). CLI thử lại với cùng body và `If-Match` trước khi báo lỗi, lỗi này có `retryable: true`. |
| `BUDGET_CAP`, `INSUFFICIENT_BALANCE` | Do deploy, redeploy và các lệnh khác làm tăng mức phân bổ trả về. Xem [Mã lỗi](/vi/api/errors#BUDGET_CAP). `INSUFFICIENT_BALANCE` thoát với mã `9` và `next_actions` của nó dẫn tới trang nạp tiền. |

## Liên quan

- [Hướng dẫn ngân sách autoscaling](/vi/guide/autoscaling-budgets)
- [API ngân sách autoscaling](/vi/api/autoscaling-budget)
