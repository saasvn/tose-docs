# API dự án

Các endpoint để đổi, restart và xóa dự án, cùng quản lý kết nối Git. Tạo và liệt kê dự án, deploy và đọc log nằm trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) phục vụ tại `GET /api/openapi.yaml`; trang này mô tả các luồng quanh chúng.

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/projects/{project_slug}` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Mọi endpoint ở trang này cần vai trò `admin` hoặc `owner` của workspace, trừ [Xuất dự án](#export), mọi thành viên workspace đều gọi được, và [đọc biên nhận rollback](#rollback-receipts), mọi thành viên workspace đều đọc được.

## Cập nhật dự án {#update}

```http
PUT /api/workspaces/{slug}/projects/{project_slug}
```

Cập nhật một phần: chỉ gửi các trường bạn muốn đổi.

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `name` | string | Tên hiển thị. Giá trị trống bị bỏ qua |
| `slug` | string | Slug mới: 3-60 chữ thường, số và dấu gạch ngang, duy nhất trong workspace |
| `framework` | string \| null | Nhãn framework |
| `status` | string | `active`, `paused` hoặc `archived` |
| `server_id` | string | Server deploy. Phải thuộc workspace |
| `registry_id` | string | Container registry |
| `port` | integer | Cổng container. `0` trở xuống bị bỏ qua |
| `replicas` | integer | Số replica. `0` trở xuống bị bỏ qua |
| `cpu` | string | Giới hạn CPU theo core, ví dụ `0.5`. Giá trị trống bị bỏ qua |
| `ram` | string | Giới hạn bộ nhớ theo GB, ví dụ `0.5`. Giá trị trống bị bỏ qua |

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/projects/web" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"port": 8080, "cpu": "1", "ram": "1"}'
```

**Phản hồi:** `200` kèm dự án. Khi không có gì đổi, dự án giữ nguyên được trả về.

Thay đổi có hiệu lực ở lần deploy tiếp theo. Dự án có [ổ đĩa bền vững](/vi/guide/persistent-disks) phải giữ một replica và không đổi được `server_id`.

| Mã | Ý nghĩa |
|--------|---------|
| `400` | `status` không hợp lệ, slug sai định dạng, dự án có ổ đĩa bền vững mà bạn tăng `replicas` trên `1` hoặc đổi `server_id`, hoặc server không hợp lệ với workspace |
| `409` | Slug đã được dùng trong workspace |

## Giới hạn tiến trình {#process-limit}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/status
```

Phản hồi trạng thái có đối tượng `resources` chứa giới hạn CPU và bộ nhớ của dự án. Khi bên vận hành đã khai báo giới hạn tiến trình (PID) theo Pod, phản hồi còn có `resources.pids.limit`:

```json
{ "resources": { "pids": { "limit": 4096 } } }
```

- **Theo Pod, dùng chung.** Con số là một ngân sách cho cả Pod: container của dự án và mọi sidecar cùng tính vào đó. Đây không phải cài đặt theo từng container hay từng dự án.
- **Là khai báo, không phải số đo.** Giá trị do bên vận hành hệ thống TOSE cấu hình (`PROJECT_POD_PIDS_LIMIT`) sau khi đã xác nhận cấu hình trên node. TOSE không đọc lại giá trị từ node, nên có thể lỗi thời nếu node thay đổi, và giới hạn có thể khác nhau giữa các node.
- **Vắng mặt nghĩa là chưa biết.** Trường chỉ xuất hiện khi bên vận hành đã cấu hình một giá trị được xác nhận. Không có đối tượng `pids` không có nghĩa là không giới hạn; nó nghĩa là TOSE không biết giới hạn.
- **Chỉ để báo cáo.** Trường này không đặt hay thực thi giới hạn, và không có lệnh gọi API nào thay đổi nó. Việc thực thi là cấu hình kubelet ở cấp node (`podPidsLimit`), nằm ngoài API này.

## Restart dự án {#restart}

```http
POST /api/workspaces/{slug}/projects/{project_slug}/restart
```

Restart deployment đang chạy mà không build image mới. Restart là một runbook khôi phục (`restart`): TOSE lập kế hoạch, ghi nhận phê duyệt rồi chạy. Người gọi phải là owner hoặc admin của workspace; API key còn cần scope `deployments:execute`.

**Đã đăng nhập (phiên dashboard).** Lệnh gọi của bạn chính là sự phê duyệt, nên TOSE lập kế hoạch, phê duyệt và chạy restart ngay, rồi trả `200`:

```json
{ "success": true, "message": "Project restarting", "restarted_pods": 1, "runbook": { "id": "...", "status": "executed", "execution": { "status": "started" } } }
```

`restarted_pods` là số replica theo kế hoạch. `runbook` là kế hoạch kèm lần chạy. Lệnh trả về khi restart đã bắt đầu, không phải khi pod mới sẵn sàng; đọc lại kế hoạch bằng `GET .../runbooks/{plan_id}` để biết khi nào lần chạy xong.

**API key.** Key không thể phê duyệt runbook. Lệnh gọi chỉ lưu kế hoạch và trả `409 APPROVAL_REQUIRED` với kế hoạch trong `runbook`, cùng `approval_url` và `details.runbook_id` khi server biết URL công khai của mình. Owner hoặc admin của workspace đăng nhập và phê duyệt kế hoạch, sau đó key chạy nó bằng `POST .../runbooks/restart/{plan_id}/execute`.

Có thể gửi thêm header `Idempotency-Key` (8 đến 128 ký tự, `[A-Za-z0-9._:-]`). Gửi lại với cùng key sẽ trả về lần chạy đầu tiên kèm header `Idempotent-Replayed: true`, không restart thêm lần nữa.

| Trạng thái | Mã | Ý nghĩa |
|------------|----|---------|
| `400` | `NO_SERVER` | Dự án chưa được gán server |
| `403` | `FORBIDDEN`, `INSUFFICIENT_SCOPE` | Bạn không phải owner hoặc admin, hoặc key thiếu `deployments:execute` |
| `409` | `APPROVAL_REQUIRED` | Gọi bằng API key. Kế hoạch đã được lưu và chờ owner hoặc admin đã đăng nhập phê duyệt |
| `409` | `DEPLOY_IN_PROGRESS` | Một deployment của dự án vẫn đang chạy. Chờ nó xong |
| `409` | `NOT_RUNNING` | Dự án đang ở 0 replica, nên không có gì để restart |
| `409` | `NO_WORKLOAD` | Dự án không có workload nào đang chạy trong cluster. Hãy deploy thay vì restart |
| `409` | `RUNBOOK_FAILED` hoặc một mã cụ thể hơn | Lần chạy đã bắt đầu nhưng cluster từ chối thay đổi. Body có `runbook` |
| `409` | `CONFLICT` | Một thao tác khác trên dự án đang giữ khóa. Thử lại sau ít phút |
| `409` | (không có mã) | Trong workspace dùng môi trường, bộ chặn chuyển môi trường từ chối lệnh gọi: một thao tác ghi khác trên dự án đang chạy, hoặc dự án là nguồn được giữ lại của một lần chuyển (`Source is retained for a move. Restore it before making changes.`). Body chỉ có `message` |
| `503` | `UNAVAILABLE` | TOSE không đọc được cluster, không lấy được khóa dự án hoặc không kiểm tra được quyền thành viên. Không có gì bị thay đổi |

## Xóa dự án {#delete}

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}
```

::: danger Không thể hoàn tác
Xóa dự án sẽ xóa container build đang chạy, tài nguyên Kubernetes, bản ghi DNS của domain riêng, log và **ổ đĩa bền vững cùng toàn bộ dữ liệu**. Hãy sao lưu thứ bạn cần trước.
:::

Dự án, deployment, biến môi trường, domain, uptime monitor và kết nối Git bị xóa mềm nên không còn xuất hiện trong API. Bản ghi usage được giữ lại cho lịch sử thanh toán.

**Phản hồi:** `200` kèm `{ "message": "..." }`. `502` nghĩa là không xóa được ổ đĩa bền vững: hãy gọi lại.

## Đọc dự án và deployment {#read}

```http
GET /api/workspaces/{slug}/projects/{project_slug}
GET /api/workspaces/{slug}/projects/{project_slug}/status
```

Khác với phần còn lại của trang này, mọi thành viên workspace đều được đọc.

- **`endpoint` của server luôn rỗng.** Đối tượng `server` trong chi tiết dự án có `endpoint: ""`, nên chi tiết dự án không chứa URL control-plane Kubernetes. Hãy dùng `server.id` và `server.name`.
- **`latest_deployment`.** Phản hồi status trả deployment gần nhất ở khóa `latest_deployment` (`id`, `status`, `created_at`, tùy chọn `service_url`) và bỏ khóa này khi dự án chưa từng deploy. Khóa camelCase cũ `latestDeployment` vẫn được gửi với cùng giá trị; code mới hãy đọc `latest_deployment`.
- **Credential registry.** Đối tượng `registry` của dự án có `id`, `name`, `provider`, `namespace`, `url`, `status`, `created_at` và `updated_at`. Username và mật khẩu registry không bao giờ nằm trong phản hồi nào.

## Health gate sau deploy {#health-gate}

Mặc định một deployment chuyển sang `running` ngay khi rollout thành công. Operator có thể bật kiểm tra độ sẵn sàng tùy chọn bằng `POST_DEPLOY_HEALTH_GATE_ENABLED=true` (xem [Tự vận hành](/vi/guide/self-hosting#optional-operator-settings)); mặc định là tắt. Gate theo dõi độ sẵn sàng Kubernetes của image vừa deploy trong 10 giây sau rollout build-and-deploy thành công (rollback và deploy template không qua gate) và ghi kết quả vào deployment:

| Trường | Mô tả |
|--------|-------|
| `health_gate_status` | `passed`, `failed`, `skipped_stopped` (deployment bị dừng trong lúc kiểm tra) hoặc `skipped_superseded` (một rollout mới đã thay thế). Không có khi gate không chạy |
| `health_gate_reason` | Giải thích ngắn, an toàn. Không bao giờ chứa lỗi Kubernetes hay secret |
| `health_gate_checked_at` | Thời điểm ghi kết quả (ISO 8601) |

Gate chỉ quan sát workload, không gửi HTTP request tới ứng dụng của bạn. Kết quả `failed` **không** đổi trạng thái deployment, nên nó vẫn `running` và vẫn bị tính phí, và TOSE không bao giờ tự rollback. Build log có dòng `Post-deploy health gate: failed (...)`, và một ops event `deployment.health_gate_failed` (mức `warning`) đề xuất rollback để người dùng duyệt. Hãy xem build log và event, rồi tự [rollback](/vi/commands/deployment) hoặc redeploy.

## Stream log {#log-streams}

Endpoint log build và log runtime là WebSocket. Frame là văn bản; frame từ client bị bỏ qua.

- **Log build.** Khi deployment thất bại, server gửi `[ERROR] Deployment failed` trước `[END]`. Lý do nằm ở `error_message` của `GET .../deployments/{id}`, không nằm trong frame.
- **Log runtime.** Stream mở đến khi bạn ngắt kết nối hoặc stream log của pod kết thúc. Khi server kết thúc, nó gửi `[END]`. Nếu không mở được stream hoặc stream kết thúc vì lỗi, server gửi trước `[ERROR] ` kèm lý do, rồi `[END]`.
- **Handshake thất bại** (không phải WebSocket hợp lệ, hoặc origin bị từ chối) trả JSON `{ "error": "Invalid WebSocket handshake" }`, không phải văn bản thuần.

## Uptime monitor {#uptime}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/uptime
PUT /api/workspaces/{slug}/projects/{project_slug}/uptime
```

Mọi thành viên workspace đều đọc được; `PUT` cần vai trò `admin` hoặc `owner`. Monitor kiểm tra URL của dự án và báo qua email và/hoặc Discord webhook. URL Discord webhook đã lưu là credential nên không bao giờ được trả về: `discord_webhook_url` luôn rỗng và `discord_webhook_configured` cho biết đã lưu hay chưa. Thành viên đọc được trạng thái mà không nhận credential.

Với `PUT`, `discord_webhook_url` có ba cách hoạt động:

| Yêu cầu | Kết quả |
|---------|---------|
| Bỏ `discord_webhook_url` | Giữ webhook đã lưu |
| Gửi URL Discord webhook (`https://discord.com/api/webhooks/...`) | Thay thế webhook đã lưu. URL khác trả `400` |
| Gửi chuỗi rỗng `""` | Webhook đã lưu bị **xóa**, giống `clear_discord_webhook` |
| Gửi `"clear_discord_webhook": true` | Xóa webhook đã lưu |

`GET` luôn trả `discord_webhook_url` là chuỗi rỗng, nên đừng gửi lại nguyên body của `GET` vào `PUT`: làm vậy sẽ xóa webhook đã lưu. `PUT` thay thế toàn bộ các cài đặt khác (`enabled`, `check_interval_sec`, `notify_email`), nên hãy gửi đủ; `notify_email` bị bỏ sẽ bị xóa và `check_interval_sec` giới hạn trong 60-3600 giây. Gửi đồng thời URL thay thế và `clear_discord_webhook: true` trả `400`. Với `enabled: true`, phải còn ít nhất một trong webhook Discord (đã lưu hoặc mới) và `notify_email`, nếu không trả `400`.

## Kết nối Git {#git-connection}

Kết nối repository GitHub để mỗi lần push có thể deploy. Workspace cần có GitHub App installation trước; xem [API GitHub](/vi/api/github). Quy trình được mô tả ở [Tích hợp Git](/vi/guide/git).

### Kết nối {#connect}

```http
POST /api/workspaces/{slug}/projects/{project_slug}/git
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------------|
| `repo_full_name` | string | có | Repository dạng `owner/repo` |
| `branch` | string | không | Branch theo dõi. Mặc định `main` |
| `installation_id` | integer | không | GitHub App installation đã gắn vào workspace. Khi bỏ trống, dùng installation duy nhất của workspace hoặc tìm installation truy cập được repository |
| `auto_deploy` | boolean | không | Deploy mỗi lần push. Mặc định `true` |

```bash
curl -X POST "https://api.tose.sh/api/workspaces/$WS/projects/web/git" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"repo_full_name": "acme/web", "branch": "main"}'
```

**Phản hồi:** `201` kèm kết nối.

```json
{
  "id": "…",
  "project_id": "…",
  "provider": "github",
  "repo_full_name": "acme/web",
  "branch": "main",
  "installation_id": 12345678,
  "webhook_id": 987654,
  "auto_deploy": true,
  "created_at": "2026-11-02T07:00:00Z",
  "updated_at": "2026-11-02T07:00:00Z"
}
```

Lệnh tạo webhook push. Nếu không tạo được webhook, kết nối vẫn được lưu và `webhook_id` là `null`. Khi dự án có server, lần deploy đầu tiên được xếp hàng chạy nền, nhưng chỉ khi người gọi có `deployments:execute`. Chỉ có `projects:write` thì kết nối được tạo với `auto_deploy` tắt và không có lần deploy nào được xếp hàng. Xem [Scope và tự động triển khai](/vi/api/authentication#scopes-and-automatic-deploys).

| Mã | Ý nghĩa |
|--------|---------|
| `400` | Thiếu `repo_full_name` hoặc không phải `owner/repo`, repository không truy cập được qua installation, branch không tồn tại, hoặc không installation nào đã gắn truy cập được repository. Lỗi do GitHub gây ra có [mã `github_*`](/vi/api/errors#ma-loi-upstream-cua-github) và không thể thử lại |
| `403` | `installation_id` chưa được gắn vào workspace này |
| `409` | Dự án đã có kết nối Git |
| `503` | GitHub App chưa được cấu hình trên hệ thống này |

### Cập nhật {#update-git}

```http
PUT /api/workspaces/{slug}/projects/{project_slug}/git
```

Gửi `branch` và/hoặc `auto_deploy`. Trường bỏ trống giữ nguyên. Branch mới được kiểm tra với repository. **Phản hồi:** `200` kèm kết nối.

### Ngắt kết nối {#disconnect}

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}/git
```

Gỡ kết nối và xóa webhook GitHub của nó, trừ khi dự án khác vẫn dùng webhook đó. Các deployment hiện có tiếp tục chạy. **Phản hồi:** `200` kèm `{ "message": "..." }`.

## Xuất dự án {#export}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/export
```

Trả về danh mục chỉ đọc của dự án, schema `tose.dev/project-export/v1`, để bạn lập kế hoạch chuyển sang nền tảng khác. Đây không phải bản backup, không thay đổi gì, và không chứng minh việc chuyển đã thành công.

**Quyền truy cập.** Thành viên workspace đã đăng nhập (mọi vai trò) gọi được. API key của workspace cần scope riêng `projects:export`; `projects:read` hoặc `projects:write` không đủ. Cả yêu cầu được phép lẫn bị từ chối đều được ghi vào [audit log](/vi/api/audit). Dự án không tồn tại và dự án thuộc workspace khác đều trả `404`, nên phản hồi không tiết lộ slug nào có thật.

**Nội dung**

| Trường | Nội dung |
|--------|----------|
| `schema_version`, `generated_at` | `tose.dev/project-export/v1` và thời điểm xuất |
| `source` | `workspace_id`, `project_id`, `name`, `slug`. Đây là định danh nguồn; không dùng lại các ID này ở đích |
| `artifact` | `deployment_id` và `commit_sha` của deployment đang chạy mới nhất, và `image_digest` **chỉ khi** image được ghim bằng OCI digest (`name@sha256:...`). Tag như `:latest` bị bỏ qua |
| `resources` | `port`, `replicas`, `cpu` và `ram` đang áp dụng |
| `env_keys` | Chỉ **tên** biến môi trường, đã sắp xếp |
| `env_refs` | Mỗi tên trong `env_keys` có một mục, cùng thứ tự: `key`, `secret` và `value_recoverable`. `value_recoverable` là `false` khi TOSE không còn giải mã được giá trị đã lưu, nên giá trị phải lấy từ nơi khác. Không có giá trị nào, dù một phần, trong gói |
| `domains` | Domain tùy chỉnh với `name`, `dns_status` và `ssl_status`. Domain mặc định của TOSE không được liệt kê |
| `volumes` | Metadata volume bền vững của dự án: `id`, `size_gib`, `mount_path`, `status` và `backup_refs`, luôn rỗng vì TOSE không backup volume |
| `databases` | Các database của workspace mà một giá trị biến môi trường trỏ tới, qua service nội bộ `db-<tên>` hoặc domain bên ngoài: `id`, `name`, `engine`, `version`, `storage_size`, `referenced_by_env_keys` và `backup_refs`. Danh sách được suy ra từ các giá trị TOSE giải mã được, nên có thể rỗng hoặc thiếu dù ứng dụng có dùng database |
| `blockers` | Những điều chưa được xác minh, xem bên dưới |
| `migration` | Hợp đồng `tose.dev/data-migration/v1`, xem [Bằng chứng chuyển dữ liệu](#migration-evidence). `status` luôn là `not_started` |
| `rollback` | Thông báo về những gì rollback của TOSE khôi phục và không khôi phục, xem [Biên nhận rollback](#rollback-receipts) |

**Không bao giờ có:** giá trị biến môi trường, API key, thông tin đăng nhập registry hoặc database, kubeconfig, khóa lưu trữ hay build log. Trước khi gửi, TOSE kiểm tra gói theo schema v1 và các quy tắc an toàn. Gói không qua được kiểm tra (trường lạ, `null`, chuỗi trông như thông tin đăng nhập, thiếu blocker bắt buộc, hoặc `migration.status` khác `not_started`) bị từ chối với `500` thay vì được gửi.

**Header phản hồi.** `X-Tose-Export-Sha256` là SHA-256 dạng hex của nội dung trả về. Hãy lưu cùng bản export làm bằng chứng cho bước `record_export`.

```json
{
  "schema_version": "tose.dev/project-export/v1",
  "generated_at": "2026-11-05T08:00:00Z",
  "source": { "workspace_id": "ws_...", "project_id": "prj_...", "name": "Shop", "slug": "shop" },
  "artifact": { "deployment_id": "dep_...", "image_digest": "registry.example/shop@sha256:<64 ký tự hex>", "commit_sha": "<commit>" },
  "resources": { "port": 3000, "replicas": 1, "cpu": "500m", "ram": "512Mi" },
  "env_keys": ["DATABASE_URL", "SESSION_SECRET"],
  "env_refs": [
    { "key": "DATABASE_URL", "secret": true, "value_recoverable": true },
    { "key": "SESSION_SECRET", "secret": true, "value_recoverable": true }
  ],
  "domains": [{ "name": "shop.example.com", "dns_status": "verified", "ssl_status": "active" }],
  "volumes": [{ "id": "vol_...", "size_gib": 10, "mount_path": "/data", "status": "bound", "backup_refs": [] }],
  "databases": [{
    "id": "db_...", "name": "shop-db", "engine": "postgres", "version": "16", "storage_size": "10Gi",
    "referenced_by_env_keys": ["DATABASE_URL"],
    "backup_refs": [{
      "id": "bk_...", "created_at": "2026-11-05T02:00:00Z", "size_bytes": 1048576,
      "sha256": "<64 ký tự hex>", "format": "pg_dumpall_sql", "encrypted_at_rest": true,
      "retention": "until_deleted_by_workspace_admin",
      "download_path": "/api/workspaces/acme/databases/db_.../backups/bk_.../download"
    }]
  }],
  "blockers": ["volume_backup_and_restore_unverified", "volume_backup_unavailable", "database_restore_unverified", "database_dependencies_unresolved", "target_capabilities_unverified", "dns_cutover_requires_approval"],
  "migration": { "contract_version": "tose.dev/data-migration/v1", "status": "not_started", "source_retained": true, "steps": ["..."] },
  "rollback": { "artifact": "...", "config": "...", "schema": "...", "data": "...", "receipt_version": "tose.dev/rollback-receipt/v1" }
}
```

Các giá trị trên chỉ là ví dụ và mảng `migration.steps` đã được rút gọn. `artifact` để trống khi dự án chưa có deployment đang chạy.

### Tham chiếu backup {#backup-references}

Mỗi mục của `databases[].backup_refs` trỏ tới một bản backup đã hoàn tất của database đó. TOSE liệt kê tối đa năm bản gần nhất, mới nhất trước. Một tham chiếu gồm:

| Trường | Nội dung |
|--------|----------|
| `id`, `created_at`, `size_bytes` | Bản backup, thời điểm tạo và kích thước |
| `sha256` | SHA-256 của bản dump sau khi tải (đã giải mã). Không có với backup tạo trước khi TOSE ghi checksum |
| `format` | `pg_dumpall_sql`, `mysqldump_sql` hoặc `mongodump_archive` |
| `encrypted_at_rest` | Bản lưu có được mã hóa hay không |
| `retention` | `until_deleted_by_workspace_admin`: TOSE giữ bản backup cho tới khi admin xóa |
| `download_path` | Đường dẫn API của TOSE để tải về |

Tham chiếu không có khóa lưu trữ hay thông tin đăng nhập. Nó chỉ là con trỏ, không phải dữ liệu.

- **Chỉ admin được tải.** Gọi `download_path` cần vai trò `owner` hoặc `admin` của workspace, và API key còn cần scope `databases:read`. Bản export thì mọi thành viên gọi được, nên thành viên thấy backup có tồn tại nhưng không tải được.
- **Kiểm tra bằng SHA-256.** Lượt tải trả checksum trong header `X-Tose-Backup-Sha256`. Hãy so nó với `sha256` trong export và với `sha256sum` của file bạn đã lưu. TOSE cũng từ chối tải hoặc khôi phục bản dump không khớp checksum đã ghi.
- **Không có backup volume.** TOSE không backup volume bền vững. `volumes[].backup_refs` luôn rỗng và export mang blocker `volume_backup_unavailable`. Hãy tự sao chép volume và ghi lại SHA-256.

### Blockers

`blockers` liệt kê các điều kiện export không thể chứng minh. Hãy coi mỗi mục là việc phải làm trước khi chuyển DNS.

| Blocker | Ý nghĩa |
|---------|---------|
| `immutable_oci_digest_unavailable` | Không có image đang chạy được ghim bằng digest nên không tái tạo chính xác được. Hãy build hoặc xác định digest trước |
| `env_values_unrecoverable` | TOSE không còn giải mã được ít nhất một giá trị đã lưu (`value_recoverable: false`). Hãy lấy từ kho secret của bạn |
| `env_values_recoverability_unverified` | TOSE không kiểm tra được các giá trị đã lưu có giải mã được không. Hãy kiểm tra trước khi dựa vào chúng |
| `volume_backup_and_restore_unverified` | Dự án có volume. Hãy tạo snapshot hoặc archive nhất quán và thử khôi phục |
| `volume_backup_unavailable` | Volume không có tham chiếu backup. Hiện TOSE không bao giờ có |
| `database_backup_unavailable` | Một database được liệt kê chưa có backup hoàn tất. Hãy tạo trước khi tiếp tục (TOSE không backup Redis, hãy tự tạo bản dump) |
| `database_backup_checksum_unavailable` | Backup mới nhất không có `sha256` vì tạo trước khi TOSE ghi checksum. Hãy tạo backup mới |
| `database_restore_unverified` | Dự án trỏ tới database. Chưa có lần khôi phục nào được thử; hãy chạy thử |
| `database_dependencies_unresolved` | Danh sách database được suy ra và có thể thiếu. Hãy kiểm tra cấu hình của chính ứng dụng |
| `target_capabilities_unverified` | Kiểm tra đích hỗ trợ CPU, bộ nhớ, port, volume và cách kiểm tra sức khỏe |
| `dns_cutover_requires_approval` | Đổi DNS cần người có thẩm quyền phê duyệt rõ ràng, sau khi đích đã hoạt động tốt |

`database_dependencies_unresolved`, `target_capabilities_unverified` và `dns_cutover_requires_approval` luôn xuất hiện. Danh sách không bao giờ rỗng.

### Bằng chứng chuyển dữ liệu {#migration-evidence}

`migration` là hợp đồng `tose.dev/data-migration/v1`. TOSE chỉ mô tả công việc: `status` luôn là `not_started`, và TOSE không bao giờ chạy hay báo cáo một lần chuyển. Hợp đồng có năm bước, luôn theo thứ tự này, và một bước chỉ được coi là xong khi bạn đưa ra được bằng chứng của nó.

| Bước | Bằng chứng cần giữ | Phê duyệt |
|------|--------------------|-----------|
| `record_export` | `export_sha256` (`X-Tose-Export-Sha256` của export) và `blockers_reviewed_by`, người đã xử lý hoặc chấp nhận từng blocker | Không |
| `backup_data` | Với mỗi database và volume: `backup_id`, `sha256`, `created_at`, `retention_until` và `storage_location` của bản sao độc lập | Không |
| `restore_dry_run` | `checksum_verified`, `restored_at`, `smoke_test_result` và `data_check_result` (kiểm tra số dòng hoặc domain) từ lần khôi phục vào môi trường đích tách biệt | Không |
| `dns_cutover` | `approved_by` (người đã phê duyệt), `ttl_seconds`, `target_health_check` và `switched_at` | **Có** (`approval_required: true`) |
| `retain_source` | `retain_until`: ngày giữ dự án nguồn, dữ liệu và backup. Ngày này phải sau khi đích được xác nhận và hết thời hạn giữ đã thỏa thuận | Không |

Mỗi bước cũng liệt kê chính xác các mục `evidence` trong phản hồi. Nếu khác bảng này, hãy theo danh sách trong phản hồi.

Nguồn vẫn phục vụ lưu lượng trong mọi bước (`source_serving: true`). Nếu một bước thất bại, nguồn và dữ liệu giữ nguyên (`on_failure: keep_source`), bạn dừng lại và tìm nguyên nhân. TOSE không bao giờ xóa nguồn trong quá trình chuyển.

**Thu thập bằng chứng khôi phục thử.** TOSE chưa chạy lần khôi phục nào thay bạn, nên bằng chứng đến từ lần chạy của chính bạn. Hướng dẫn xuất dự án có bài khôi phục thử đầy đủ bằng Docker và Kubernetes cho ứng dụng HTTP có PostgreSQL và volume (xem phần Liên quan bên dưới). Tóm tắt:

```sh
# 1. Lưu export và kiểm tra checksum so với header phản hồi.
curl -sS -D headers.txt -H "X-API-Key: $TOSE_API_KEY" \
  "https://<api-host>/api/workspaces/<ws>/projects/<project>/export" -o export.json
sha256sum export.json   # phải bằng X-Tose-Export-Sha256 trong headers.txt

# 2. Tải backup database bằng key owner hoặc admin, rồi kiểm tra.
curl -sS -H "X-API-Key: $TOSE_ADMIN_KEY" "https://<api-host><download_path>" -o dump.sql
echo "<sha256>  dump.sql" | sha256sum -c -
```

Khôi phục `dump.sql` vào một môi trường đích tách biệt, không phải database production, khôi phục archive volume của bạn vào đó và chạy các kiểm tra. Giữ kết quả làm bằng chứng `restore_dry_run`. Không báo dự án đã chuyển khi chưa có bằng chứng này.

::: warning
Không đổi DNS khi chưa có người phê duyệt bước `dns_cutover`, và không xóa nguồn trước khi đích được xác nhận. Nếu khôi phục thử hoặc checksum thất bại, hãy giữ nguồn và sửa nguyên nhân trước.
:::

### Biên nhận rollback {#rollback-receipts}

Rollback của TOSE chạy lại image của một deployment cũ cho dự án **hiện tại**. Nó dùng lại biến môi trường và cấu hình hiện tại, và không khôi phục schema database, dữ liệu database hay dữ liệu volume.

`POST /api/workspaces/{slug}/projects/{project_slug}/deployments/{id}/rollback` trả về deployment mới kèm `rollback_receipt` (`tose.dev/rollback-receipt/v1`) bên cạnh các trường của nó. Trường `rollback_of_deployment_id` của deployment chỉ ra deployment có image được chạy lại. Biên nhận ghi deployment nguồn (`deployment_id`, `image`, `image_digest` khi được ghim, `commit_sha`, `created_at`) và bốn lớp, luôn theo thứ tự:

| Lớp | `rolled_back` | Ý nghĩa |
|-----|---------------|---------|
| `artifact` | `true` | Image đã được chạy lại |
| `config` | `false` | Dùng biến môi trường, giới hạn tài nguyên và domain hiện tại |
| `schema` | `false` | Schema database không bị thay đổi |
| `data` | `false` | Dữ liệu database và volume không bị thay đổi |

Vì vậy rollback image giữ ba lớp còn lại tách riêng. Khôi phục cấu hình, schema hoặc dữ liệu cần một lần khôi phục riêng từ backup đã kiểm tra, và một bản ghi riêng.

```http
GET /api/workspaces/{slug}/projects/{project_slug}/deployments/{id}/rollback-receipt
```

Trả lại cùng biên nhận sau đó, với `{id}` là deployment **rollback**. Mọi thành viên workspace đều gọi được; API key cần scope `deployments:read`. Deployment không phải rollback, và rollback tạo trước khi có biên nhận, trả `404`. Trường `rollback_receipt` trong phản hồi rollback chỉ vắng khi không đọc lại được deployment nguồn sau khi rollback chạy; khi đó hãy lấy bằng lệnh gọi này.

Schema đầy đủ của request và response nằm trong [tài liệu OpenAPI của backend](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) (các operation `exportProject` và `getRollbackReceipt`).

## Biến môi trường và apply {#environment-variables}

Các route biến môi trường nằm trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml):
`POST`, `PUT` và `DELETE` trên `/api/workspaces/{slug}/projects/{project_slug}/env[/{env_id}]`, và
`PUT .../env/bulk`. Mặc định thay đổi chỉ được lưu; các pod đang chạy nhận thay đổi ở lần deploy tiếp
theo hoặc `POST .../redeploy`.

### Lưu và áp dụng

Thêm `?apply=true` để lưu thay đổi rồi triển khai ngay. Cách triển khai giống
`POST /api/workspaces/{slug}/projects/{project_slug}/redeploy`: image thành công gần nhất với các biến
và giới hạn tài nguyên hiện tại, **không build lại**.

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/projects/web/env/bulk?apply=true" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"variables": {"LOG_LEVEL": "debug"}, "merge": true}'
```

Phản hồi có thêm đối tượng `apply` bên cạnh kết quả thông thường. Thay đổi luôn được lưu dù `apply` báo gì.

```json
{ "applied": true, "deployment_id": "dep_123", "status": "running" }
```

```json
{ "applied": false, "code": "NO_DEPLOYMENT", "reason": "The project has no successful deployment yet. The change was saved and applies with the next deploy." }
```

| Trường | Mô tả |
|--------|-------|
| `applied` | `true` khi thay đổi đã được triển khai tới các pod đang chạy |
| `deployment_id`, `status` | Deployment mà lần triển khai ghi nhận, khi đã áp dụng |
| `code`, `reason` | Lý do chưa áp dụng: `NO_DEPLOYMENT` (chưa có deployment thành công), `NO_SERVER`, `INSUFFICIENT_BALANCE`, `ROLLOUT_FAILED` và tương tự. Hãy redeploy để thử lại |

Apply cần cùng quyền với redeploy: vai trò `owner` hoặc `admin`, scope `deployments:execute` với API
key, phê duyệt với ứng dụng OAuth được kết nối, và số dư ví dương. Nếu thiếu một điều kiện, yêu cầu bị
từ chối trước khi lưu bất cứ thứ gì:

| Trạng thái | Ý nghĩa |
|------------|---------|
| `402` | Số dư ví không dương (`INSUFFICIENT_BALANCE`). Không có gì được lưu |
| `403` | Key thiếu `deployments:execute`, hoặc ứng dụng OAuth cần phê duyệt (`approval_required`). Không có gì được lưu |

### Phát hiện thay đổi chờ áp dụng

`GET /api/workspaces/{slug}/projects/{project_slug}` trả về `env_pending`: `true` khi các biến đã lưu
khác với biến mà deployment đang chạy được triển khai cùng. Giá trị là `false` khi chưa có gì chạy, với
deployment tạo trước khi có trường này, và sau khi rollback bằng runbook.

## Liên quan

- [Tích hợp Git](/vi/guide/git)
- [API GitHub](/vi/api/github)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [API key và scope](/vi/api/api-keys)
- [`tose export`](/vi/commands/export): danh mục từ CLI. Lệnh chỉ in các trường danh mục, không in `databases`, `env_refs` hay `migration`, nên hãy gọi API để lấy tham chiếu backup
- [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback)
- [Hướng dẫn xuất dự án](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md): bài khôi phục thử với Docker và Kubernetes
- [Tài liệu OpenAPI của backend](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
