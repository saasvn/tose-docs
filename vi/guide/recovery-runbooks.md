# Runbook khôi phục

Runbook khôi phục restart một project hoặc đưa image cũ trở lại qua ba bước: **kế hoạch** chỉ-đọc về những gì đang chạy, **phê duyệt** của một người đối với đúng kế hoạch đó, rồi **thực thi idempotent** một lần. REST API và MCP connector dùng chung một service nên các quy tắc dưới đây đúng cho cả hai.

Hiện có hai runbook: `restart` (rolling restart các pod đang chạy) và `rollback` (image của một deployment cũ chạy lại). Scale và restore chưa có; xem [Chưa bao gồm](#chua-bao-gom).

Các route cũ `POST .../restart` và `POST .../deployments/{id}/rollback`, cùng tool MCP `rollback_deployment` (xem [MCP connector](/vi/mcp)), vẫn hoạt động và không đi qua runbook.

## Luồng xử lý

| Bước | REST | Tool MCP | Ai thực hiện |
|------|------|----------|--------------|
| 1. Lập kế hoạch | `POST /api/workspaces/{slug}/projects/{project_slug}/runbooks/restart`, hoặc `.../runbooks/rollback` với `{"deployment_id": "..."}` | `plan_runbook` | Owner hoặc admin; API key hoặc kết nối có scope deployment |
| 2. Phê duyệt | `POST .../runbooks/{plan_id}/approve` với `{"plan_hash": "..."}`, hoặc trang duyệt `/oauth/runbooks/{plan_id}` | không có | Chỉ owner hoặc admin **đang đăng nhập** |
| 3. Thực thi | `POST .../runbooks/restart/{plan_id}/execute` hoặc `.../rollback/{plan_id}/execute`, kèm header `Idempotency-Key` | `execute_runbook` với `idempotency_key` | Credential đã lập kế hoạch, hoặc owner/admin đang đăng nhập |
| Đọc | `GET .../runbooks` và `GET .../runbooks/{plan_id}` | `get_runbook` | Ai có quyền đọc deployment |

`POST .../runbooks/{plan_id}/reject` đóng kế hoạch đang chờ, hoặc rút lại phê duyệt chưa chạy. Kế hoạch bị từ chối sẽ không bao giờ chạy.

### 1. Lập kế hoạch

Bước này đọc Deployment đang chạy và các disk claim của project, rồi lưu một kế hoạch bất biến. Không có gì trong cluster thay đổi. Kế hoạch gồm:

- đích tác động: namespace, Deployment, image hiện tại, số replica mong muốn và bản ghi deployment đang chạy;
- mọi disk claim đang mount trong pod, kèm dung lượng và điểm mount;
- bằng chứng sức khỏe: số replica desired, ready, updated, available và rollout gần nhất đã xong chưa;
- hiệu ứng dự kiến, ảnh hưởng tới dữ liệu, đường quay lui, cách xác minh kết quả và các cảnh báo.

Phản hồi có `plan_hash`, mã SHA-256 của kế hoạch. Hãy cho người sẽ phê duyệt xem kế hoạch.

### 2. Phê duyệt

Phê duyệt cần owner hoặc admin của workspace đang đăng nhập. API key và ứng dụng đã kết nối luôn bị từ chối với `403` bất kể scope, và không có tool MCP nào phê duyệt, nên agent không thể tự duyệt kế hoạch mà nó đang chờ. Người duyệt gửi `plan_hash` của kế hoạch, chứng minh họ đã xem đúng kế hoạch đã lưu. Duyệt lại một kế hoạch đã duyệt trả về nguyên trạng.

Qua MCP, `plan_runbook` trả về `approval_url`. Hãy mở nó trong trình duyệt bạn đã đăng nhập. Mọi owner hoặc admin đang đăng nhập của workspace đều có thể duyệt tại đó, không chỉ người đã kết nối agent.

### 3. Thực thi {#thuc-thi}

Gửi `Idempotency-Key` duy nhất (8 đến 128 ký tự trong `A-Za-z0-9._:-`) và dùng lại đúng khóa đó ở mọi lần thử lại. Thử lại với cùng khóa trả về lần chạy đầu, với header `Idempotent-Replayed: true` qua REST và `replayed` trong body, và không hành động lần nữa, kể cả sau sự cố giữa chừng. Khóa khác cho kế hoạch đã chạy bị từ chối với `PLAN_ALREADY_EXECUTED`; khóa đã dùng cho kế hoạch khác bị từ chối với `IDEMPOTENCY_KEY_REUSED`.

Lệnh trả `200` cho mọi lần chạy đã ghi nhận. Hãy đọc `execution.status`:

| `execution.status` | Ý nghĩa |
|--------------------|---------|
| `completed` | TOSE đã quan sát thấy trạng thái đã lập kế hoạch trong cluster. |
| `pending_verification` | Thay đổi đã áp dụng nhưng cluster chưa đạt trạng thái dự kiến. Xem [Đang chờ xác minh](#dang-cho-xac-minh). |
| `started` | Thay đổi đã được yêu cầu, chưa quan sát được kết quả. |
| `failed` | Xem `execution.detail` để biết lý do. |

`status` của chính kế hoạch chỉ đi một chiều: `pending`, rồi `approved` hoặc `rejected`, rồi `executed`.

## Kế hoạch hết hạn hoặc lỗi thời {#ke-hoach-het-han-hoac-loi-thoi}

- **Hết hạn.** Kế hoạch sống 30 phút. Nếu chưa được duyệt và chạy trước `expires_at`, duyệt hoặc thực thi trả về `PLAN_EXPIRED`. Không có gì thay đổi. Hãy lập kế hoạch mới.
- **Lỗi thời.** Khi thực thi, TOSE so sánh đích đang chạy với kế hoạch: danh tính và generation của Deployment, image, số replica mong muốn, bản ghi deployment đang chạy, các disk claim và điểm mount. Nếu bất kỳ thứ nào đổi từ lúc lập kế hoạch, ví dụ có một lần deploy xen vào khi kế hoạch đang chờ, lần chạy bị từ chối với `PLAN_STALE` và không có gì thay đổi. Hãy lập kế hoạch mới và duyệt lại. Sức khỏe replica có thể thay đổi trong lúc chờ mà không làm kế hoạch lỗi thời.
- **Sai hash.** Duyệt với `plan_hash` không khớp kế hoạch đã lưu trả về `PLAN_HASH_MISMATCH`. Hãy tải lại kế hoạch và xem lại.
- **Kế hoạch đã đóng.** Kế hoạch đã bị từ chối hoặc đã chạy trả về `PLAN_REJECTED` hoặc `PLAN_CLOSED`. Kế hoạch chưa được duyệt trả về `APPROVAL_REQUIRED`.

## Không đủ số dư khi rollback

Rollback cần ví còn tiền. Khi số dư workspace bằng 0 hoặc âm, lập kế hoạch rollback trả về `402 INSUFFICIENT_BALANCE`, nên bạn không bao giờ phải duyệt một kế hoạch không thể chạy; thực thi một rollback đã duyệt cũng bị từ chối tương tự. Hãy nạp tiền ở trang thanh toán trên dashboard rồi lập kế hoạch lại. Restart không bị kiểm tra theo số dư ví. Xem [Khi số dư bằng 0](/vi/guide/pricing).

## Dữ liệu của bạn được giữ nguyên

Cả hai runbook cập nhật Deployment hiện có tại chỗ. Rollback chỉ đổi image, giữ nguyên các điểm mount disk và số replica đang chạy. Runbook không bao giờ tạo, thay hay xóa disk. Nếu một disk mà project ghi nhận bị thiếu hoặc không khả dụng trong cluster, bước lập kế hoạch bị từ chối với `VOLUME_MISSING` thay vì khởi động project với volume trống. Sau khi chạy, xác minh sẽ thất bại nếu một disk claim đổi danh tính hoặc điểm mount. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks).

Rollback không khôi phục database: các migration đã chạy vẫn được giữ. Image cũ chạy với biến môi trường và tài nguyên hiện tại của Deployment, còn các chỉnh sửa trên dashboard chưa deploy sẽ được áp dụng ở lần deploy thường kế tiếp. Kế hoạch liệt kê các điều này trong phần cảnh báo.

## Đang chờ xác minh {#dang-cho-xac-minh}

`completed` chỉ được báo sau khi TOSE thấy controller đã quan sát rollout, mọi replica mong muốn đều ready và available, và các disk giữ nguyên danh tính và điểm mount. Nếu phản hồi của cluster không rõ ràng, hoặc dấu thực thi chưa thấy sau hai phút, lần chạy ở trạng thái `pending_verification`.

Hãy poll `GET .../runbooks/{plan_id}` (hoặc gọi `get_runbook`). Mỗi lần đọc đều kiểm tra lại cluster nên trạng thái tự chuyển sang `completed` hoặc `failed`. Đừng thực thi lại: thử lại với cùng khóa trả về cùng lần chạy và không áp dụng kế hoạch lần nữa.

## Biên nhận sau rollout đã xác minh

Khi rollback được xác minh, `execution.result_deployment_id` chỉ ra bản ghi deployment mang biên nhận rollback. Trường này trống trước khi xác minh và với restart, nên chỉ đọc biên nhận khi `execution.status` là `completed`. Sau đó có thể xem deployment như mọi deployment khác, ví dụ bằng `inspect_deployment`.

## Quyền hạn

| Hành động | Policy action | Cần |
|-----------|---------------|-----|
| Lập kế hoạch hoặc chạy restart | `deployment.execute` | Owner hoặc admin; scope `deployments:execute` hoặc `deployments:write` |
| Lập kế hoạch hoặc chạy rollback | `deployment.rollback` | Owner hoặc admin; scope `deployments:rollback` (qua MCP, tool còn cần `deployments:execute` hoặc `deployments:write`) |
| Đọc kế hoạch | `deployment.read` | Thành viên có quyền đọc deployment |
| Duyệt hoặc từ chối | `runbook.approve` | Owner hoặc admin đang đăng nhập; chỉ phiên đăng nhập |

Mọi request, kể cả bị từ chối, đều được ghi vào [audit log](/vi/api/audit). Lần thực thi được ghi trước khi chạm vào cluster, với route `runbook.<kind>.execute` và kết quả `started`.

## Mã lỗi

| HTTP | Mã | Ý nghĩa |
|------|----|---------|
| 400 | `INVALID_ARGUMENT` | Thiếu `deployment_id` cho rollback, hoặc gửi `deployment_id` cho restart. |
| 400 | `INVALID_IDEMPOTENCY_KEY` | `Idempotency-Key` thiếu hoặc không phải 8 đến 128 ký tự trong `A-Za-z0-9._:-`. |
| 400 | `NO_IMAGE` | Đích rollback không có image đã build. |
| 402 | `INSUFFICIENT_BALANCE` | Ví hết tiền; rollback bị từ chối. |
| 403 | `HUMAN_APPROVAL_REQUIRED` | API key hoặc ứng dụng đã kết nối cố duyệt hoặc từ chối. |
| 403 | `FORBIDDEN`, `INSUFFICIENT_SCOPE` | Sai vai trò, thiếu scope, hoặc credential khác với credential đã lập kế hoạch. |
| 404 | `NOT_FOUND` | Không có project, deployment hoặc kế hoạch này. |
| 409 | `NO_WORKLOAD`, `NOT_RUNNING` | Project chưa có workload đang chạy, hoặc đã scale về 0. Hãy deploy hoặc khởi động trước. |
| 409 | `DEPLOY_IN_PROGRESS` | Một deployment vẫn đang chạy. Hãy chờ nó xong. |
| 409 | `ALREADY_LIVE` | Image của đích rollback đang chạy sẵn. |
| 409 | `VOLUME_MISSING` | Một disk claim đã ghi nhận bị thiếu hoặc không khả dụng. |
| 409 | `PLAN_HASH_MISMATCH`, `PLAN_EXPIRED`, `PLAN_CLOSED`, `PLAN_REJECTED`, `APPROVAL_REQUIRED`, `PLAN_STALE` | Xem [Kế hoạch hết hạn hoặc lỗi thời](#ke-hoach-het-han-hoac-loi-thoi). |
| 409 | `PLAN_ALREADY_EXECUTED`, `IDEMPOTENCY_KEY_REUSED` | Xem [Thực thi](#thuc-thi). |
| 409 | `CONFLICT`, `WORKLOAD_UPDATE_REFUSED` | Một thao tác khác đang giữ project, hoặc Kubernetes từ chối cập nhật. Hãy thử lại. |
| 503 | `UNAVAILABLE` | Không kết nối được cluster hoặc khóa. Không có gì thay đổi. |

## Chưa bao gồm {#chua-bao-gom}

- Runbook scale và restore chưa có. Restore sau này sẽ vào claim mới hoặc workload tạm dừng, không bao giờ thay thế disk hiện có của bạn.
- Chưa có danh sách kế hoạch trên dashboard. Hãy duyệt bằng phiên đăng nhập (cookie dashboard hoặc đăng nhập CLI) hoặc tại `/oauth/runbooks/{plan_id}`.
- Trang duyệt chỉ chứng minh một trình duyệt đã đăng nhập bằng owner hoặc admin đã gửi biểu mẫu, chưa chứng minh đó là một người thật. Đừng đăng nhập TOSE trong trình duyệt do agent điều khiển.
- Việc xác minh trên cluster production thật được theo dõi riêng. Hãy coi `execution.status` quan sát được là nguồn đúng, không phải kế hoạch.
