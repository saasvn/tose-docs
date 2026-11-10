# API analytics của workspace

Analytics chỉ đọc cho một workspace: chi phí, tài nguyên, sức khỏe dịch vụ và deployment. Mỗi câu trả lời cho biết
dữ liệu đầy đủ đến đâu, và dữ liệu thiếu không bao giờ được báo là 0 hay là khỏe. Schema đầy đủ
(`AnalyticsOverview`, `AnalyticsCosts`, `AnalyticsResources`, `AnalyticsReliability`, `AnalyticsMeta`) nằm trong
[OpenAPI spec](https://api.tose.sh/api/openapi.yaml) dưới tag `Analytics`.

Các route này không ghi gì, không phát cảnh báo và không thay đổi billing.

::: warning Mặc định tắt
Các route chỉ trả lời khi server đặt `ANALYTICS_ENABLED=true`. Khi cờ tắt, chúng trả `404`, giống như với một
workspace không tồn tại. Credential thiếu scope của route vẫn nhận `403`, vì kiểm tra quyền chạy trước khi đọc cờ.
Nếu bạn tự host TOSE, hãy đặt biến này trên API.
:::

## Route

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/analytics`.

| Method và đường dẫn | Scope | Trả về |
|---------------------|-------|--------|
| `GET /overview` | `workspace:read` | Tóm tắt các phần chi phí, tài nguyên và độ tin cậy. Phần mà credential không được đọc có trạng thái `forbidden` và không chứa số liệu nào |
| `GET /costs` | `billing:read` | Chi tiêu theo thời gian, tổng, dự án và tài nguyên tốn nhiều nhất, số dư trả trước, dự báo và ngân sách |
| `GET /resources` | `projects:read` | CPU và RAM cấu hình và cấp phát theo workload, bộ nhớ quan sát được, pod |
| `GET /reliability` | `deployments:read` | Incident, lần kiểm tra uptime mới nhất của mỗi dự án, deployment |

Mọi thành viên workspace đăng nhập dashboard đều đọc được tất cả route. API key hoặc OAuth grant cần scope trong
bảng; xem [API key & Scope](/vi/api/api-keys#scope). `deployments:read` cũng cấp `workspace:read` và
`projects:read`, nên key chỉ có `deployments:read` đọc được overview, resources và reliability, nhưng không đọc
được costs.

Một scope không bao giờ để lộ khu vực khác. `projects:read` không trả về con số billing nào, kể cả trong overview:
dữ liệu billing luôn cần `billing:read`.

| Status | Khi nào |
|--------|---------|
| `200` | Câu trả lời |
| `400` | `window` không phải `24h`, `7d` hay `30d` (`{"error":"window must be one of 24h, 7d, 30d"}`) |
| `401` | Không có credential hợp lệ |
| `403` | Credential thiếu scope của route (`code: insufficient_scope`) |
| `404` | Analytics đang tắt, workspace không tồn tại, bạn không phải thành viên, hoặc API key thuộc workspace khác |
| `500` | Không đọc được một nguồn dữ liệu (`{"error":"Failed to load analytics"}`). Mỗi truy vấn giới hạn 10 giây |

## Bộ lọc `window`

Mọi route nhận `?window=24h|7d|30d`, một khoảng thời gian kết thúc ở hiện tại. Mặc định là `24h`. Lịch sử giới hạn
30 ngày; các dòng cũ hơn không bị xóa để áp giới hạn này, chỉ đơn giản là không bao giờ được đọc.

Kích thước bucket theo window và theo nguồn:

| Window | Costs | Resources | Reliability |
|--------|-------|-----------|-------------|
| `24h` | 1h | 15m | 1h |
| `7d` | 1h | 1h | 1d |
| `30d` | 1d | 1d | 1d |

Chi phí lấy từ các dòng sổ cái theo giờ, tài nguyên lấy từ mẫu của collector mỗi năm phút, nên bucket không bao giờ
mịn hơn nguồn và không bao giờ được nội suy. Điểm bắt đầu của window được làm tròn xuống đầu bucket đầu tiên, và
`meta.from` báo điểm bắt đầu đã làm tròn đó.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/analytics/costs?window=7d" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Dữ liệu thiếu và `meta`

Dữ liệu thiếu là `null` hoặc `unavailable`. Nó không bao giờ là 0, và dự án không có bằng chứng không bao giờ được
tính là khỏe hay đang up.

Mọi câu trả lời chi tiết, và mọi phần `ok` của overview, đều có `meta`:

| Trường | Ý nghĩa |
|--------|---------|
| `observed_at` | Thời điểm tính câu trả lời |
| `from`, `to` | Window đã làm tròn |
| `window`, `granularity` | `24h`/`7d`/`30d` và `15m`/`1h`/`1d` |
| `source` | Các bảng mà số liệu lấy từ đó |
| `complete` | `false` khi một bucket đã đóng không có dữ liệu hoặc bằng chứng đã cũ |
| `coverage` | `expected_points`, `observed_points`, `ratio`, `first_at` và `last_at` của các bucket |
| `units` | Đơn vị của từng loại số, ví dụ `{"cost":"nano_usd","balance":"usd_cents"}` |
| `notes` | Các câu nêu rõ số liệu có và không có nghĩa gì |

## Overview

```http
GET /api/workspaces/{slug}/analytics/overview?window=24h
```

Câu trả lời có `observed_at`, `window`, `from`, `to` và ba phần `costs`, `resources`, `reliability`. Mỗi phần có
`status`:

| `status` | `data` |
|----------|--------|
| `ok` | Tóm tắt của phần đó |
| `forbidden` | `null`. Credential thiếu scope của phần đó (`billing:read`, `projects:read` hoặc `deployments:read`); `reason` cho biết dữ liệu nào không đọc được |
| `unavailable` | `null`. Không đọc được nguồn của phần đó; các phần khác vẫn được trả lời |

Các bản tóm tắt gồm: `costs` có `meta`, `totals`, `prepaid`, `budget_status` và `unavailable`; `resources` có
`meta`, `totals` và `latest_memory_bytes` (bucket mới nhất có bộ nhớ quan sát được, hoặc `null`); `reliability` có
`meta`, `incidents`, `uptime` và `deployments`. Để xem chi tiết một phần, gọi route riêng của nó với cùng window.

```json
{
  "observed_at": "2026-11-10T09:00:00Z",
  "window": "24h",
  "from": "2026-11-09T09:00:00Z",
  "to": "2026-11-10T09:00:00Z",
  "costs": { "status": "forbidden", "reason": "This credential cannot read billing data", "data": null },
  "resources": { "status": "ok", "data": { "meta": { "...": "..." }, "totals": { "...": "..." }, "latest_memory_bytes": 412090368 } },
  "reliability": { "status": "ok", "data": { "meta": { "...": "..." }, "incidents": { "...": "..." }, "uptime": { "...": "..." }, "deployments": { "...": "..." } } }
}
```

## Costs

```http
GET /api/workspaces/{slug}/analytics/costs?window=30d
```

Số tiền tính bằng **nano-USD** (1 USD = 1.000.000.000), trừ khi tên trường kết thúc bằng `_cents` (cent USD).

| Trường | Ý nghĩa |
|--------|---------|
| `series` | Một điểm mỗi bucket: `at` và `actual_nano_usd`. Bucket không có dòng sổ cái là `null`, không phải `0` |
| `totals` | `actual_nano_usd` (các kỳ sổ cái đã kết thúc), `live_nano_usd` (kỳ đang diễn ra), `compute_nano_usd` và `storage_nano_usd` (phần chia của `actual`) |
| `projects` | Chi phí theo dự án: `id`, `name`, `compute_nano_usd`, `storage_nano_usd`, `total_nano_usd` |
| `resources`, `resources_truncated` | Các tài nguyên tốn nhiều nhất (`type`, `id`, `name`, ba số tiền, `usage_records`), và có tài nguyên nào bị lược bớt không |
| `prepaid` | `balance_cents`, `unbilled_nano_usd`, `monthly_budget_cents`, `runway_days`, `depletes_at` |
| `forecast` | Dự báo, tách riêng khỏi số đã đo: chi tiêu compute và storage mỗi ngày, chi tiêu dự kiến, `compute_runway_days`, `depletes_at` |
| `budget` | `monthly_budget_cents`, `month_to_date_nano_usd`, `projected_month_end_nano_usd`, `status` (`none`, `ok`, `at_risk`, `over`) và `note` |
| `unavailable` | Các phần không tính được. Khi không có ví, `prepaid`, `forecast` và `budget` là `null` và được liệt kê ở đây |

Phần chia nhỏ dùng cùng báo cáo chi phí với `GET /api/workspaces/{slug}/wallet/costs`, nên `actual + live` bằng
tổng của nó. Compute được đo trong một giờ bắt đầu với số dư bằng 0 vẫn được liệt kê nhưng chưa bao giờ bị trừ tiền.
Khi không có chi tiêu compute trong khoảng dự báo, `runway_days` là `null` (không biết, không phải vô hạn) và
`meta.notes` ghi rõ điều đó.

## Resources

```http
GET /api/workspaces/{slug}/analytics/resources?window=24h
```

Resources tách cấu hình khỏi quan sát:

- **Configured** (cấu hình) là kích thước một replica (`configured_cpu_cores`, `configured_ram_gib`).
- **Allocated** (cấp phát) là kích thước cấu hình nhân số replica (`allocated_cpu_cores`, `allocated_ram_gib`). Cả hai
  đều không phải mức sử dụng.
- Bộ nhớ **observed** (quan sát được) lấy từ **một pod mỗi workload**, đọc khoảng năm phút một lần. Nó mô tả một
  replica và **không** được nhân với số replica. Giá trị 0 byte nghĩa là không đọc được pod và bị bỏ qua.
- **Mức sử dụng CPU không được thu thập.** CPU chỉ xuất hiện ở dạng cấu hình và cấp phát.

| Trường | Ý nghĩa |
|--------|---------|
| `series` | Mỗi bucket: `at`, `workloads`, `memory_workloads`, `memory_bytes` (`null` khi không quan sát được gì), `pods`, `ready_pods` |
| `totals` | Với các workload đang chạy: `workloads`, `running`, `replicas`, `allocated_cpu_cores`, `allocated_ram_gib`, và `no_samples` (workload đang chạy nhưng không có mẫu nào trong window) |
| `workloads`, `workloads_truncated` | Các workload lớn nhất theo RAM cấp phát, và có workload nào bị lược bớt không |

Mỗi workload có `type` (`project` hoặc `template`), `id`, `name`, `status`, `replicas`, kích thước cấu hình và cấp
phát, `samples`, `observed_memory_bytes_last`, `observed_memory_bytes_avg`, `observed_memory_bytes_max`,
`last_sample_at`, `pods`, `ready_pods` và `state`:

| `state` | Ý nghĩa |
|---------|---------|
| `observed` | Collector có số đo trong window |
| `no_samples` | Đang chạy và có replica, nhưng collector không ghi được gì trong window |
| `not_sampled` | Đã dừng hoặc không có replica, nên không cần mẫu |

Số pod sẵn sàng chỉ biết được từ các mẫu đã đếm mọi pod. Các mẫu lưu trước đó chỉ đếm pod đang chạy đầu tiên, nên
bucket của chúng báo `ready_pods` là `null`.

## Reliability

```http
GET /api/workspaces/{slug}/analytics/reliability?window=7d
```

| Trường | Ý nghĩa |
|--------|---------|
| `incidents` | `open` và `open_by_severity` hiện tại, `opened_in_window`, `resolved_in_window`, và `mttr_seconds` (thời gian xử lý trung bình, `null` khi chưa có incident nào được giải quyết) |
| `uptime` | Theo dự án, từ lần kiểm tra mới nhất của monitor: `projects`, `up`, `down`, `unknown`, `stale`, `not_monitored` |
| `deployments` | `total`, `succeeded`, `failed`, `in_flight`, `other`, `success_ratio`, `duration_avg_seconds`, `duration_p95_seconds`, và `series` (`at`, `succeeded`, `failed` mỗi bucket) |

Deployment là các deployment dự án được tạo trong window. Incident và uptime tính tại thời điểm `observed_at`.

### Deployment thành công

- Một deployment **thành công** (succeeded) khi rollout đã xong, status không phải `failed` và không mang lỗi nào.
  Việc dừng hay rollback sau đó không làm mất kết quả này.
- Nó **thất bại** (failed) khi status là `failed`.
- Deployment đang chạy, kể cả rollback đang chờ xác minh, được đếm vào `in_flight`. Deployment bị dừng hoặc rollback
  trước khi rollout xong được đếm vào `other`. Cả hai đều không tính là thành công hay thất bại.
- `success_ratio` là succeeded / (succeeded + failed), một tỉ lệ từ 0 đến 1, và là `null` khi chưa có deployment nào
  kết thúc.
- Thời lượng tính từ lúc bắt đầu build (hoặc lúc tạo) đến khi rollout xong, chỉ trên các deployment thành công.

**Giới hạn đã biết:** deployment bị người dùng dừng đúng lúc nó thất bại có thể giữ thời điểm kết thúc mà không có
lỗi, và khi đó bị tính là thành công.

### Uptime

Uptime là **lần kiểm tra mới nhất** của [uptime monitor](/vi/api/projects#uptime) của mỗi dự án. Lịch sử kiểm tra
không được lưu, nên **không có tỉ lệ uptime phần trăm**.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `up`, `down` | Kết quả của lần kiểm tra mới nhất |
| `stale` | Lần kiểm tra cuối đã cũ hơn ba chu kỳ kiểm tra |
| `unknown` | Monitor chưa từng chạy, hoặc không báo up cũng không báo down |
| `not_monitored` | Dự án không có monitor nào đang bật |

`stale`, `unknown` và `not_monitored` không bao giờ được tính là up.

## Chưa có trong v1

- Analytics cấp tài khoản hoặc gộp nhiều workspace.
- Mức sử dụng CI và agent. Dùng [Mức sử dụng CI và hạn mức](/vi/api/ci-usage-budget),
  [Usage và hạn mức agent](/vi/api/agent-usage), các tool MCP `ci_get_usage` và `get_agent_usage`, hoặc `tose ci usage`.
- Cảnh báo, phát hiện bất thường, phân vị độ trễ HTTP và mọi thao tác ghi.
- Mức sử dụng CPU, và lịch sử cũ hơn 30 ngày.

Lệnh CLI, tool MCP và adapter WebMCP cho analytics chưa được phát hành. Trong lúc chờ, hãy gọi trực tiếp các route này.

## Tài liệu liên quan

- [API key & Scope](/vi/api/api-keys)
- [Mã lỗi](/vi/api/errors)
- [Mức sử dụng CI và hạn mức](/vi/api/ci-usage-budget)
- [Usage và hạn mức agent](/vi/api/agent-usage)
