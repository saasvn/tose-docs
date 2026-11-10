# Mức sử dụng CI và hạn mức ngân sách

CI của TOSE được trả từ ví trả trước của workspace. Trang này giải thích cách xem CI đã tiêu bao nhiêu và cách đặt trần chi tiêu cứng. Chi tiết route và tool nằm ở [API mức sử dụng CI và hạn mức ngân sách](/vi/api/ci-usage-budget).

## Xem mức sử dụng {#usage}

Mỗi lượt chạy job đã tới cluster và kết thúc đều để lại một usage event. Mọi thành viên workspace (hoặc credential có `ci:read`) đều có thể cộng gộp các event này:

- **Khoảng thời gian.** Khi không có `from` hoặc `run_id`, báo cáo bao gồm 30 ngày UTC gần nhất. `from` là mốc bắt đầu (bao gồm) và `to` là mốc kết thúc (không bao gồm), dạng RFC 3339 hoặc `YYYY-MM-DD` (UTC). Một khoảng tối đa 366 ngày, và trả về tối đa 1000 dòng (`truncated` cho biết khi có dòng bị cắt).
- **Nhóm theo.** `group_by` là `day` (mặc định), `run`, `pipeline`, `job` hoặc `kind` (`compute`, `credit`, `review`). Thu hẹp báo cáo bằng `pipeline_id` hoặc `run_id`.
- **Số tiền.** Mọi số tiền là tổng số nguyên chính xác: `cost_nano_usd` và `billed_nano_usd` tính bằng nano-USD, `credit_nano_usd` cho lỗi nền tảng không bị tính phí, `capped_nano_usd` là phần vượt mức giữ của job không bị tính phí, `forgiven_nano_usd` khi ví hết tiền, và `charged_cents` là số cent đã trừ khỏi ví.

## Hạn mức ngân sách {#budget-caps}

Một hạn mức giới hạn CI đã tính phí của một phạm vi trong một kỳ UTC. `0` nghĩa là không có hạn mức, và số dư ví luôn là hạn mức cuối cùng.

| Phạm vi | Giới hạn | Áp dụng cho |
|---------|----------|-------------|
| Workspace theo ngày | `max_daily_cost_cents` | CI của mọi pipeline cộng lại, mỗi ngày UTC |
| Workspace theo tháng | `max_monthly_cost_cents` | Tương tự, mỗi tháng UTC |
| Mỗi lần chạy của pipeline | `max_run_cost_cents` | Từng lần chạy của pipeline đó. `budget.max_run_cost_usd` trong `.tose/ci.yml` chỉ có thể hạ thấp hơn |
| Pipeline theo ngày | `max_daily_cost_cents` | Pipeline đó, mỗi ngày UTC |
| Pipeline theo tháng | `max_monthly_cost_cents` | Pipeline đó, mỗi tháng UTC |

Hạn mức là USD cent từ 1 đến 10.000.000. Số dư ví vẫn phải đủ cho từng job.

### Đã chi, đang giữ và còn lại {#spent-held-remaining}

Khi đọc hạn mức, mỗi hạn mức hiển thị:

- **Đã chi** (`spent_nano_usd`): compute đã tính phí trong kỳ UTC hiện tại.
- **Đang giữ** (`held_nano_usd`): trường hợp xấu nhất của các job đang chạy.
- **Còn lại** (`remaining_nano_usd`): phần còn lại. `used_percent` là (đã chi + đang giữ) / giới hạn, và có thể vượt 100 sau khi hạ hạn mức.
- **Trạng thái**: `ok`, `near` khi mức dùng chạm ngưỡng cảnh báo, hoặc `reached`. `period_start` và `resets_at` cho biết kỳ UTC.

### Cảnh báo {#alerts}

`alert_percent` (1 đến 100, mặc định 80) được đặt một lần cho cả workspace. Khi một lượt giữ tiền đưa hạn mức tới ngưỡng này, các thành viên nhận một cảnh báo cho mỗi hạn mức, kỳ UTC và giới hạn. Khi một job bị từ chối, họ nhận một thông báo mức critical. Mỗi lần đổi hạn mức cũng thông báo cho thành viên và nêu ai đã đổi gì, nên hạn mức do agent hạ xuống không bao giờ im lặng.

## Trần cứng {#hard-cap}

Trước khi job bắt đầu, trường hợp xấu nhất của nó được giữ trên mọi hạn mức áp dụng. Nếu không vừa phần còn lại của một hạn mức, job kết thúc ở trạng thái `error` với lý do "budget cap reached" kèm số tiền. Job không bao giờ được khởi chạy hay bị tính phí, và Check Run trên GitHub cũng nói rõ như vậy. Thử lại cần một lượt giữ mới, nên hạn mức đã chạm cũng chặn luôn việc thử lại.

Một lần chạy thủ công mà job lớn nhất không vừa sẽ bị từ chối ngay với `402 CI_BUDGET_CAP_REACHED`.

Hạ hạn mức không dừng các job đang chạy: chúng giữ nguyên lượt giữ tiền và bị tính theo số giây đã chạy.

## Ai được đổi hạn mức {#who-can-change}

- Mọi thành viên đều đọc được mức sử dụng và hạn mức.
- Đặt hạn mức cần owner hoặc admin của workspace và, với API key hoặc ứng dụng đã kết nối, scope `ci:execute`.
- **Credential chỉ được thêm hoặc siết chặt.** API key, ứng dụng đã kết nối hoặc MCP client có thể đặt hạn mức khi chưa có, hoặc hạ thấp một hạn mức. Nâng hoặc gỡ hạn mức bị từ chối với `403 person_required`.
- Để nâng hoặc gỡ hạn mức, owner hoặc admin đăng nhập TOSE và thực hiện thay đổi (dashboard hoặc lời gọi API bằng phiên đăng nhập). Nhờ vậy hạn mức do một người đặt luôn có hiệu lực với agent.
- `If-Match` kèm ETag bạn đã đọc sẽ khiến thay đổi thất bại với `412 precondition_failed` nếu có người đổi hạn mức trong lúc đó. Hãy đọc lại rồi thử lại.

Mọi thay đổi, được phép hay bị từ chối, đều nằm trong audit log của workspace.

## Công cụ MCP {#mcp}

| Tool | Scope | Mục đích |
|------|-------|----------|
| `ci_get_usage` | `ci:read` | Cộng gộp mức sử dụng theo ngày, run, pipeline, job hoặc kind |
| `ci_get_budget` | `ci:read` | Liệt kê mọi hạn mức cùng đã chi, đang giữ, còn lại, ngưỡng cảnh báo và ETag |
| `ci_set_budget` | `ci:execute`, owner hoặc admin | Thêm hoặc hạ một hạn mức; truyền `pipeline_id` cho pipeline, `if_match` cho ETag |

Nâng hoặc gỡ hạn mức không phải thao tác MCP; hãy nhờ một người đăng nhập TOSE thực hiện.
