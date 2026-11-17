# API analytics của workspace

Analytics chỉ đọc cho một workspace: chi phí, tài nguyên, sức khỏe dịch vụ và deployment. Mỗi câu trả lời cho biết
dữ liệu đầy đủ đến đâu, và giá trị không đo được không bao giờ được báo là 0 hay là khỏe. Schema của response
(`AnalyticsOverview`, `AnalyticsCosts`, `AnalyticsResources`, `AnalyticsReliability`, `AnalyticsMeta`) nằm trong
[OpenAPI spec](https://api.tose.sh/api/openapi.yaml) dưới tag `Analytics`; trang này mô tả các trường lồng nhau chi
tiết hơn spec.

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

Mọi thành viên workspace đăng nhập dashboard đều đọc được tất cả route. API key cần scope trong bảng (key tạo
không kèm `scopes` có toàn quyền trên workspace của nó); xem [API key và scope](/vi/api/api-keys#scope). `deployments:read` cũng cấp `workspace:read` và
`projects:read`, nên key chỉ có `deployments:read` đọc được overview, resources và reliability, nhưng không đọc
được costs.

Không scope nào ngoài `billing:read` (hoặc `billing:write`, vốn bao gồm nó) trả về con số billing, kể cả trong
overview. `projects:read` và `deployments:read` không bao giờ để lộ chi phí.

| Status | Khi nào |
|--------|---------|
| `200` | Câu trả lời |
| `400` | `window` không phải `24h`, `7d` hay `30d` (`{"error":"window must be one of 24h, 7d, 30d"}`) |
| `401` | Không có credential hợp lệ |
| `403` | API key thiếu scope của route (`code: insufficient_scope`, kèm `required_scope`), hoặc key thuộc workspace khác hay gắn với một runtime (`code: forbidden`) |
| `404` | Analytics đang tắt, workspace không tồn tại, hoặc bạn không phải thành viên |
| `429` | Credential này đọc analytics quá nhiều (`code: rate_limited`, kèm `Retry-After: 5`). Xem [Giới hạn tần suất](#rate-limit) |
| `500` | Không đọc được một nguồn dữ liệu (`"Failed to load analytics"`). Mỗi request giới hạn 10 giây |
| `503` | Không chạy được bước kiểm tra quyền (`"Authorization is temporarily unavailable"`); hãy thử lại |

Bảng trên chỉ ghi trường `error`; body lỗi đầy đủ được mô tả trong [Mã lỗi](/vi/api/errors). Key của workspace khác
nhận `403` dù slug có tồn tại hay không, nên không dò được slug.

### Giới hạn tần suất {#rate-limit}

Mỗi credential (một API key, hoặc một người dùng đã đăng nhập) được đọc analytics 2 lần mỗi giây, dồn tối đa 20 lần,
tính chung cho cả bốn route. API key có hạn mức riêng, tách khỏi phiên đăng nhập của chủ key. Mỗi replica của API giữ
hạn mức trong bộ nhớ, nên khi có nhiều replica thì giới hạn áp dụng cho từng replica, và khởi động lại sẽ đặt lại nó.
Giới hạn được kiểm tra trước công tắc `ANALYTICS_ENABLED`, nên caller vượt giới hạn nhận `429` ngay cả khi analytics
đang tắt.

## Bộ lọc `window`

Mọi route nhận `?window=24h|7d|30d`, một khoảng thời gian kết thúc ở hiện tại. Mặc định là `24h`. Lịch sử giới hạn
khoảng 30 ngày (window `30d` bắt đầu từ đầu ngày UTC đầu tiên của nó); các dòng cũ hơn không bị xóa để áp giới hạn này, chỉ đơn giản là không bao giờ được đọc.

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

Giá trị không đo được (số tiền, bộ nhớ, pod sẵn sàng, tỉ lệ, thời lượng) là `null`, và phần không tính được là
`unavailable`. Nó không bao giờ là 0, và dự án không có bằng chứng không bao giờ được tính là khỏe hay đang up. Các
số đếm như `workloads` hay `pods` trong bucket không có mẫu nào là `0`; dùng `meta.coverage` để phân biệt bucket trống
với bucket đã đo.

Mọi câu trả lời chi tiết, và mọi phần `ok` của overview, đều có `meta`:

| Trường | Ý nghĩa |
|--------|---------|
| `observed_at` | Thời điểm tính câu trả lời |
| `from`, `to` | `from` được làm tròn xuống đầu bucket đầu tiên; `to` là thời điểm quan sát |
| `window`, `granularity` | `24h`/`7d`/`30d` và `15m`/`1h`/`1d` |
| `source` | Các bảng mà số liệu lấy từ đó |
| `complete` | `false` khi một bucket đã đóng không có dữ liệu hoặc không bucket nào có dữ liệu, hoặc khi nguồn dữ liệu bị chậm (xem [Khi nguồn dữ liệu bị chậm](#source-behind)). Với reliability, là `false` khi có dự án được giám sát ở trạng thái `stale` hoặc `unknown` (`coverage.ratio` của nó luôn là 1, vì bản ghi deployment và incident là đầy đủ) |
| `coverage` | `expected_points`, `observed_points`, `ratio`, `first_at` và `last_at` của các bucket |
| `units` | Đơn vị của từng loại số, ví dụ `{"cost":"nano_usd","balance":"usd_cents"}` |
| `incomplete_reasons` | Các mã ổn định cho một nguồn bị chậm dù các bucket trông vẫn đủ. Mã duy nhất là `ledger_stale`, cho chi phí. Rỗng trong các trường hợp khác |
| `collector_stale` | Chỉ có ở resources, và chỉ xuất hiện với giá trị `true` khi metrics collector bị chậm. Không có trong các trường hợp khác; server cũ hơn trường này không bao giờ gửi nó |
| `notes` | Các câu nêu rõ số liệu có và không có nghĩa gì |

### Khi nguồn dữ liệu bị chậm {#source-behind}

Bucket được phủ đủ không chứng minh nguồn dữ liệu còn mới: một bucket theo ngày có thể được phủ bởi một mẫu lấy từ
nhiều giờ trước. Hai bước kiểm tra xem bản ghi mới nhất, đặt `complete` thành `false` và thêm một câu vào `notes`.

- **`ledger_stale`** trong `incomplete_reasons` (chi phí). Dòng sổ cái usage mới nhất đã kết thúc hơn 3 giờ trước
  `observed_at` trong khi workspace có ví và đang chạy một dự án hoặc template mà billing tính phí, đã từng tính phí,
  và không thay đổi trong 3 giờ đó. Workload vừa khởi động, tiếp tục hoặc đổi kích thước chưa cần có trong sổ cái, và
  workload có chi phí mỗi giờ làm tròn về 0 cent không bao giờ có dòng nào. Các tổng dừng trước thời điểm hiện tại.
  Workspace không chạy gì thì không bao giờ bị coi là chậm.
- **`collector_stale: true`** (tài nguyên). Mẫu mới nhất trong window đã cũ hơn 30 phút, hoặc không có mẫu nào, trong
  khi workspace có một workload cần lấy mẫu: dự án đang active hoặc template đang chạy, có ít nhất một replica, đã
  được gán cho một server, và không được tạo hay thay đổi trong 30 phút gần nhất. Đây không phải một mã trong
  `incomplete_reasons`; danh sách mã đó giữ nguyên.

Trong overview, các phần `costs` và `resources` vẫn là `ok` và mang cùng `meta`, nên cờ và các ghi chú cũng hiện ở đó.

`collector_stale` là phép kiểm tra trên toàn workspace dựa vào mẫu mới nhất của bất kỳ workload nào, nên có các giới
hạn đã biết:

- Một mẫu gần đây từ server này có thể che khoảng trống thu thập trên server khác. Hãy đọc `last_sample_at` và
  `state` của từng workload để tìm các workload bị chậm.
- Template vừa được đánh thức có thể mang cờ này cho tới khi có mẫu đầu tiên, vì việc đánh thức không đổi thời điểm
  cập nhật của nó.

## Overview

```http
GET /api/workspaces/{slug}/analytics/overview?window=24h
```

Câu trả lời có `observed_at`, `window`, `from`, `to` (window trước khi làm tròn) và ba phần `costs`, `resources`, `reliability`. Mỗi phần có
`status`:

| `status` | `data` |
|----------|--------|
| `ok` | Tóm tắt của phần đó |
| `forbidden` | `null`. Credential thiếu scope của phần đó (`billing:read`, `projects:read` hoặc `deployments:read`); `reason` cho biết dữ liệu nào không đọc được |
| `unavailable` | `null`. Không đọc được nguồn của phần đó. Route vẫn trả `200` cùng các phần khác; ba phần dùng chung một giới hạn 10 giây, nên khi timeout có thể nhiều phần cùng là `unavailable` |

Các bản tóm tắt gồm: `costs` có `meta`, `totals`, `prepaid`, `budget_status` và `unavailable`; `resources` có
`meta`, `totals` và `latest_memory_bytes` (bộ nhớ của bucket mới nhất có mẫu; `null` khi có workload trong bucket đó thiếu số đo hợp lệ, không bao giờ lấy giá trị của bucket cũ hơn); `reliability` có
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
| `resources`, `resources_truncated` | Các tài nguyên tốn nhiều nhất (`type`, `id`, `name`, `project_id` với ổ đĩa của một dự án, ba số tiền, `usage_records`), và có tài nguyên nào bị lược bớt không |
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
- Bộ nhớ **observed** (quan sát được) là bộ nhớ của workload **cộng qua các pod đang chạy** (tối đa 10), đọc
  khoảng năm phút một lần. Mẫu có pod đang chạy không đọc được bị bỏ qua, và số đo 0 byte cũng vậy. Các mẫu lưu trước
  khi collector đọc mọi pod chỉ mô tả một pod, nên chỉ được tính cho workload có tối đa một pod.
- **Mức sử dụng CPU không được thu thập.** CPU chỉ xuất hiện ở dạng cấu hình và cấp phát.
- Kích thước CPU được đọc như một Kubernetes quantity, nên `"0.5"` và `"500m"` đều là nửa core, giống cách
  [billing](/vi/guide/pricing#compute) đọc nó.

| Trường | Ý nghĩa |
|--------|---------|
| `series` | Mỗi bucket: `at`, `workloads`, `memory_workloads`, `memory_bytes` (tổng, qua các workload, của trung bình số đo mọi pod của từng workload trong bucket; `null` khi không quan sát được gì), `pods`, `ready_pods` |
| `totals` | `workloads` (mọi dự án và template được liệt kê), rồi với các workload đang chạy và có replica: `running`, `replicas`, `allocated_cpu_cores`, `allocated_ram_gib`, và `no_samples` (workload đang chạy nhưng không có mẫu nào trong window) |
| `workloads`, `workloads_truncated` | Các workload lớn nhất theo RAM cấp phát, và có workload nào bị lược bớt không |

Mỗi workload có `type` (`project` hoặc `template`), `id`, `name`, `status`, `replicas`, kích thước cấu hình và cấp
phát, `sampled` (có cần mẫu hay không), `samples`, `observed_memory_bytes_last`, `observed_memory_bytes_avg`, `observed_memory_bytes_max`,
`last_sample_at`, `pods`, `ready_pods` và `state`:

| `state` | Ý nghĩa |
|---------|---------|
| `observed` | Collector có ít nhất một mẫu trong window (các trường bộ nhớ vẫn có thể là `null` nếu mọi số đo đều bằng 0) |
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
| `incidents` | `open` và `open_by_severity` hiện tại, `opened_in_window`, `resolved_in_window`, và `mttr_seconds` (thời gian khắc phục trung bình, MTTR; `null` khi không có incident nào được giải quyết trong window) |
| `uptime` | Theo dự án, từ lần kiểm tra mới nhất của monitor: `projects`, `up`, `down`, `unknown`, `stale`, `not_monitored` |
| `deployments` | `total`, `succeeded`, `failed`, `in_flight`, `other`, `success_ratio`, `duration_avg_seconds`, `duration_p95_seconds`, và `series` (`at`, `succeeded`, `failed` mỗi bucket) |

Deployment là các deployment dự án được tạo trong window. Incident và uptime tính tại thời điểm `observed_at`.

### Deployment thành công

- Một deployment **thành công** (succeeded) khi rollout đã xong, status không phải `failed` và không mang lỗi nào.
  Việc dừng hay rollback sau đó không làm mất kết quả này.
- Nó **thất bại** (failed) khi status là `failed`.
- Deployment đang chạy, kể cả rollback đang chờ xác minh, được đếm vào `in_flight`. Mọi deployment còn lại là
  `other`: ví dụ bị dừng hoặc rollback trước khi rollout xong, hoặc đã xong nhưng mang lỗi mà không bị đánh dấu
  `failed`. Cả hai đều không tính là thành công hay thất bại.
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

## Dashboard {#dashboard}

Khi `GET /api/public/features` trả `analytics: true`, dashboard hiện mục **Phân tích** trong nhóm **Giám sát** ở
sidebar, tại `/w/{slug}/analytics?window=24h|7d|30d`, và trang **Tổng quan** của workspace có thêm phần **Phân tích**
sau **Cần chú ý** và các incident đang mở. Phần này đọc route overview cho 24 giờ gần nhất và hiện một thẻ cho chi phí,
một cho tài nguyên, một cho tình trạng dịch vụ kèm deployment; mỗi thẻ dẫn tới phần tương ứng của trang Phân tích. Nếu
route overview trả `404`, phần này tự ẩn.

Cả hai đọc các route ở trên bằng quyền của người đang đăng nhập, nên không hiện gì mà người đó không đọc được qua API.

- Mỗi phần của trang Phân tích tải riêng. Phần mà người dùng không có quyền đọc hiện thông báo về quyền, các phần khác
  vẫn tải. Request lỗi hoặc câu trả lời không đọc được hiện thông báo lỗi kèm nút **Thử lại**. Khi gặp `429`, trang
  yêu cầu chờ năm giây. Phần có route trả `404` báo là không khả dụng trên nền tảng này. Trên trang Tổng quan, phần
  `unavailable` hiện lỗi của nó trong khi các thẻ khác vẫn hiện.
- Cảnh báo dựa theo `meta`: độ phủ lấy từ `coverage`, và `complete` cùng `incomplete_reasons`. `ledger_stale` cảnh
  báo chi tiêu gần đây có thể bị thiếu. `collector_stale: true` cảnh báo collector đã ngừng báo cáo và ẩn các số đo
  tài nguyên hiện tại thay vì hiện số cũ như số hiện tại.
- Giá trị không đo được hiện là dấu gạch (`—`), không bao giờ là 0, và bucket bị thiếu làm đứt đường biểu đồ.
- Chi phí hiện chi tiêu đo được thực tế (các kỳ sổ cái đã kết thúc) và chi tiêu đang đo (kỳ đang diễn ra) ở hai ô
  riêng. Dự báo cuối tháng và runway compute được hiện tách khỏi chi tiêu đã quan sát.
- Tài nguyên hiện CPU và RAM cấp phát, kích thước mỗi replica của từng workload, và bộ nhớ lấy mẫu: các pod đang chạy của từng
  workload, cộng qua các workload. CPU đang dùng được hiện là không đo.
- Tình trạng dịch vụ hiện số incident đang mở theo mức độ, số đếm của lần kiểm tra uptime mới nhất, kết quả
  deployment, tỉ lệ thành công, và thời gian deploy trung bình và p95. Biểu đồ của nó đếm các deployment đã kết thúc.

## Chưa có trong v1

- Analytics cấp tài khoản hoặc gộp nhiều workspace.
- Mức sử dụng CI và agent. Dùng [Mức sử dụng CI và hạn mức](/vi/api/ci-usage-budget),
  [Usage và hạn mức agent](/vi/api/agent-usage), các tool MCP `ci_get_usage` và `get_agent_usage`, hoặc `tose ci usage`.
- Cảnh báo, phát hiện bất thường, phân vị độ trễ HTTP và mọi thao tác ghi.
- Mức sử dụng CPU, và lịch sử cũ hơn 30 ngày.

[`tose analytics`](/vi/commands/analytics) đã được merge vào tose-cli
([saasvn/tose-cli#108](https://github.com/saasvn/tose-cli/pull/108)) nhưng chưa có trong bản phát hành nào (bản mới
nhất là v0.2.0). Chưa có tool MCP hay adapter WebMCP
cho analytics; trong lúc chờ, hãy gọi trực tiếp các route này.

## Tài liệu liên quan

- [API key và scope](/vi/api/api-keys)
- [Mã lỗi](/vi/api/errors)
- [Mức sử dụng CI và hạn mức](/vi/api/ci-usage-budget)
- [Usage và hạn mức agent](/vi/api/agent-usage)
