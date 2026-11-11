# Số liệu workload

TOSE lấy mẫu mỗi dự án và template đang chạy năm phút một lần và lưu kết quả thành **số liệu tài nguyên**: bộ nhớ, trạng thái ready của pod và bộ đếm mạng. Trang này giải thích các số liệu đó đo gì, không đo gì, và cách đọc chúng trên dashboard và qua API.

## Cấu hình không phải là quan sát

Một workload có hai loại số liệu khác nhau. Hãy tách bạch chúng khi đọc biểu đồ.

| | Là gì | Nguồn |
|---|---|---|
| **Cấu hình** (configured) | CPU, bộ nhớ và số replica workload được đặt để dùng, và những gì billing đã ghi nhận | Cài đặt của dự án hoặc template và sổ usage. Đây là cấu hình, không bao giờ là mức sử dụng |
| **Bộ nhớ quan sát** (observed) | Bộ nhớ của container chính của workload (container đầu tiên của mỗi pod; không gồm sidecar), **cộng trên mọi pod đang chạy** | Bộ thu thập số liệu |
| **Trạng thái ready quan sát** | Số pod được liệt kê, đang chạy và ready, đếm trên mọi pod đang chạy | Bộ thu thập số liệu |
| **Mức dùng CPU** | Không thu thập. Hiển thị là `unsupported` | Không có. CPU cấu hình không bao giờ được hiển thị như mức sử dụng |
| **Mạng** | Bộ đếm byte cộng dồn của từng pod. Không suy ra *tốc độ*, nên tốc độ mạng là `unsupported` | Bộ thu thập số liệu |

TOSE không báo cáo mức dùng CPU hay tỷ lệ uptime. Một [uptime monitor](/vi/api/projects#uptime) cho biết lần kiểm tra gần nhất có đạt không; nó không chứng minh được dịch vụ chạy liên tục giữa hai lần kiểm tra.

## Cách lấy một mẫu

Cứ năm phút, bộ thu thập đọc mọi pod đang chạy của mỗi dự án đang hoạt động và mỗi template đang chạy, tối đa 10 pod mỗi workload. Mỗi mẫu ghi:

- `running_pods`: số pod đang chạy;
- `sampled_pods`: số pod đã trả lời;
- tổng bộ nhớ và mạng của các pod đã trả lời.

Một mẫu là **đầy đủ** khi mọi pod đang chạy đều trả lời (`sampled_pods` bằng `running_pods`). Chỉ mẫu đầy đủ mới được tính vào bộ nhớ và mạng. Mẫu có pod không trả lời, mẫu mà mọi lần đọc đều lỗi, hoặc mẫu của workload chạy quá 10 pod vẫn được giữ, nhưng không được tính trung bình vào bộ nhớ: nó sẽ làm tổng thấp hơn thực tế.

Các mẫu lưu trước khi có bộ thu thập này chỉ đọc pod đầu tiên. Chúng chỉ được tính cho workload có tối đa một pod.

## Không đo được là `null`, không bao giờ là `0`

Khi một số liệu không được đo, API trả `null` và dashboard để trống đoạn đó trên biểu đồ. Giá trị `0` luôn là một lần đọc thật bằng 0. Quy tắc này áp dụng cho `memory_bytes`, `memory_mb`, `network_rx`, `network_tx` và `ready_count`, và cho `pod_count` trong bucket (mẫu thô luôn có số pod được liệt kê).

Một bucket lẽ ra có mẫu nhưng không có mẫu nào được đánh dấu `gap: true`. Gap nghĩa là "không có quan sát", không phải "bị sập".

## Độ phân giải

| Khoảng (`period`) | Bạn nhận được | Granularity |
|---|---|---|
| `1h`, `6h`, `24h` | Các mẫu đã lưu, tối đa 1000 mẫu mới nhất. `truncated: true` cho biết các mẫu cũ hơn đã bị bỏ | `raw` (một điểm mỗi năm phút) |
| `7d` | Bucket theo giờ | `1h` |
| `30d` | Bucket theo ngày | `1d` |

Bucket được tính trên toàn bộ khoảng thời gian, nên biểu đồ 30 ngày phủ đủ 30 ngày. Bucket giờ bắt đầu từ đầu giờ địa phương và bucket ngày từ nửa đêm địa phương theo múi giờ yêu cầu; một ngày đi qua thời điểm đổi giờ mùa hè dài 23 hoặc 25 giờ.

## Trên dashboard

Mở một template và chọn **Metrics**. Bộ chọn khoảng thời gian có năm giá trị ở trên. Biểu đồ bộ nhớ và mạng dùng múi giờ của trình duyệt để chia bucket và để trống chỗ không đo được. **Config CPU** là kích thước cấu hình, không phải mức sử dụng.

## API {#api}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/metrics/resources?period=24h
GET /api/workspaces/{slug}/templates/{template_slug}/metrics/resources?period=30d&timezone=Asia/Ho_Chi_Minh
```

Mọi thành viên workspace đều đọc được. Workload của workspace khác trả `404`.

| Tham số query | Mô tả |
|---|---|
| `period` | `1h`, `6h`, `24h` (mặc định), `7d` hoặc `30d`. Giá trị khác trả `400` |
| `timezone` | Tên múi giờ IANA, ví dụ `Europe/Berlin`. Đặt ranh giới bucket của `7d` và `30d`. Mặc định là UTC. Với `7d` và `30d`, tên không hợp lệ trả `400`; khoảng thô bỏ qua tham số này |

### Mẫu thô (`1h`, `6h`, `24h`)

```json
{
  "period": "24h",
  "since": "2026-11-10T00:00:00Z",
  "granularity": "raw",
  "observed_at": "2026-11-10T23:55:00Z",
  "source": "resource_metrics",
  "truncated": false,
  "count": 288,
  "data_points": [
    {
      "timestamp": "2026-11-10T23:55:00Z",
      "memory_bytes": 536870912,
      "memory_mb": 512,
      "network_rx": 120394,
      "network_tx": 88213,
      "pod_count": 2,
      "ready_count": 2,
      "running_pods": 2,
      "sampled_pods": 2
    }
  ]
}
```

`running_pods` và `sampled_pods` chỉ có trên các mẫu do bộ thu thập hiện tại lấy. `pod_count` là số pod được liệt kê.

### Bucket (`7d`, `30d`)

```json
{
  "period": "30d",
  "since": "2026-10-11T23:57:12Z",
  "from": "2026-10-11T23:57:12Z",
  "to": "2026-11-10T23:57:12Z",
  "granularity": "1d",
  "timezone": "Asia/Ho_Chi_Minh",
  "observed_at": "2026-11-10T23:55:00Z",
  "source": "resource_metrics",
  "complete": false,
  "observed": {
    "memory": { "status": "incomplete", "reason": "some samples did not cover every replica or a stats read failed, ...", "coverage": 0.86, "source": "resource_metrics" },
    "readiness": { "status": "ok", "coverage": 0.97, "source": "resource_metrics" },
    "cpu": { "status": "unsupported", "reason": "the collector does not measure CPU usage; ...", "coverage": null, "source": "resource_metrics" },
    "network": { "status": "unsupported", "reason": "only cumulative per-pod counters are stored, ...", "coverage": null, "source": "resource_metrics" }
  },
  "truncated": false,
  "count": 31,
  "data_points": [
    {
      "timestamp": "2026-11-09T17:00:00Z",
      "memory_bytes": 529530880,
      "memory_mb": 505,
      "network_rx": 9120394,
      "network_tx": 4088213,
      "pod_count": 2,
      "ready_count": 2,
      "samples": 288,
      "gap": false
    }
  ]
}
```

| Trường | Ý nghĩa |
|---|---|
| `memory_bytes`, `memory_mb` | Trung bình các mẫu hợp lệ trong bucket (mẫu đầy đủ, và mẫu cũ một pod của workload một pod); `null` khi không có mẫu nào |
| `network_rx`, `network_tx` | Bộ đếm cộng dồn lớn nhất trong các mẫu hợp lệ của bucket. Bộ đếm khởi động lại theo từng pod, nên đừng trừ hai bucket để ra tốc độ |
| `pod_count` | Số pod lớn nhất thấy trong bucket |
| `ready_count` | Số pod ready nhỏ nhất thấy trong bucket |
| `samples`, `gap` | Số mẫu trong bucket, và bucket có thiếu mẫu dù lẽ ra phải có hay không |
| `observed` | Mỗi tín hiệu `memory`, `readiness`, `cpu` và `network` có `status` (`ok`, `incomplete`, `stale`, `unavailable` hoặc `unsupported`), `reason` tùy chọn, `source` và `coverage` (số mẫu hợp lệ trên số mẫu kỳ vọng, từ 0 đến 1, hoặc `null`) |
| `complete` | `true` khi mọi tín hiệu đo được đều `ok`: coverage ít nhất 90% và mẫu mới nhất không cũ hơn ba chu kỳ lấy mẫu. Tín hiệu `unsupported` không làm câu trả lời bị thiếu |
| `observed_at` | Thời điểm của mẫu mới nhất đứng sau câu trả lời, hoặc `null` |

`timestamp` là thời điểm bắt đầu bucket theo UTC. `from` là thời điểm yêu cầu trừ đi khoảng thời gian, `to` là thời điểm yêu cầu. Khoảng 30 ngày không bắt đầu đúng nửa đêm địa phương có 31 bucket, nên các ngày cũ nhất không bao giờ bị cắt.

Số liệu toàn workspace đến từ [API analytics](/vi/api/analytics), với định nghĩa riêng.

## Liên quan

- [API dự án](/vi/api/projects): status, uptime monitor và deployment
- [Sidecar của dự án](/vi/guide/project-sidecars): sidecar không nằm trong bộ nhớ quan sát
- [`tose analytics`](/vi/commands/analytics): chi phí, tài nguyên và độ tin cậy toàn workspace
