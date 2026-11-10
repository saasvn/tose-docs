# Trigger CI, dispatch và duyệt fork

Hướng dẫn này nói về cách một lần chạy TOSE CI bắt đầu và đi qua scheduler: `workflow_dispatch` có kiểu dữ liệu, vòng đời run và lịch sử sự kiện, giới hạn đồng thời theo nhánh, và việc người dùng phải duyệt các pull request từ fork không đáng tin. Tài liệu tham chiếu đầy đủ là [`docs/ci.md`](https://github.com/saasvn/tose-app/blob/master/docs/ci.md) trong tose-app.

::: tip API workspace
Các route workspace nằm dưới `/api/workspaces/{slug}/ci`. Đường dẫn bên dưới là tương đối so với tiền tố đó. Chúng nhận session đăng nhập hoặc API key, trừ khi có ghi khác. Ứng dụng kết nối dùng các công cụ MCP.
:::

## Điều gì bắt đầu một run

- `push` lên một nhánh, và `pull_request` với action `opened`, `synchronize` hoặc `reopened`.
- `workflow_dispatch`, khi `.tose/ci.yml` khai báo (xem bên dưới).
- `manual`, chạy lại một commit mà pipeline đã ghi nhận.

Xóa nhánh và push tag không bắt đầu gì. Mỗi delivery của GitHub chỉ được ghi một lần, nên gửi lại là an toàn.

## `workflow_dispatch` có kiểu dữ liệu

Khai báo input có kiểu trong `.tose/ci.yml`:

```yaml
version: 1
on:
  push:
    branches: [master]
  workflow_dispatch:
    inputs:
      target: {type: choice, options: [staging, production], default: staging}
      dry_run: {type: boolean, default: true}
```

- Mỗi input có `type` (`string` là mặc định, `boolean`, `number` hoặc `choice` kèm `options`) và tùy chọn `required`, `default`, `description`.
- Tối đa 10 input. Tên dùng chữ thường, chữ số và `_`. Một chuỗi tối đa 1024 byte.
- Mỗi giá trị tới job chỉ qua biến môi trường `TOSE_INPUT_<NAME>`, không bao giờ nằm trong chương trình shell, nên giá trị không thể chèn lệnh.
- Job có thể chọn sự kiện này bằng `when: {events: [workflow_dispatch]}`. `TOSE_CI_EVENT` là `workflow_dispatch`.

Bắt đầu run bằng API:

```http
POST /pipelines/{pipeline_id}/dispatch
```

```json
{
  "ref": "main",
  "inputs": {"target": "staging", "dry_run": true},
  "head_sha": "tùy chọn, một push đã ghi nhận của nhánh",
  "idempotency_key": "tùy chọn"
}
```

`ref` là bắt buộc và cần scope `ci:execute`. Run dùng push mới nhất của nhánh mà TOSE đã ghi nhận từ GitHub (hoặc `head_sha` đã ghi nhận được chỉ định), nên người gọi API không bao giờ đưa code mới vào.

- Yêu cầu được kiểm tra với cấu hình đã lưu cho commit đó. Input chưa khai báo, thiếu input bắt buộc hoặc sai kiểu sẽ trả `400` và nêu `inputs.<name>`. Giá trị mặc định được áp dụng và giá trị đã xử lý hiển thị trong tóm tắt run.
- Commit có cấu hình chưa được đọc, không hợp lệ hoặc không khai báo `on.workflow_dispatch` trả `422 dispatch_not_available`.
- Cùng `idempotency_key` (trong body hoặc header `Idempotency-Key`) từ cùng người dùng trả lại run đầu tiên với `200` và `Idempotent-Replay: true`. Dùng lại key cho input, nhánh hoặc commit khác trả `409 idempotency_conflict`.
- Một workspace có tối đa 10 run manual và dispatch chưa kết thúc cùng lúc (`429`, `Retry-After: 60`).
- `402 INSUFFICIENT_BALANCE` và `402 CI_BUDGET_CAP_REACHED` áp dụng như run manual.

Ứng dụng kết nối dùng tool MCP `ci_dispatch` (scope `ci:execute`). Đây là cùng thao tác, nhận `ref`, `head_sha` (tùy chọn), `inputs` và `idempotency_key`. Giá trị input có thể là chuỗi, boolean hoặc số. Tool báo `INVALID_ARGUMENT`, `DISPATCH_NOT_AVAILABLE` và `IDEMPOTENCY_CONFLICT` cho các trường hợp ở trên. `ci_run` chỉ bắt đầu run manual và không nhận `ref` hay `inputs`.

Dashboard chưa bắt đầu được run `workflow_dispatch`. Hãy dùng API hoặc `ci_dispatch`.

Chạy lại một run `workflow_dispatch` giữ nguyên sự kiện và input. Chạy lại là thao tác của operator (`POST /admin/api/ci/runs/:id/rerun`); chạy lại run fork cần được duyệt lại.

## Trạng thái scheduler và lịch sử sự kiện

Đọc trạng thái chính xác bằng các trường bổ sung. Các trường `status`, `event` và `category` hiện có trong phản hồi REST và MCP không đổi, nên client cũ vẫn hoạt động.

| Dùng trường | Khi cần phân biệt |
|-------------|-------------------|
| `scheduler_status` | `preparing`, `blocked`, `timed_out` và `diagnosis` |
| `trigger_event` | run `workflow_dispatch` |
| `scheduler_category` | `awaiting_approval` cho run fork đang chờ duyệt |

Trạng thái run: `queued`, `blocked` (run fork chờ duyệt), `preparing` (đã giao cho cluster, container chưa chạy), `running`, `diagnosis` (mọi job đã kết thúc nhưng kết quả một job chưa rõ và chờ người xem xét), và các trạng thái cuối `succeeded`, `failed`, `timed_out`, `cancelled`, `skipped`, `error`. Trạng thái nào client chưa biết thì coi như chưa kết thúc.

Mọi thay đổi trạng thái của run hoặc job, cùng mọi lần duyệt và đổi policy (kèm người thực hiện), được ghi vào nhật ký sự kiện chỉ thêm, không sửa. Đọc bằng:

```http
GET /runs/{run_id}/events?after=&limit=
```

Scope là `ci:read`, sự kiện từ cũ đến mới, `limit` tối đa 500 và `after` tiếp tục từ trang trước.

Mỗi job cũng báo thời gian theo mili giây (`timings`): `queue`, `setup`, `execution` (phần được tính phí) và `cleanup`. Giai đoạn chưa xảy ra hoặc chưa kết thúc là `null`.

## Đồng thời theo nhánh và commit mới hơn

Commit mới hơn thay thế các run cũ, giống `concurrency: cancel-in-progress` của GitHub Actions:

- Run `pull_request` hủy mọi run chưa kết thúc của cùng pull request.
- Run `push` chỉ hủy các run cùng nhánh chưa giao job nào cho cluster, nên push đang chạy sẽ chạy xong.
- Run cùng commit, run `manual` và `workflow_dispatch`, và pull request fork bị policy bỏ qua không thay thế và không bị thay thế.
- Run bị hủy ghi "superseded by `<short sha>`". Đóng pull request không hủy run của nó.

Pipeline cũng có thể giới hạn số run và job chạy cùng lúc. Đọc policy bằng `GET /pipelines/{pipeline_id}/policy` (`ci:read`):

```json
{
  "fork_pull_requests": "require_approval",
  "max_concurrent_runs": 3,
  "max_concurrent_jobs": 4,
  "branches": [{"pattern": "main", "max_concurrent_runs": 1}]
}
```

- `max_concurrent_runs: 1` biến phạm vi thành mutex, nên hai lần deploy `main` không bao giờ chồng nhau. Run bắt đầu theo thứ tự được ghi nhận, run sau không vượt run trước đang chờ.
- `branches` có tối đa 20 mẫu glob. Mọi rule khớp đều phải còn chỗ. `0` nghĩa là không giới hạn.
- Policy được đặt trên server, không bao giờ bởi `.tose/ci.yml`. Thay đổi áp dụng cho các run chưa bắt đầu.

Đổi policy (`PUT /pipelines/{pipeline_id}/policy`) cần owner hoặc admin đăng nhập bằng session. API key và ứng dụng kết nối nhận `403`.

## Pull request từ fork cần người duyệt

Pull request từ fork là code không đáng tin. Policy `fork_pull_requests` phía server quyết định:

| Policy | Kết quả |
|--------|---------|
| `disabled` (mặc định) | Run bị `skipped`. Check `tose-ci` trung tính giải thích lý do, nhưng chỉ khi cấu hình ở nhánh đích chạy CI cho pull request đó. |
| `require_approval` | Run bị `blocked` với check `tose-ci` "Waiting for approval", nhưng chỉ khi cấu hình ở nhánh đích chạy CI cho pull request đó. |

Liệt kê các run đang chờ duyệt bằng `GET /approvals?limit=` (`ci:read`). Route trả các run của pull request từ fork đang `blocked` với `approval_state` là `pending`, cũ nhất trước, kèm `repo_full_name`, `pr_number` và `base_ref`.

Duyệt hoặc từ chối run đang bị chặn:

```http
POST /runs/{run_id}/approve
POST /runs/{run_id}/reject
```

```json
{"note": "tùy chọn, cho reject"}
```

- **Chỉ thành viên workspace đăng nhập bằng session của một người mới duyệt được.** API key hoặc ứng dụng kết nối luôn bị từ chối với `403`, bất kể scope, nên một agent không bao giờ tự duyệt code mà nó đang chờ. Run không ở trạng thái chờ trả `409 not_blocked`.
- Run được duyệt được lên kế hoạch từ cấu hình của **commit nền (base)**. `.tose/ci.yml` của fork không bao giờ được đọc, nên fork không thể mở rộng egress hay thay đổi job và bước nào được chạy.
- **Job fork đã duyệt không nhận secret nào.** Không có checkout token (commit được tải ẩn danh nên chỉ repository công khai hoạt động), không có URL upload artifact và cache (cache vẫn có thể được khôi phục), và runtime của job từ chối mọi secret.
- Run bị từ chối kết thúc `cancelled` mà không chạy gì.
- Mỗi run cần được duyệt riêng, kể cả chạy lại và mỗi commit mới của pull request. Commit mới thay thế run đang chờ.
- Tắt policy sẽ bỏ qua run fork trước khi job đầu tiên bắt đầu, kể cả run đã duyệt.

::: tip Dashboard
Owner và admin chỉnh policy ở mục **Chính sách** trên trang pipeline; thành viên chỉ xem. Các run fork đang chờ được liệt kê ở tab **Phê duyệt** (`/w/{slug}/ci/approvals`), nơi mọi thành viên có thể duyệt hoặc từ chối.
:::

## Audit và quyền truy cập

- Mọi `POST`, được phép hay bị từ chối, đều được ghi vào nhật ký audit của workspace (`ci.execute`).
- API key gắn với runtime không dùng được các route CI.
- Pipeline được tạo và thay đổi bởi operator, không qua API workspace.
