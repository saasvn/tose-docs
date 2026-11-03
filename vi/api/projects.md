# API dự án

Các endpoint để đổi, restart và xóa dự án, cùng quản lý kết nối Git. Tạo và liệt kê dự án, deploy và đọc log nằm trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) phục vụ tại `GET /api/openapi.yaml`; trang này mô tả các luồng quanh chúng.

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/projects/{project_slug}` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Mọi endpoint ở trang này cần vai trò `admin` hoặc `owner` của workspace.

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

## Restart dự án {#restart}

```http
POST /api/workspaces/{slug}/projects/{project_slug}/restart
```

Kích hoạt rolling restart của deployment đang chạy mà không build image mới. Lệnh trả về khi yêu cầu restart được ghi nhận, không phải khi pod mới sẵn sàng; hãy poll trạng thái dự án để biết khi nào chạy lại.

```json
{ "success": true, "message": "Project restarting", "restarted_pods": 1 }
```

`restarted_pods` là số replica của deployment đã restart. Dự án chưa được gán server trả `400`, dự án chưa từng deploy trả `404`.

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

- **`endpoint` của server luôn rỗng.** Đối tượng `server` trong chi tiết dự án có `endpoint: ""`, nên URL control-plane Kubernetes không bao giờ bị lộ. Hãy dùng `server.id` và `server.name`.
- **`latest_deployment`.** Phản hồi status trả deployment gần nhất ở khóa `latest_deployment` (`id`, `status`, `created_at`, tùy chọn `service_url`) và bỏ khóa này khi dự án chưa từng deploy. Khóa camelCase cũ `latestDeployment` vẫn được gửi với cùng giá trị; code mới hãy đọc `latest_deployment`.
- **Credential registry.** Đối tượng `registry` của dự án có `id`, `name`, `provider`, `namespace`, `url` và `status`. Username và mật khẩu registry không bao giờ nằm trong phản hồi nào.

## Health gate sau deploy {#health-gate}

Mặc định một deployment chuyển sang `running` ngay khi rollout thành công. Operator có thể bật kiểm tra độ sẵn sàng tùy chọn bằng `POST_DEPLOY_HEALTH_GATE_ENABLED=true` (xem [Tự vận hành](/vi/guide/self-hosting#optional-operator-settings)); mặc định là tắt. Gate theo dõi độ sẵn sàng Kubernetes của image vừa deploy trong 10 giây sau rollout và ghi kết quả vào deployment:

| Trường | Mô tả |
|--------|-------|
| `health_gate_status` | `passed`, `failed`, `skipped_stopped` (deployment bị dừng trong lúc kiểm tra) hoặc `skipped_superseded` (một rollout mới đã thay thế). Không có khi gate không chạy |
| `health_gate_reason` | Giải thích ngắn, an toàn. Không bao giờ chứa lỗi Kubernetes hay secret |
| `health_gate_checked_at` | Thời điểm ghi kết quả (ISO 8601) |

Gate chỉ quan sát workload, không gửi HTTP request tới ứng dụng của bạn. Kết quả `failed` **không** đổi trạng thái deployment, nên nó vẫn `running` và vẫn bị tính phí, và TOSE không bao giờ tự rollback. Build log kết thúc bằng `Post-deploy health gate: failed (...)`, và một ops event `deployment.health_gate_failed` (mức `warning`) đề xuất rollback để người dùng duyệt. Hãy xem build log và event, rồi tự [rollback](/vi/commands/deployment) hoặc redeploy.

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
| Gửi `"clear_discord_webhook": true` | Xóa webhook đã lưu |

Gửi đồng thời URL thay thế và `clear_discord_webhook: true` trả `400`. Với `enabled: true`, phải còn ít nhất một trong webhook Discord (đã lưu hoặc mới) và `notify_email`, nếu không trả `400`.

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
| `400` | Thiếu `repo_full_name` hoặc không phải `owner/repo`, repository không truy cập được qua installation, branch không tồn tại, hoặc không installation nào đã gắn truy cập được repository |
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

## Liên quan

- [Tích hợp Git](/vi/guide/git)
- [API GitHub](/vi/api/github)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
