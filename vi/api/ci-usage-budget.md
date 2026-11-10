# API mức sử dụng CI và hạn mức ngân sách

Các endpoint để đọc mức sử dụng CI của workspace và đọc, đặt hạn mức ngân sách trả trước. Khái niệm nằm ở [Mức sử dụng CI và hạn mức ngân sách](/vi/guide/ci-usage-and-budgets). Schema đầy đủ (`CIWorkspaceUsage`, `CIBudgetReport`, `CIWorkspaceBudget`, `CIPipelineBudget`) có trong [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/ci`.

| Method và đường dẫn | Ai | Mục đích |
|---------------------|----|----------|
| `GET /usage` | Mọi thành viên, hoặc `ci:read` | Cộng gộp mức sử dụng |
| `GET /budget` | Mọi thành viên, hoặc `ci:read` | Mọi hạn mức cùng đã chi, đang giữ, còn lại |
| `PUT /budget` | Owner hoặc admin; credential cần `ci:execute` | Đặt hạn mức toàn workspace |
| `DELETE /budget` | Owner hoặc admin đã đăng nhập | Gỡ hạn mức toàn workspace |
| `GET /pipelines/{pipeline_id}/budget` | Mọi thành viên, hoặc `ci:read` | Hạn mức của một pipeline |
| `PUT /pipelines/{pipeline_id}/budget` | Owner hoặc admin; credential cần `ci:execute` | Đặt hạn mức của pipeline |
| `DELETE /pipelines/{pipeline_id}/budget` | Owner hoặc admin đã đăng nhập | Gỡ hạn mức của pipeline |

Pipeline hoặc run của workspace khác trả về `404`.

## Lấy mức sử dụng

```http
GET /api/workspaces/{slug}/ci/usage?group_by=day&from=2026-11-01&to=2026-11-08
```

| Query | Mô tả |
|-------|-------|
| `group_by` | `day` (mặc định), `run`, `pipeline`, `job` (`run_id/job_name`) hoặc `kind` |
| `pipeline_id`, `run_id` | Thu hẹp báo cáo |
| `from`, `to` | Mốc bắt đầu (bao gồm) và kết thúc (không bao gồm), RFC 3339 hoặc `YYYY-MM-DD` (UTC). Không có `from` hoặc `run_id`: 30 ngày UTC gần nhất. Tối đa 366 ngày |

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/usage?group_by=pipeline" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Phản hồi:** `200` với `group_by`, `from`, `to`, `rows`, `totals` và `truncated` (tối đa 1000 dòng). Mỗi dòng và `totals` có `key`, `events`, `active_seconds`, `cost_nano_usd`, `billed_nano_usd`, `credit_nano_usd`, `capped_nano_usd`, `forgiven_nano_usd` và `charged_cents`, tất cả là số nguyên.

## Lấy hạn mức ngân sách

```http
GET /api/workspaces/{slug}/ci/budget
```

**Phản hồi:** `200` với `balance_cents`, `held_nano_usd`, `workspace` (`max_daily_cost_cents`, `max_monthly_cost_cents`, `alert_percent`, `etag`, `caps`), `pipelines` (mỗi pipeline có `max_run_cost_cents`, `max_daily_cost_cents`, `max_monthly_cost_cents`, `etag`, `caps`) và `rules`. Header `ETag` là ETag của hạn mức toàn workspace.

Mỗi phần tử của `caps` có `scope` (`daily`, `monthly`, `workspace_daily`, `workspace_monthly`), `limit_cents`, `spent_nano_usd`, `held_nano_usd`, `remaining_nano_usd`, `used_percent`, `state` (`ok`, `near`, `reached`), `period_start` và `resets_at`.

## Đặt hạn mức

```http
PUT /api/workspaces/{slug}/ci/budget
PUT /api/workspaces/{slug}/ci/pipelines/{pipeline_id}/budget
If-Match: "<etag>"
```

Gửi ít nhất một trường; không chấp nhận trường nào khác. Giá trị là USD cent từ 1 đến 10000000, và `0` nghĩa là không có.

| Route | Trường |
|-------|--------|
| Workspace | `max_daily_cost_cents`, `max_monthly_cost_cents`, `alert_percent` (1 đến 100, mặc định 80) |
| Pipeline | `max_run_cost_cents`, `max_daily_cost_cents`, `max_monthly_cost_cents` |

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/ci/budget" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -H 'If-Match: "<etag từ GET /budget>"' \
  -d '{"max_daily_cost_cents": 500}'
```

**Phản hồi:** `200` với hạn mức sau khi thay đổi và một `ETag` mới.

## Gỡ hạn mức

`DELETE` trên một trong hai route budget sẽ gỡ hạn mức (ngưỡng cảnh báo của workspace được giữ lại). Cần owner hoặc admin đăng nhập TOSE.

## Quy tắc và lỗi

| Status | Code | Ý nghĩa |
|--------|------|---------|
| `403` | `person_required` | API key hoặc ứng dụng đã kết nối cố nâng hoặc gỡ hạn mức. Chỉ được thêm hoặc hạ |
| `412` | `precondition_failed` | `If-Match` không còn khớp. Hãy đọc lại hạn mức |
| `402` | `CI_BUDGET_CAP_REACHED` | Run thủ công bị từ chối vì job lớn nhất không vừa hạn mức của run, pipeline hoặc workspace. Xem [trần cứng](/vi/guide/ci-usage-and-budgets#hard-cap) |

Hạ hạn mức sẽ từ chối các job mới không vừa; job đang chạy giữ nguyên lượt giữ tiền. Mọi thay đổi nằm trong audit log với action `ci.budget` và thông báo cho thành viên workspace.

## MCP

Cho workspace mà kết nối được gắn: `ci_get_usage` và `ci_get_budget` (`ci:read`), và `ci_set_budget` (`ci:execute`, owner hoặc admin). `ci_set_budget` nhận `pipeline_id` (bỏ trống cho workspace), `max_run_cost_cents` (chỉ pipeline), `max_daily_cost_cents`, `max_monthly_cost_cents` và `if_match` (ETag từ `ci_get_budget`), và chỉ có thể thêm hoặc hạ một hạn mức. Xem [thiết lập MCP client](/vi/mcp/clients).
