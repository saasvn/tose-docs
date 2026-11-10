# API usage và hạn mức của agent

Các endpoint REST cho việc đo Agent Runtime: mức dùng theo agent và theo lượt chạy, xem trước giá, hạn
mức cứng, dòng sự kiện hạn mức và đối soát. Về cách tính giá, xem
[Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing).

::: warning Tình trạng triển khai
Các endpoint này chỉ có khi tính năng Agent Runtime usage được bật trên bản cài đặt TOSE
(`AGENT_USAGE_ENABLED`, mặc định tắt). Việc nối orchestrator và canary trên runtime vẫn đang mở, nên
hãy xem đây là cam kết hành vi, chưa phải tính năng phát hành rộng rãi.
:::

Mọi path đều tính từ:

```
https://api-v2.tose.sh/api/workspaces/{slug}
```

Xác thực bằng API key trong header `X-API-Key` (xem [Xác thực](/vi/api/authentication)). Workspace bạn
không thấy được trả `404`.

## Endpoint

| Method | Path | Scope API key | Mục đích |
|--------|------|---------------|----------|
| `GET` | `/agent-usage` | `billing:read` | Tổng của cả workspace, hạn mức cứng, sự kiện hạn mức mới nhất |
| `GET` | `/agents/{agent_id}/usage` | `billing:read` | Chi tiết chi phí của một agent |
| `GET` | `/runs/{id}/usage` | `billing:read` | Chi tiết chi phí của một lượt chạy |
| `GET` | `/agent-usage/pricing-preview` | `billing:read` | Tính giá một workload mà không ghi gì |
| `GET` | `/agent-usage/budgets` | `billing:read` | Liệt kê hạn mức cứng |
| `PUT` | `/agent-usage/budgets` | `billing:write` | Đặt hạn mức cứng |
| `GET` | `/agent-usage/budget-events` | `billing:read` | Sự kiện hết hạn mức và bị từ chối |
| `GET` | `/agent-usage/reconciliation` | `billing:read` | So sổ cái với sự kiện vòng đời |

Mọi thành viên workspace đều gọi được. `billing:write` bao gồm `billing:read`; xem
[API key và scope](/vi/api/api-keys).

Hợp đồng OpenAPI là nguồn chuẩn cho mọi trường, enum và phản hồi. Hãy đọc tag **Agent usage** trong
[`internal/apispec/openapi.yaml`](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
của `tose-app` thay vì dựa vào bản sao ở đây.

## Số tiền

Mọi trường tiền là số nguyên **nano-USD** (1 USD = 1.000.000.000). Phần tổng hợp còn có `charged_usd`,
chuỗi USD thập phân với chín chữ số sau dấu phẩy.

| Trường | Ý nghĩa |
|--------|---------|
| `charged_nano_usd` | TOSE đã trừ vào ví (tổng hợp). |
| `forgiven_nano_usd` | Compute mà hạn mức hoặc ví hết tiền không trang trải được. Không bị thu. |
| `provider_telemetry_nano_usd` | Chi phí model do nhà cung cấp thu với khóa BYOK. TOSE không bao giờ thu. |
| `cost_nano_usd` | Trên dòng sổ cái: số TOSE đã tính. Âm với dòng điều chỉnh. |
| `provider_cost_nano_usd` | Trên dòng sổ cái: chi phí của chính nhà cung cấp cho lời gọi BYOK. |

Xem [miễn phí, được miễn và phải trả](/vi/guide/agent-runtime-pricing#free-forgiven-owed).

## Mức sử dụng {#usage}

```bash
curl -H "X-API-Key: $TOSE_API_KEY" \
  "$TOSE_API/api/workspaces/$WS/agents/$AGENT_ID/usage?from=2026-11-01&to=2026-11-09&page=1&limit=20"
```

`/agent-usage`, `/agents/{agent_id}/usage` và `/runs/{id}/usage` trả `summary` (tổng cùng các nhóm
`by_kind`, `by_cost_center` và `by_run`). Hai endpoint chi tiết còn trả `entries` của sổ cái, cùng
`total`, `page` và `limit`.

| Query | Ý nghĩa |
|-------|---------|
| `from`, `to` | Ngày UTC (`YYYY-MM-DD`). Chỉ lấy các mục trong khoảng đó. Giá trị sai định dạng bị bỏ qua. |
| `page`, `limit` | Chỉ cho endpoint chi tiết. `limit` từ 1-100, mặc định 20. |

Dòng sổ cái chỉ ghi thêm. Điều chỉnh là một dòng có dấu mới, không bao giờ sửa dòng cũ, và mỗi dòng có
khóa idempotency (`source_event_id`) nên một sự kiện chỉ tạo một dòng dù được gửi bao nhiêu lần. Agent
hoặc lượt chạy chưa có mức dùng trả tổng bằng 0. Lượt chạy thuộc workspace khác cũng trả tổng bằng 0.

## Xem trước giá {#pricing-preview}

`GET /agent-usage/pricing-preview` tính giá một workload theo bảng giá mà ví của bạn hiện đạt. Không
ghi gì cả.

| Query | Ý nghĩa |
|-------|---------|
| `cpu_millicores`, `ram_mib`, `seconds` | CPU, RAM và số giây sandbox ở trạng thái Ready |
| `storage_gib`, `storage_seconds` | Dung lượng và thời gian lưu trữ |
| `model_id`, `input_tokens`, `output_tokens`, `cache_tokens` | Token của model |
| `key_source` | `byok` (mặc định) hoặc `tose_managed`. Chỉ `tose_managed` mới được tính giá token. |

```bash
curl -H "X-API-Key: $TOSE_API_KEY" \
  "$TOSE_API/api/workspaces/$WS/agent-usage/pricing-preview?cpu_millicores=1000&ram_mib=2048&seconds=3600"
```

Phản hồi gồm `compute_nano_usd`, `storage_nano_usd`, `model_nano_usd`, `total_nano_usd`, `total_usd`,
`pricing_version` và `models_available`. Số lượng không phải số nguyên không âm hoặc `key_source` không
hợp lệ trả `400`. Model `tose_managed` chưa có giá trả `422`.

## Hạn mức {#budgets}

Hạn mức cứng giới hạn chi tiêu của cả workspace, một agent hoặc một lượt chạy.

```bash
curl -X PUT -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"scope":"agent","scope_id":"'$AGENT_ID'","limit_nano_usd":5000000000}' \
  "$TOSE_API/api/workspaces/$WS/agent-usage/budgets"
```

| Trường | Ý nghĩa |
|--------|---------|
| `scope` | `workspace`, `agent` hoặc `run` |
| `scope_id` | Id của agent hoặc lượt chạy. Bị bỏ qua với `workspace`, luôn là workspace của người gọi. |
| `limit_nano_usd` | Số nguyên không âm. `0` chặn compute của phạm vi đó. |

Phản hồi là hạn mức với `limit_nano_usd`, `spent_nano_usd` và `fenced_at`. Khi chi tiêu chạm hạn mức,
`fenced_at` được đặt và hạn mức **từ chối an toàn**: không có gì được đánh thức hay giữ tiền cho phạm
vi đó. Nâng hạn mức vượt `spent_nano_usd` sẽ gỡ chặn. Agent hoặc lượt chạy phải tồn tại trong workspace;
nếu không API trả `404`. Thiếu hạn mức, hạn mức âm hoặc `scope` không hợp lệ trả `400`.

`GET /agent-usage/budgets` liệt kê các hạn mức của workspace.

## Sự kiện hạn mức {#budget-events}

`GET /agent-usage/budget-events` liệt kê sự kiện, mới nhất trước: `budget.exhausted`,
`budget.reserve_denied` và `budget.fence_cleared`. Lọc theo `agent_id` và dùng `limit` (1-200, mặc định
50).

Khi hạn mức hoặc ví đã hết, yêu cầu làm khởi động compute bị từ chối với `402` và mã
`budget_exhausted`. Xem [Lỗi](/vi/api/errors).

## Đối soát {#reconciliation}

`GET /agent-usage/reconciliation` tính lại chi phí của mọi khoảng Ready đến dừng đã đóng từ sự kiện vòng
đời rồi so với sổ cái, để đối chiếu hóa đơn độc lập. Truyền `run_id` để kiểm tra một lượt chạy. Phản hồi
có `consistent` (mọi khoảng đều khớp) và, theo từng khoảng, số giây và nano-USD dự kiến so với sổ cái,
cùng việc khoảng đó còn `open` hay không.

## Liên quan

- [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing)
- [API key và scope](/vi/api/api-keys)
- [Bảng giá](/vi/guide/pricing)
