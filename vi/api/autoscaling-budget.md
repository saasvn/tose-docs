# API ngân sách autoscaling

Đọc và thay đổi [ngân sách autoscaling](/vi/guide/autoscaling-budgets) của một workspace hoặc một project. Các route nằm dưới `/api/workspaces/{slug}` và dùng [xác thực](/vi/api/authentication) như bình thường. Chúng chỉ tồn tại khi nhà vận hành nền tảng đã bật ngân sách (`AUTOSCALING_BUDGET_ENABLED=true`, mặc định tắt); nếu không, chúng trả `404 not_found`.

## Quy ước

- **Tiền** là số nguyên **nano-USD**. `1 cent = 10,000,000`, nên `$0.05` là `50000000`. Các key JSON kết thúc bằng `_nano_usd`.
- **Thời gian** theo RFC 3339, múi giờ UTC.
- **Workspace không tồn tại, hoặc bạn không phải thành viên,** trả `404 not_found`. API key của một workspace dùng cho workspace khác trả `403 forbidden`. Project hoặc kế hoạch không tồn tại trong workspace của bạn trả `404 NOT_FOUND`.
- **Số dư ví thô** không bao giờ xuất hiện trong response. Chỉ có `reserve.funded` và `reserve.coverage_hours`.

## Quyền

| Hành động | Vai trò tối thiểu | Scope | Ghi chú |
|-----------|-------------------|-------|---------|
| `autoscaling.budget.read` | member | `projects:read` | |
| `autoscaling.budget.write` | admin | `projects:write` | Phiên đăng nhập áp dụng thay đổi ngay. API key chỉ nhận một kế hoạch. |
| `autoscaling.budget.approve` | admin | `projects:write` | Chỉ phiên đăng nhập. API key bị từ chối với `403 HUMAN_APPROVAL_REQUIRED`. |

Phiên đăng nhập là một người đã đăng nhập TOSE: cookie phiên của dashboard, hoặc token phiên mà `/api/auth/login` trả về, gửi dưới dạng `Authorization: Bearer`. Bất cứ thứ gì giữ token đó đều có thể duyệt thay người đó, nên hãy đưa cho agent một API key. Các route này không nhận token OAuth (MCP); ứng dụng đã kết nối dùng [tool MCP](/vi/mcp#tools) `autoscaling_budget_get` và `autoscaling_budget_plan`.

## Route

| Method | Đường dẫn | Hành động | Thành công |
|--------|-----------|-----------|------------|
| `GET` | `/api/workspaces/{slug}/autoscaling/budget` | read | `200` WorkspaceBudget kèm `ETag` |
| `PUT` | `/api/workspaces/{slug}/autoscaling/budget` | write | `200` WorkspaceBudget (phiên đăng nhập) hoặc `202` PendingPlan (credential) |
| `GET` | `/api/workspaces/{slug}/projects/{project_slug}/autoscaling/budget` | read | `200` ProjectBudget kèm `ETag` |
| `PUT` | `/api/workspaces/{slug}/projects/{project_slug}/autoscaling/budget` | write | `200` ProjectBudget (phiên đăng nhập) hoặc `202` PendingPlan (credential) |
| `GET` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}` | read | `200` BudgetPlan |
| `POST` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}/approve` | approve | `200` BudgetPlan, status `applied` |
| `POST` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}/reject` | approve | `200` BudgetPlan, status `rejected` |

Không có route nào liệt kê kế hoạch. Hãy đọc các kế hoạch đang chờ ở `pending_plans` của ngân sách workspace, rồi lấy từng kế hoạch theo `id`.

Mọi `PUT`, duyệt và từ chối đều từ chối request xác thực bằng cookie phiên từ một origin của trình duyệt không phải dashboard hay chính API (`403 CROSS_SITE_REQUEST`). API key và header `Authorization` không bị ảnh hưởng. Body của `PUT` phải đúng một object JSON, không có field lạ; bất kỳ dữ liệu nào phía sau là `400 INVALID_ARGUMENT`.
### Kiểm soát đồng thời lạc quan

Mỗi ngân sách có một `revision`. `GET` trả nó dưới dạng weak ETag `W/"r{revision}"`. `PUT` nhận header `If-Match` tùy chọn với giá trị đó; nếu revision đã đổi, kết quả là `412 PRECONDITION_FAILED` và không có gì thay đổi. Gửi lại cùng một `PUT` với cùng `If-Match` là an toàn: nó áp dụng thay đổi tối đa một lần. Giá trị không chỉ tới revision nào (ví dụ `W/"abc"`) không bao giờ khớp và cũng là `412`. Header rỗng hoặc `*` bỏ qua việc kiểm tra.

Với API key, `If-Match` được so sánh lúc tạo kế hoạch, dưới khóa ngân sách, nên giá trị cũ trả `412` trước khi có kế hoạch nào được lưu. Đề xuất lại cùng một thay đổi khi kế hoạch của nó đang chờ sẽ trả lại chính kế hoạch đó.

## Cấu trúc dữ liệu {#shapes}

### Caps

Mọi trường đều phải có khi `PUT`. `null` nghĩa là không có trần. Một trần nằm trong khoảng `1` đến `1000000000000000` nano-USD (1 triệu USD).

```json
{ "hourly_nano_usd": 50000000, "monthly_nano_usd": 30000000000 }
```

### Floor

Chỉ ở phạm vi project. `null` nghĩa là không có floor. `replicas` từ `1` đến `100`. `cpu` là chuỗi số thập phân của số core, từ `"0.25"` đến `"64"`, và `ram` là chuỗi số thập phân của GiB, từ `"0.5"` đến `"256"`.

```json
{ "replicas": 1, "cpu": "0.5", "ram": "1" }
```

### Approval

Người duyệt ngân sách gần nhất, hoặc `null` khi ngân sách chưa từng được đặt.

```json
{
  "approved_by": "<user id>",
  "approved_via": "session",
  "plan_id": null,
  "approved_at": "2026-11-09T10:00:00Z"
}
```

`approved_via` là `session` hoặc `plan`. `plan_id` có giá trị khi nó là `plan`.

### WorkspaceBudget

```json
{
  "scope": "workspace",
  "workspace_slug": "acme",
  "revision": 3,
  "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": 30000000000 },
  "approval": null,
  "usage": {
    "hourly_exposure_nano_usd": 40000000,
    "month_start": "2026-11-01T00:00:00Z",
    "month_to_date_nano_usd": 1230000000,
    "month_projection_nano_usd": 25000000000
  },
  "reserve": {
    "floor_hourly_nano_usd": 20000000,
    "target_nano_usd": 1440000000,
    "funded": true,
    "coverage_hours": 72
  },
  "projects": [
    {
      "project_slug": "api",
      "revision": 1,
      "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
      "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" },
      "hourly_exposure_nano_usd": 20000000
    }
  ],
  "pending_plans": [
    { "id": "plan_01", "project_slug": "api", "expires_at": "2026-11-09T10:30:00Z" }
  ]
}
```

| Trường | Ý nghĩa |
|--------|---------|
| `usage.hourly_exposure_nano_usd` | Chi phí theo giờ đã cấu hình của các project đang tính tiền hoặc đang khởi động. |
| `usage.month_to_date_nano_usd` | Compute đã tính từ đầu tháng UTC này. |
| `usage.month_projection_nano_usd` | Lũy kế tháng cộng chi phí theo giờ cho số giờ còn lại của tháng. |
| `reserve.floor_hourly_nano_usd` | Chi phí theo giờ của mọi floor project. |
| `reserve.target_nano_usd` | Chi phí theo giờ của các floor nhân 72. |
| `reserve.funded` | Ví chưa được dự phòng đủ trả mục tiêu. |
| `reserve.coverage_hours` | Số giờ floor mà ví phủ được, tối đa 72. Bằng 72 khi không có floor. |
| `projects` | Chỉ các project có ngân sách. |
| `pending_plans` | Các kế hoạch còn chờ duyệt. |

### ProjectBudget

```json
{
  "scope": "project",
  "workspace_slug": "acme",
  "project_slug": "api",
  "revision": 1,
  "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
  "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" },
  "approval": null,
  "usage": {
    "hourly_exposure_nano_usd": 20000000,
    "month_start": "2026-11-01T00:00:00Z",
    "month_to_date_nano_usd": 0,
    "month_projection_nano_usd": 0,
    "floor_hourly_nano_usd": 20000000
  }
}
```

### Body của request

`PUT` thay thế các trần (và với project là cả floor). Muốn đổi một trần, hãy gửi trần còn lại đúng như hiện tại.

```json
{ "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": null } }
```

```json
{
  "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
  "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" }
}
```

Body đầu là của workspace. Body thứ hai là của project; ở đó `floor` là bắt buộc, và `null` nghĩa là không có floor. Gửi floor ở phạm vi workspace bị từ chối với `400`.

### PendingPlan

Trả kèm `202` khi một credential, không phải phiên đăng nhập, gọi `PUT`. Lúc này chưa có gì thay đổi.

```json
{
  "status": "pending",
  "plan": { "id": "plan_01", "status": "pending", "...": "xem BudgetPlan" },
  "approval_url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
}
```

Hãy đưa `approval_url` cho một người. Không thể duyệt kế hoạch bằng API key.

### BudgetPlan

```json
{
  "id": "plan_01",
  "scope": "workspace",
  "project_slug": null,
  "status": "pending",
  "before": { "caps": { "hourly_nano_usd": null, "monthly_nano_usd": null }, "floor": null },
  "after": { "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": null }, "floor": null },
  "base_revision": 3,
  "plan_hash": "sha256:9f2c...",
  "requested_via": "api_key",
  "created_at": "2026-11-09T10:00:00Z",
  "expires_at": "2026-11-09T10:30:00Z",
  "decided_at": null
}
```

`status` là `pending`, `applied`, `rejected` hoặc `expired`. `requested_via` là `api_key` hoặc `mcp`. Kế hoạch có hiệu lực 30 phút. `before` và `after` luôn chứa `caps` và `floor`; `floor` là `null` với kế hoạch của workspace.

### Body khi duyệt và từ chối

```json
{ "plan_hash": "sha256:9f2c..." }
```

Cả `approve` và `reject` đều bắt buộc body này, với `plan_hash` của kế hoạch mà người dùng đã xem. Request phải có `Content-Type: application/json` (nếu không là `415 UNSUPPORTED_MEDIA_TYPE`) và chỉ chứa đúng một object; thiếu `plan_hash`, field lạ hoặc dữ liệu thừa phía sau là `400 INVALID_ARGUMENT`. Hash khác với kế hoạch là `409 PLAN_HASH_MISMATCH`.

Duyệt sẽ áp dụng kế hoạch ngay, với điều kiện ngân sách vẫn ở `base_revision` và `plan_hash` khớp. Floor được kiểm tra lại: nếu project đã lớn hơn kể từ khi tạo kế hoạch và chi phí floor giờ cao hơn trần theo giờ của kế hoạch, việc duyệt trả `422 INVALID_ARGUMENT`. Từ chối không thay đổi ngân sách.

## Ví dụ

```bash
curl -X PUT https://api-v2.tose.sh/api/workspaces/acme/autoscaling/budget \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H 'If-Match: W/"r3"' \
  -H 'Content-Type: application/json' \
  -d '{"caps":{"hourly_nano_usd":50000000,"monthly_nano_usd":null}}'
```

Với API key, lệnh này trả `202` và một `PendingPlan`. Với phiên đăng nhập, nó trả `200` và ngân sách mới.

## Mã lỗi

Các lỗi dùng [envelope lỗi](/vi/api/errors) chuẩn. Hãy rẽ nhánh theo `code`.

| HTTP | `code` | Khi nào | `details` |
|------|--------|---------|-----------|
| 400 | `INVALID_ARGUMENT` | JSON sai cú pháp hoặc có dữ liệu thừa phía sau, field lạ, thiếu `caps`, `plan_hash` hoặc `floor` của project, giá trị ngoài khoảng cho phép, chuỗi floor sai, hoặc có floor ở phạm vi workspace | `{field}` |
| 422 | `INVALID_ARGUMENT` | Chi phí theo giờ của floor cao hơn trần theo giờ của project, khi `PUT` hoặc khi duyệt | `{field: "floor"}` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Duyệt hoặc từ chối không có `Content-Type: application/json` | |
| 403 | [`CROSS_SITE_REQUEST`](/vi/api/errors#CROSS_SITE_REQUEST) | `PUT`, duyệt hoặc từ chối xác thực bằng cookie phiên từ origin khác | |
| 412 | [`PRECONDITION_FAILED`](/vi/api/errors#PRECONDITION_FAILED) | `If-Match` không khớp revision hiện tại (với API key, lúc tạo kế hoạch) | |
| 403 | [`forbidden`](/vi/api/errors#forbidden) | Vai trò trong workspace quá thấp, hoặc API key của một workspace được dùng cho workspace khác | |
| 403 | [`insufficient_scope`](/vi/api/errors#insufficient_scope) | API key thiếu scope; body nêu `required_scope` | |
| 403 | [`HUMAN_APPROVAL_REQUIRED`](/vi/api/errors#HUMAN_APPROVAL_REQUIRED) | Gọi duyệt hoặc từ chối bằng API key | |
| 404 | [`not_found`](/vi/api/errors#not_found) | Workspace không tồn tại hoặc bạn không phải thành viên, hoặc ngân sách chưa được bật | |
| 404 | [`NOT_FOUND`](/vi/api/errors#NOT_FOUND) | Project hoặc kế hoạch không tồn tại trong workspace này | |
| 409 | [`PLAN_STALE`](/vi/api/errors#PLAN_STALE) | Ngân sách đã đổi sau khi kế hoạch được tạo | `{base_revision, current_revision}` |
| 409 | [`PLAN_HASH_MISMATCH`](/vi/api/errors#PLAN_HASH_MISMATCH) | `plan_hash` gửi kèm khi duyệt hoặc từ chối không khớp với kế hoạch | |
| 410 | [`PLAN_EXPIRED`](/vi/api/errors#PLAN_EXPIRED) | Kế hoạch đã quá `expires_at` | |
| 409 | [`PLAN_CLOSED`](/vi/api/errors#PLAN_CLOSED) | Kế hoạch đã được áp dụng hoặc từ chối | `{status}` |
| 503 | [`unavailable`](/vi/api/errors#unavailable) | Không chạy được bước kiểm tra quyền. Có thể thử lại | |

Hai mã của lớp bảo vệ, [`BUDGET_CAP`](/vi/api/errors#BUDGET_CAP) và [`INSUFFICIENT_BALANCE`](/vi/api/errors#INSUFFICIENT_BALANCE), đến từ các endpoint làm tăng mức phân bổ (cập nhật project, deploy, redeploy, rollback, deploy image, áp dụng biến môi trường và scale bằng runbook), không phải từ các route ngân sách.

## Liên quan

- [Hướng dẫn ngân sách autoscaling](/vi/guide/autoscaling-budgets)
- [`tose autoscaling`](/vi/commands/autoscaling)
- [Mã lỗi](/vi/api/errors)
