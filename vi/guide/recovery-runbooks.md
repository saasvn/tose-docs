# Runbook khôi phục

Runbook khôi phục restart một project, đưa image cũ trở lại, đổi số replica hoặc khôi phục database từ một bản sao lưu. Luôn qua ba bước: **kế hoạch** chỉ-đọc về những gì đang chạy, **phê duyệt** của một người đối với đúng kế hoạch đó, rồi **thực thi idempotent** một lần. REST API, dashboard và MCP connector dùng chung một service nên các quy tắc dưới đây đúng cho tất cả.

Có bốn runbook:

| Runbook | Làm gì | Duyệt cần đăng nhập gần đây |
|---------|--------|------------------------------|
| `restart` | Rolling restart các pod đang chạy | Không |
| `rollback` | Image của một deployment cũ chạy lại | Có |
| `scale` | Đổi số replica của Deployment đang chạy | Không |
| `restore` | Áp dụng một bản sao lưu đã hoàn tất vào database được quản lý, sau khi sao lưu dữ liệu hiện tại | Có |

Xem [Scale](#scale) và [Khôi phục database](#khoi-phuc-database) cho các quy tắc riêng của chúng, và [Chưa bao gồm](#chua-bao-gom) cho những gì còn thiếu.

Các route cũ `POST .../restart` và `POST .../deployments/{id}/rollback`, cùng tool MCP `rollback_deployment` (xem [MCP connector](/vi/mcp)), vẫn hoạt động và nay chạy qua runbook. Rollback qua chúng cần cùng lần đăng nhập gần đây, và lệnh gọi bằng API key chỉ được lập kế hoạch và trả `409 APPROVAL_REQUIRED` cho đến khi một người duyệt.

## Luồng xử lý

| Bước | REST | Tool MCP | Ai thực hiện |
|------|------|----------|--------------|
| 1. Lập kế hoạch | `POST /api/workspaces/{slug}/projects/{project_slug}/runbooks/{kind}`: không cần body cho `restart`, `{"deployment_id": "..."}` cho `rollback`, `{"replicas": 3}` cho `scale`, `{"database_id": "...", "backup_id": "..."}` cho `restore` | `plan_runbook` (không có `restore`, xem [Quyền hạn](#quyen-han)) | Owner hoặc admin; API key hoặc kết nối có scope của runbook |
| 2. Phê duyệt | `POST .../runbooks/v2/plans/{plan_id}/approve` với `{"plan_hash": "..."}`, trang **Runbooks** trên dashboard, hoặc trang duyệt `/oauth/runbooks/{plan_id}` | không có | Chỉ owner hoặc admin **đang đăng nhập** |
| 3. Thực thi | `POST .../runbooks/{kind}/{plan_id}/execute` kèm header `Idempotency-Key`, hoặc **Run now** trên dashboard | `execute_runbook` với `idempotency_key` | Credential đã lập kế hoạch, hoặc owner/admin đang đăng nhập |
| Đọc | `GET .../runbooks/v2/plans` và `GET .../runbooks/v2/plans/{plan_id}` | `get_runbook` | Ai có quyền đọc deployment |

`POST .../runbooks/v2/plans/{plan_id}/reject` đóng kế hoạch đang chờ, hoặc rút lại phê duyệt chưa chạy. Kế hoạch bị từ chối sẽ không bao giờ chạy. Các route cũ `.../runbooks`, `.../runbooks/{plan_id}`, `.../approve` và `.../reject` vẫn trả lời nhưng chỉ cho restart và rollback; hãy dùng các route `v2/plans` để liệt kê, đọc, duyệt hoặc từ chối cả bốn loại.

Trên dashboard, mở trang **Runbooks** của project. Trang có một biểu mẫu cho mỗi loại, liệt kê các kế hoạch, hiển thị kế hoạch đã chọn cùng hiệu ứng, ảnh hưởng tới dữ liệu, cảnh báo và lần thực thi, và có các nút **Approve this plan**, **Reject** và **Run now**. Kế hoạch đang chạy tự làm mới mỗi năm giây.

### 1. Lập kế hoạch

Bước này đọc Deployment đang chạy và các disk claim của project, rồi lưu một kế hoạch bất biến. Không có gì trong cluster thay đổi. Kế hoạch gồm:

- đích tác động: namespace, Deployment, image hiện tại, số replica mong muốn và bản ghi deployment đang chạy;
- mọi disk claim đang mount trong pod, kèm dung lượng và điểm mount;
- bằng chứng sức khỏe: số replica desired, ready, updated, available và rollout gần nhất đã xong chưa;
- với scale: thay đổi số replica, giới hạn replica của gói, chi phí compute ước tính mỗi giờ trước và sau, và số dư ví cùng số giờ ví đủ trả ở quy mô mới;
- với restore: database, và bản sao lưu gồm tệp, dung lượng, SHA-256 và thời điểm, cùng cảnh báo của engine;
- hiệu ứng dự kiến, ảnh hưởng tới dữ liệu, đường quay lui, cách xác minh kết quả, runbook có mang tính phá hủy hay không và các cảnh báo.

Phản hồi có `plan_hash`, mã SHA-256 của kế hoạch. Hãy cho người sẽ phê duyệt xem kế hoạch.

### 2. Phê duyệt

Phê duyệt cần owner hoặc admin của workspace đang đăng nhập. API key và ứng dụng đã kết nối luôn bị từ chối với `403` bất kể scope, và không có tool MCP nào phê duyệt, nên agent không thể tự duyệt kế hoạch mà nó đang chờ. Người duyệt gửi `plan_hash` của kế hoạch, chứng minh họ đã xem đúng kế hoạch đã lưu. Duyệt lại một kế hoạch đã duyệt trả về nguyên trạng.

Rollback và restore mang tính phá hủy nên phê duyệt còn cần đăng nhập gần đây: xem [Đăng nhập lại để duyệt rollback hoặc restore](#dang-nhap-lai).

Qua MCP, `plan_runbook` trả về `approval_url`. Hãy mở nó trong trình duyệt bạn đã đăng nhập. Mọi owner hoặc admin đang đăng nhập của workspace đều có thể duyệt tại đó, không chỉ người đã kết nối agent.

### 3. Thực thi {#thuc-thi}

Gửi `Idempotency-Key` duy nhất (8 đến 128 ký tự trong `A-Za-z0-9._:-`) và dùng lại đúng khóa đó ở mọi lần thử lại. Thử lại với cùng khóa trả về lần chạy đầu, với header `Idempotent-Replayed: true` qua REST và `replayed` trong body, và không hành động lần nữa, kể cả sau sự cố giữa chừng. Khóa khác cho kế hoạch đã chạy bị từ chối với `PLAN_ALREADY_EXECUTED`; khóa đã dùng cho kế hoạch khác bị từ chối với `IDEMPOTENCY_KEY_REUSED`.

Lệnh trả `200` cho mọi lần chạy đã ghi nhận. Hãy đọc `execution.status`:

| `execution.status` | Ý nghĩa |
|--------------------|---------|
| `completed` | TOSE đã quan sát thấy trạng thái đã lập kế hoạch trong cluster. Với restore database, nghĩa là PostgreSQL và pgvector đã được xác minh qua Service, còn với MySQL và MongoDB là lệnh restore đã chạy xong không lỗi; xem [Khôi phục database](#khoi-phuc-database). |
| `pending_verification` | Thay đổi đã áp dụng nhưng cluster chưa đạt trạng thái dự kiến. Xem [Đang chờ xác minh](#dang-cho-xac-minh). |
| `started` | Thay đổi đã được yêu cầu, chưa quan sát được kết quả. Restore database ở trạng thái này trong lúc worker chạy. |
| `failed` | Xem `execution.detail` để biết lý do. Ví dụ `WORKLOAD_UPDATE_REFUSED` nghĩa là Kubernetes từ chối cập nhật. Kế hoạch đã dùng hết: hãy lập kế hoạch mới. Thử lại với cùng khóa trả về cùng lần chạy thất bại, còn khóa khác nhận `PLAN_ALREADY_EXECUTED`. |

Với rollback, kế hoạch dùng hết ngay khi chạy. Với restore, lần chạy còn ghi `execution.pre_restore_backup_id`. Xem [Đọc trạng thái thực thi](#doc-trang-thai) để biết cần làm gì ở từng trạng thái.

`status` của chính kế hoạch chỉ tiến lên: `pending` sang `approved` hoặc `rejected`, và `approved` sang `executed` hoặc `rejected`.

## Kế hoạch hết hạn hoặc lỗi thời {#ke-hoach-het-han-hoac-loi-thoi}

- **Hết hạn.** Kế hoạch sống 30 phút. Nếu chưa được duyệt và chạy trước `expires_at`, duyệt hoặc thực thi trả về `PLAN_EXPIRED`. Không có gì thay đổi. Hãy lập kế hoạch mới.
- **Lỗi thời.** Khi thực thi, TOSE so sánh đích đang chạy với kế hoạch: danh tính và generation của Deployment, image, số replica mong muốn, bản ghi deployment đang chạy, các disk claim và điểm mount (với restore: database và bản sao lưu, tức trạng thái, tệp, dung lượng và checksum). Nếu bất kỳ thứ nào đổi từ lúc lập kế hoạch, ví dụ có một lần deploy xen vào khi kế hoạch đang chờ, lần chạy bị từ chối với `PLAN_STALE` và không có gì thay đổi. Hãy lập kế hoạch mới và duyệt lại. Sức khỏe replica có thể thay đổi trong lúc chờ mà không làm kế hoạch lỗi thời.
- **Sai hash.** Duyệt với `plan_hash` không khớp kế hoạch đã lưu trả về `PLAN_HASH_MISMATCH`. Hãy tải lại kế hoạch và xem lại.
- **Kế hoạch đã đóng.** Kế hoạch đã bị từ chối hoặc đã chạy trả về `PLAN_REJECTED` hoặc `PLAN_CLOSED`. Kế hoạch chưa được duyệt trả về `APPROVAL_REQUIRED` qua REST và `APPROVAL_PENDING` qua MCP, kèm URL phê duyệt trong thông báo.

## Đăng nhập lại để duyệt rollback hoặc restore {#dang-nhap-lai}

Duyệt rollback hoặc restore cần đăng nhập trong vòng 15 phút gần nhất. Phiên đăng nhập cũ hơn, đã bị thu hồi hoặc đã hết hạn bị từ chối với `403 REAUTHENTICATION_REQUIRED`. Làm mới access token vẫn giữ thời điểm đăng nhập ban đầu của phiên, nên chỉ một lần đăng nhập mới mới qua được. Duyệt restart và scale không cần điều này.

Chế độ xem kế hoạch có `step_up_required`. Khi đó dashboard hiện liên kết **Sign in again** quay về kế hoạch, và trang `/oauth/runbooks/{plan_id}` ẩn nút duyệt sau cùng liên kết đó. Điều này ngăn agent giữ một phiên cũ tự duyệt kế hoạch phá hủy. Nó không ngăn được agent có thể hoàn tất đăng nhập, nên đừng đăng nhập TOSE trong trình duyệt do agent điều khiển.

## Không đủ số dư khi rollback

Rollback cần ví còn tiền. Khi số dư workspace bằng 0 hoặc âm, lập kế hoạch rollback trả về `402 INSUFFICIENT_BALANCE`, nên bạn không bao giờ phải duyệt một kế hoạch không thể chạy; thực thi một rollback đã duyệt cũng bị từ chối tương tự. Hãy nạp tiền ở trang thanh toán trên dashboard rồi lập kế hoạch lại. Restart không bị kiểm tra theo số dư ví; scale up có kiểm tra riêng, xem [Scale](#scale). Xem [Khi số dư bằng 0](/vi/guide/pricing#when-the-balance-is-zero).

## Scale

Kế hoạch scale chỉ đổi số replica của Deployment đang chạy.

- **Giới hạn.** Từ 1 đến 10 replica. Scale về 0 không phải scale: hãy dừng project. Yêu cầu đúng số replica đang có bị từ chối với `NO_CHANGE`, còn project không chạy bị từ chối với `NOT_RUNNING`.
- **Disk bền vững giới hạn project ở một replica.** Một disk chỉ gắn vào một pod, nên project có disk bền vững chạy đúng một replica và kế hoạch xin nhiều hơn bị từ chối với `REPLICA_LIMIT`. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks).
- **Scale up là trả trước.** Lập kế hoạch và chạy scale up cần ví đủ trả ít nhất một giờ ở quy mô mới, nếu không sẽ nhận `402 INSUFFICIENT_BALANCE`. Kế hoạch hiển thị chi phí compute mỗi giờ trước và sau, và ví đủ trả bao nhiêu giờ. Compute vẫn là trả trước: khi ví hết tiền, project bị dừng, nên hãy nạp tiền trước khi scale up. Scale down không cần số dư. Xem [Khi số dư bằng 0](/vi/guide/pricing#when-the-balance-is-zero).
- **Không pod nào bị thay.** Chỉ `spec.replicas` đổi, pod template không đụng tới nên các pod đang chạy vẫn chạy. TOSE ghi ID kế hoạch vào annotation `tose.sh/runbook-scale` của Deployment và chỉ báo `completed` sau khi thấy annotation đó và đúng số replica, mọi replica ready và available, cùng các disk như cũ. Số replica đã lưu của project, mà billing đọc và lần deploy kế tiếp dùng, được cập nhật khi thay đổi được áp dụng.

Lập kế hoạch scale up và scale down theo cùng một cách:

```bash
curl -X POST "$TOSE_API_URL/api/workspaces/$WORKSPACE/projects/$PROJECT/runbooks/scale" \
  -H "Authorization: Bearer $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"replicas": 3}'
```

Phản hồi là `201` kèm kế hoạch, `plan_hash` và chi phí. Sau khi một người duyệt, chạy bằng `POST .../runbooks/scale/{plan_id}/execute` kèm `Idempotency-Key`.

## Khôi phục database {#khoi-phuc-database}

Kế hoạch restore áp dụng một bản sao lưu đã hoàn tất vào database được quản lý. Nó mang tính phá hủy nên một người duyệt với lần đăng nhập gần đây, và khi chạy nó không bao giờ ghi đè database trước khi dữ liệu hiện tại được lưu lại.

```bash
curl -X POST "$TOSE_API_URL/api/workspaces/$WORKSPACE/projects/$PROJECT/runbooks/restore" \
  -H "Authorization: Bearer $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"database_id": "<database_id>", "backup_id": "<backup_id>"}'
```

Lấy `backup_id` từ `GET /api/workspaces/{slug}/databases/{db_id}/backups`; đó phải là bản sao lưu đã hoàn tất của đúng database này.

### Sao lưu dữ liệu hiện tại trước

Thực thi restore trước hết tạo một bản sao lưu mới của dữ liệu hiện tại (dump, mã hóa, tải lên, lưu một bản ghi sao lưu `completed`). Chỉ sau đó bản sao lưu được chọn mới được áp dụng. Lần chạy ghi bản sao lưu đó là `execution.pre_restore_backup_id` và nó nằm trong danh sách sao lưu của database, nên bạn có thể khôi phục nó theo cách tương tự để hoàn tác restore. Nếu không tạo và lưu được bản sao lưu, lần chạy thất bại với `PRE_RESTORE_BACKUP_FAILED` và database không thay đổi.

### Các lý do bị từ chối

| Mã | Khi nào |
|----|---------|
| `BACKUPS_UNAVAILABLE` (503) | Chưa cấu hình lưu trữ sao lưu. |
| `DATABASE_NOT_ACTIVE` | Database không ở trạng thái active. |
| `UNSUPPORTED` | Engine không có lệnh restore. Hỗ trợ PostgreSQL, pgvector, MySQL và MongoDB; Redis thì không. |
| `BACKUP_NOT_READY`, `NOT_FOUND` | Bản sao lưu chưa hoàn tất, hoặc không phải của database đó. |
| `RESTORE_IN_PROGRESS` | Một restore khác của cùng database đang chạy. Khóa database từ chối restore thứ hai. |

### Các lý do một lần restore thất bại

Lệnh thực thi trả `200` với `execution.status: started` và công việc tiếp tục ở nền, nên các lý do này hiện ra là lần chạy `failed` với mã trong `execution.detail`, không phải lỗi HTTP:

- `PRE_RESTORE_BACKUP_FAILED`: không lưu được bản sao lưu dữ liệu hiện tại. Database không đổi.
- `CHECKSUM_MISMATCH`: bản sao lưu không khớp SHA-256 đã ghi. Được kiểm tra khi đọc bản sao lưu trong lúc chạy, và bản sao lưu không được áp dụng.
- `RESTORE_FAILED`: việc áp dụng bản sao lưu chưa xong. Với MySQL và MongoDB, database có thể được khôi phục dở dang; bản sao lưu trước restore là đường quay lui.

### PostgreSQL và pgvector

TOSE replay dump trong một pod cô lập, rồi chuyển database sang kết quả đó.

1. **Replay cô lập.** Dump gốc được replay và kiểm tra trong một pod riêng dùng digest image của database đang chạy. Volume tạm của pod không kết nối với database đang chạy hay storage của nó.
2. **Dung lượng tạm và chỗ trống.** Volume đang chạy phải còn chỗ cho một data directory thứ hai, và còn dư cho các lần ghi bình thường. Storage không đáp ứng được, hoặc cluster không có cách ly mạng, khiến bước chuẩn bị thất bại trước khi chuyển.
3. **Lỗi trước khi chuyển là vô hại.** Lỗi replay hoặc chuyển dữ liệu để database ban đầu tiếp tục chạy từ thư mục hiện có.
4. **Khởi động lại khi chuyển.** Bước chuyển khởi động lại database trên thư mục đã chuẩn bị. Service và volume hiện có được giữ nguyên nên thông tin kết nối không đổi, và cần dự kiến một khoảng gián đoạn ngắn khi nó khởi động lại.
5. **Thư mục gốc được giữ lại.** Data directory trước đó được giữ lại sau khi chuyển.

Hãy tạm dừng ghi trước khi bắt đầu. Dữ liệu ghi sau bản sao lưu đã chọn không nằm trong trạng thái được khôi phục.

Lệnh thực thi trả `started` trong khi worker chuẩn bị restore. Nếu TOSE khởi động lại, một worker tiếp tục đúng restore đó từ trạng thái đã ghi, nên gián đoạn không làm nó chạy lại hay mất. Mỗi lần thử của worker bị giới hạn 30 phút. Lần chạy thành `completed` sau khi TOSE xác thực qua Service hiện có và xác minh data directory. Nếu kết quả bước chuyển chưa chắc chắn, nó ở `pending_verification`, và xác minh tiếp tục từ trạng thái đã ghi thay vì replay lại restore.

### MySQL và MongoDB

Các engine này tự áp dụng dump, không dùng replay cô lập và bước chuyển như PostgreSQL. Lần chạy thành `completed` khi lệnh restore chạy xong không lỗi; TOSE không kiểm tra thêm dữ liệu.

- **MySQL.** Dump xóa và tạo lại mọi bảng có trong nó, thay thế các dòng ghi từ sau bản sao lưu.
- **MongoDB.** `mongorestore` bỏ qua các document có `_id` đã tồn tại, nên document đã đổi từ sau bản sao lưu không bị ghi đè bởi bản cũ hơn.
- **Dữ liệu dở dang.** Lỗi trong lúc áp dụng có thể để lại dữ liệu dở dang. Bản sao lưu trước restore nêu trong lần chạy là đường quay lui.
- **Bị gián đoạn.** Lần chạy bị gián đoạn mà chưa có kết quả sẽ thành `pending_verification` sau 45 phút và cần kế hoạch mới để thử lại.

Route trực tiếp cũ `POST /api/workspaces/{slug}/databases/{db_id}/backups/{backup_id}/restore` vẫn khởi động restore bất đồng bộ. Nó cũng lưu một bản sao lưu trước và dùng chung khóa database với runbook. Hãy dùng runbook restore để có phê duyệt và kết quả được theo dõi.

## Dữ liệu của bạn được giữ nguyên

Restart, rollback và scale cập nhật Deployment hiện có tại chỗ. Rollback chỉ đổi image, giữ nguyên các điểm mount disk và số replica đang chạy. Scale chỉ đổi số replica. Runbook không bao giờ tạo, thay hay xóa disk, và restore không bao giờ ghi đè database mà chưa lưu một bản sao lưu của nó. Nếu một disk mà project ghi nhận bị thiếu hoặc không khả dụng trong cluster, bước lập kế hoạch bị từ chối với `VOLUME_MISSING` thay vì khởi động project với volume trống. Sau khi chạy, xác minh sẽ thất bại nếu một disk claim đổi danh tính hoặc điểm mount. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks).

Rollback không khôi phục database: các migration đã chạy vẫn được giữ. Image cũ chạy với biến môi trường và tài nguyên hiện tại của Deployment, còn các chỉnh sửa trên dashboard chưa deploy sẽ được áp dụng ở lần deploy thường kế tiếp. Kế hoạch liệt kê các điều này trong phần cảnh báo.

## Đọc trạng thái thực thi {#doc-trang-thai}

Đọc `execution.status` từ `GET .../runbooks/v2/plans/{plan_id}` (hoặc `get_runbook`). Kết quả chỉ tiến lên, và một lần chạy không bao giờ được áp dụng hai lần.

| Trạng thái | Ý nghĩa | Cần làm |
|------------|---------|---------|
| `started` | Thay đổi đã được yêu cầu và TOSE chưa quan sát được kết quả. Restore ở trạng thái này trong lúc worker chuẩn bị và chuyển. | Poll. Đừng thực thi lại. |
| `pending_verification` | Thay đổi đã áp dụng nhưng kết quả chưa được xác nhận: cluster chưa đạt trạng thái dự kiến, dấu thực thi thiếu sau hai phút, bước chuyển PostgreSQL chưa chắc chắn, hoặc lần chạy MySQL hay MongoDB chưa có kết quả sau 45 phút. | Poll, xem bên dưới. Nếu không bao giờ ổn định, hãy lập kế hoạch mới. |
| `completed` | TOSE đã quan sát thấy trạng thái dự kiến: với restart, rollback và scale là rollout, replica ready và các disk; với restore PostgreSQL là xác thực qua Service và data directory. | Xong. Với rollback, hãy đọc biên nhận. |
| `failed` | Xem `execution.detail`, ví dụ `PRE_RESTORE_BACKUP_FAILED`, `WORKLOAD_UPDATE_REFUSED` hoặc `ROLLBACK_FAILED`. | Kế hoạch đã dùng hết. Sửa nguyên nhân rồi lập kế hoạch mới. |

Dashboard hiển thị cùng các trạng thái này là Started, Waiting for the cluster to confirm, Completed and verified và Failed.

## Đang chờ xác minh {#dang-cho-xac-minh}

`completed` chỉ được báo sau khi TOSE thấy controller đã quan sát rollout, mọi replica mong muốn đều ready và available, và các disk giữ nguyên danh tính và điểm mount. Nếu phản hồi của cluster không rõ ràng, hoặc dấu thực thi chưa thấy sau hai phút, lần chạy ở trạng thái `pending_verification`.

Hãy poll `GET .../runbooks/v2/plans/{plan_id}` (hoặc gọi `get_runbook`). Với restart, rollback và scale, mỗi lần đọc đều kiểm tra lại cluster (restore do worker của nó chốt kết quả) nên trạng thái tự chuyển sang `completed` hoặc `failed`. Đừng thực thi lại: thử lại với cùng khóa trả về cùng lần chạy và không áp dụng kế hoạch lần nữa.

## Biên nhận sau rollout đã xác minh

Khi rollback được xác minh, `execution.result_deployment_id` chỉ ra bản ghi deployment mang biên nhận rollback. Trường này được gán ngay khi rollback được áp dụng và luôn trống với restart. Cho tới khi lần chạy `completed`, bản ghi deployment nó trỏ tới vẫn ở `pending_verification`, nên chỉ đọc biên nhận khi `execution.status` là `completed`. Sau đó có thể xem deployment như mọi deployment khác, ví dụ bằng `inspect_deployment`.

## Quyền hạn {#quyen-han}

| Hành động | Policy action | Cần |
|-----------|---------------|-----|
| Lập kế hoạch hoặc chạy restart | `deployment.execute` | Owner hoặc admin; scope `deployments:execute` hoặc `deployments:write` |
| Lập kế hoạch hoặc chạy rollback | `deployment.rollback` | Owner hoặc admin; scope `deployments:rollback` (qua MCP, tool còn cần `deployments:execute` hoặc `deployments:write`) |
| Lập kế hoạch hoặc chạy scale | `deployment.execute` | Owner hoặc admin; scope `deployments:execute` hoặc `deployments:write` |
| Lập kế hoạch hoặc chạy restore | `database.delete` | Owner hoặc admin; scope `databases:write`. Hiện chưa có grant MCP nào bao gồm scope này, nên client MCP không lập được kế hoạch restore. |
| Đọc kế hoạch | `deployment.read` | Thành viên có quyền đọc deployment |
| Duyệt hoặc từ chối | `runbook.approve` | Owner hoặc admin đang đăng nhập; chỉ phiên đăng nhập |

Mọi request, kể cả bị từ chối, đều được ghi vào [audit log](/vi/api/audit). Lần thực thi được ghi trước khi chạm vào cluster, với route `runbook.<kind>.execute` và kết quả `started`.

## Mã lỗi

| HTTP | Mã | Ý nghĩa |
|------|----|---------|
| 400 | `INVALID_ARGUMENT` | Thiếu, thừa hoặc ngoài phạm vi tham số: `deployment_id` cho rollback hoặc gửi cho loại khác, `replicas` ngoài 1 đến 10, hoặc `database_id` và `backup_id` cho restore. |
| 400 | `INVALID_IDEMPOTENCY_KEY` | `Idempotency-Key` thiếu hoặc không phải 8 đến 128 ký tự trong `A-Za-z0-9._:-`. |
| 400 | `NO_IMAGE` | Đích rollback không có image đã build. |
| 402 | `INSUFFICIENT_BALANCE` | Ví hết tiền nên rollback bị từ chối; với scale up, ví không đủ trả một giờ ở quy mô mới. |
| 403 | `forbidden` | API key hoặc ứng dụng đã kết nối cố duyệt hoặc từ chối. |
| 403 | `REAUTHENTICATION_REQUIRED` | Duyệt rollback hoặc restore cần đăng nhập trong vòng 15 phút gần nhất. |
| 403 | `insufficient_scope` | Credential thiếu scope; body nêu `required_scope`. |
| 403 | `FORBIDDEN` | Thành viên không phải owner hoặc admin, hoặc credential khác với credential đã lập kế hoạch cố chạy nó. |
| 404 | `NOT_FOUND` | Không có project, deployment hoặc kế hoạch này. |
| 409 | `NO_WORKLOAD`, `NOT_RUNNING` | Project chưa có workload đang chạy, hoặc đã scale về 0. Hãy deploy hoặc khởi động trước. |
| 409 | `DEPLOY_IN_PROGRESS` | Một deployment vẫn đang chạy. Hãy chờ nó xong. |
| 409 | `ALREADY_LIVE` | Image của đích rollback đang chạy sẵn. |
| 409 | `VOLUME_MISSING` | Một disk claim đã ghi nhận bị thiếu hoặc không khả dụng. |
| 409 | `NO_CHANGE` | Scale yêu cầu đúng số replica project đang có. |
| 409 | `REPLICA_LIMIT` | Project có disk bền vững chỉ chạy một replica; scale xin nhiều hơn. |
| 409 | `DATABASE_NOT_ACTIVE`, `BACKUP_NOT_READY`, `UNSUPPORTED`, `RESTORE_IN_PROGRESS` | Xem [Khôi phục database](#khoi-phuc-database). |
| 409 | `PLAN_HASH_MISMATCH`, `PLAN_EXPIRED`, `PLAN_CLOSED`, `PLAN_REJECTED`, `APPROVAL_REQUIRED`, `PLAN_STALE` | Xem [Kế hoạch hết hạn hoặc lỗi thời](#ke-hoach-het-han-hoac-loi-thoi). |
| 409 | `PLAN_ALREADY_EXECUTED`, `IDEMPOTENCY_KEY_REUSED` | Xem [Thực thi](#thuc-thi). |
| 409 | `CONFLICT` | Một thao tác khác đang giữ project. Hãy thử lại sau ít phút. |
| 503 | `UNAVAILABLE` | Không kết nối được cluster hoặc khóa. Không có gì thay đổi. |
| 503 | `BACKUPS_UNAVAILABLE` | Chưa cấu hình lưu trữ sao lưu nên không lập được kế hoạch restore. |

## Chưa bao gồm {#chua-bao-gom}

- CLI `tose runbook` hiện chỉ hỗ trợ restart và rollback; scale và restore từ CLI được theo dõi tại [tose-cli#78](https://github.com/saasvn/tose-cli/issues/78). Hãy dùng REST API hoặc dashboard cho hai loại này.
- Restore qua MCP chưa có, vì chưa grant MCP nào ánh xạ tới `databases:write`. Hãy lập kế hoạch qua REST hoặc trên dashboard.
- Trang duyệt chỉ chứng minh một trình duyệt đã đăng nhập bằng owner hoặc admin đã gửi biểu mẫu, chưa chứng minh đó là một người thật. Đăng nhập gần đây thu hẹp rủi ro này cho rollback và restore nhưng không loại bỏ nó. Đừng đăng nhập TOSE trong trình duyệt do agent điều khiển.
- Scale, restore, kiểm tra generation của restart và so sánh disk claim mới được kiểm thử với bản giả lập. Việc xác minh trên cluster và database production thật được theo dõi riêng. Hãy coi `execution.status` quan sát được là nguồn đúng, không phải kế hoạch.
- Route restore database trực tiếp cũ vẫn tồn tại bên cạnh runbook restore.
