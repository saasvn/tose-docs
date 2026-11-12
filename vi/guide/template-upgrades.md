# Template registry: health probe, nâng cấp và rollback

Hướng dẫn này nói về các template cài từ **template registry** của TOSE (manifest `tose.yaml` được publish thành definition và version trong workspace của bạn). Trang giải thích cách manifest khai báo probe startup, readiness và liveness, và cách một người xem lại, phê duyệt và kiểm tra việc nâng cấp hoặc rollback tại chỗ của app đã cài.

Trang không nói về các template catalog (GoClaw, Dewee, Cloud Harness). Với các template đó, xem [runbook Dewee](/vi/guide/dewee-template) và [`tose template`](/vi/commands/template).

::: warning Các release gate vẫn áp dụng
Template registry là riêng tư trong workspace của bạn và mọi plan đều đi qua đúng các gate như khi cài mới. Với cấu hình production hiện tại, mọi plan đều bị chặn, nên bạn có thể lập plan và xem lại nhưng chưa cài hay nâng cấp được. Xem [Các release gate vẫn có hiệu lực](#cac-release-gate-van-co-hieu-luc).
:::

## Khai báo health probe trong manifest

Thêm khối `health` (tùy chọn) vào service trong `tose.yaml`:

```yaml
services:
  - name: web
    port: 3000
    health:
      readiness:
        http:
          path: /healthz
      liveness:
        tcp: {}
      startupSeconds: 300
```

| Trường | Ý nghĩa |
|--------|---------|
| `readiness` | Quyết định khi nào pod nhận traffic. Tùy chọn |
| `liveness` | Quyết định khi nào container bị khởi động lại. Tùy chọn |
| `http` | `path` (đường dẫn URL tuyệt đối, tối đa 200 ký tự, không có query, fragment, khoảng trắng hay đoạn `.`/`..`) và `port` tùy chọn |
| `tcp` | `port` tùy chọn |
| `startupSeconds` | Thời gian tối đa container được phép mất để qua probe đầu tiên trước khi bị khởi động lại. Từ `30` đến `1800`, mặc định `300` |

Parser áp dụng các quy tắc sau, mỗi lỗi đều nêu rõ đường dẫn trường:

- Một probe là đúng một trong `http` hoặc `tcp`. Port `0` hoặc không có port nghĩa là port của service.
- `exec`, `grpc`, và `host`, `scheme`, `httpHeaders` của probe HTTP đều bị từ chối. Template không bao giờ khiến node chạy lệnh trong container của nó.
- Manifest không có `health` được deploy như trước.

### TOSE làm gì với các probe

- Probe nằm trong plan, nên được tính vào plan hash mà bạn phê duyệt. Version không có `health` giữ nguyên hash như trước khi có probe.
- Workload nhận đúng các probe readiness và liveness đã khai báo, cộng một startup probe dựng từ check đầu tiên được khai báo. Rollout chờ ít nhất `startupSeconds`.
- Một lần chạy chỉ được ghi là `running` sau khi các pod qua probe.
- Khi readiness là một đường dẫn HTTP trên port của service, TOSE còn gọi đường dẫn đó qua route công khai. Trạng thái health là `healthy`, hoặc `unhealthy` kèm lý do và lần chạy bị đánh thất bại. Nếu không, kết quả của pod được giữ nguyên và trạng thái là `unverified`.
- `TEMPLATE_PROBES_ENABLED=false` trên nền tảng sẽ tắt probe cho các installation từ registry.

Installation báo `health.declared` (các probe của version đang chạy) cùng `health.state`, `health.message` và `health.checked_at` của lần chạy gần nhất.

## Nâng cấp hoặc rollback tại chỗ

App đã cài chuyển sang version đã publish khác của definition qua đúng ba bước như khi cài: **plan, phê duyệt, thực thi**. Không có gì được tạo thêm bên cạnh app, và việc lập plan không thay đổi gì.

### 1. Xem lại plan

Trong dashboard, mở app đã cài (`/w/<workspace>/templates/<app>`). Thẻ **Phiên bản mẫu** (Template version) ở tab **Tổng quan** (trên trang của agent Claude Code, Codex hay Pi: trong khối **Cấu hình** của tab **Cài đặt**) hiển thị version đang cài, các probe của nó và trạng thái health gần nhất. Chọn version mới hơn, hoặc dùng **Roll back** sau một lần nâng cấp, và plan hiện ra đúng như server trả về:

1. **Blocker** trước tiên. Không thể phê duyệt khi còn blocker.
2. Bảng trước/sau: image digest, build mode, port, kích thước, input được thêm và giữ lại, từng volume, ổ đĩa, các probe và egress. Các dòng có thể ảnh hưởng dữ liệu được làm nổi bật.
3. Cảnh báo, mức trần chi phí và ví, plan hash và thời điểm hết hạn (30 phút).

Nếu version mới cần một input mà app chưa có giá trị, thẻ hiện một ô nhập và lập plan lại.

### 2. Xác nhận version đích

Kiểm tra version trong plan đúng là version bạn muốn, và manifest hash cùng source digest khớp với những gì bạn đã xem. Tích ô xác nhận đã xem rồi phê duyệt. Phê duyệt gắn với plan hash: nếu có gì thuộc hash thay đổi trước khi bạn áp dụng (version bị thu hồi, kích thước đĩa khác, giá mới) thì plan bị từ chối vì cũ (stale) và bạn lập plan lại.

Phê duyệt cần một con người. API key của workspace phê duyệt thay cho chủ của nó. App MCP đã kết nối không thể phê duyệt; nó đưa bạn tới trang phê duyệt của plan.

### 3. Áp dụng và kiểm tra health của rollout

Khi áp dụng, bạn nhập các secret mới trong ô mật khẩu và hệ thống gửi một `Idempotency-Key` cho mỗi plan, nên thử lại hoặc nhấp đúp sẽ phát lại cùng một thay đổi. Sau đó thẻ theo dõi lần chạy đến khi kết thúc.

Để kiểm tra kết quả:

- `health.state` của installation phải thành `healthy` (hoặc `unverified` khi readiness không phải đường dẫn HTTP trên port của service).
- `version` hiển thị version mới và `rollback_to` hiển thị version bạn có thể quay lại.
- `trigger_type` của lần chạy là `template_upgrade` hoặc `template_rollback`, và log deployment có liên kết từ app.

Nếu version mới không qua probe, **không có gì tự rollback**. Lần chạy bị đánh dấu thất bại kèm lý do. Hãy lập plan rollback khi bạn muốn quay lại version trước.

### Rollback

Plan rollback quay lại version mà lần nâng cấp gần nhất đã thay thế, với cùng cách phê duyệt và thực thi. Plan cảnh báo `ROLLBACK_DATA`: version trước nhận lại đúng ổ đĩa đó và có thể không đọc được những gì version mới đã ghi. Rollback không thể tự rollback tiếp; hãy lập plan nâng cấp. Lịch sử nâng cấp được liệt kê mới nhất trước.

## Ổ đĩa và dữ liệu hiện có được giữ nguyên

Một lần deploy không bao giờ xóa hay thu nhỏ ổ đĩa, và các input đã lưu không bao giờ bị xóa. Plan bị **từ chối** (blocker) trong các trường hợp sau:

| Mã | Lý do plan bị từ chối |
|----|------------------------|
| `VOLUME_REMOVED` | Version mới bỏ một mục storage. Các mục được so sánh theo vị trí, vì mục `n` là thư mục `data-<n>` của ổ đĩa |
| `VOLUME_PATH_CHANGED` | Version mới mount một mục hiện có vào đường dẫn khác |
| `DISK_RESIZE_REQUIRED` | Version mới cần nhiều storage hơn ổ đĩa đang có. Deploy không bao giờ đổi kích thước ổ đĩa. Hãy tăng đĩa trước (`PATCH /volumes/{volume_id}`), rồi lập plan lại |
| `INSUFFICIENT_BALANCE` | Ví có ít hơn một giờ chi phí của workload sau nâng cấp (`402`) |
| `DEPLOYMENT_IN_PROGRESS` | Một lần chạy đang build hoặc deploy |
| `INSTALLATION_DELETING` hoặc `INSTALLATION_DELETED` | App đang bị hoặc đã bị xóa |

Các mã sau chỉ cảnh báo:

| Mã | Ý nghĩa |
|----|---------|
| `VOLUME_UNMOUNTED` | Rollback để một mục storage của version mới không được mount. Dữ liệu vẫn nằm trên đĩa và lần nâng cấp sau mount lại |
| `INPUT_REMOVED` | Version mới không còn khai báo một input. Giá trị được giữ lại và vẫn truyền cho app |
| `INSTALLATION_STOPPED` | App đang dừng và nâng cấp sẽ khởi động nó |
| `ROLLBACK_DATA` | Xem [Rollback](#rollback) |

App giữ nguyên definition, tên, network mode và kích thước. Plan cố đổi `name`, `definition_slug`, `cpu_cores` hoặc `memory_gib` bị từ chối thay vì bỏ qua; version mới chỉ có thể nâng kích thước lên mức manifest cần.

::: tip Sao lưu trước
Ổ đĩa được giữ nguyên, nhưng version mới có thể migrate dữ liệu trên đó. Hãy sao lưu những gì bạn không thể tạo lại trước khi nâng cấp.
:::

## Các release gate vẫn có hiệu lực {#cac-release-gate-van-co-hieu-luc}

Nâng cấp và rollback không bỏ qua gate nào của registry. Mọi plan, kể cả plan nâng cấp hay rollback, đều được kiểm tra:

- version đã publish (không bị thu hồi hay deprecated) và manifest hash vẫn khớp;
- build security gate. Khi chưa cấu hình, blocker là `SECURITY_GATE_UNAVAILABLE`. Với cấu hình production hiện tại, mọi plan bị chặn bởi `COMMUNITY_TEMPLATES_DISABLED` và `IMAGE_SCANNER_NOT_CONFIGURED`, và nguồn Git còn bị chặn bởi `BUILD_SANDBOX_NOT_HARDENED` và `PUSH_CREDENTIALS_NOT_SCOPED`;
- có cluster và namespace, và mức trần chi phí không vượt `max_hourly_cost_cents`;
- phê duyệt plan hash (luôn bắt buộc với version registry), hết hạn sau 30 phút và chỉ dùng một lần.

Lần chạy end-to-end trên cluster thật (probe trên kubelet thật, rồi nâng cấp và rollback) chưa được thực hiện. Hãy coi probe và nâng cấp là có sẵn qua API và dashboard nhưng chưa phải luồng production đã được xác minh.

## REST

Mọi route nằm dưới `/api/workspaces/{slug}`.

| Route | Ai dùng | Làm gì |
|-------|---------|--------|
| `POST /template-deployment-plans` | thành viên, `deployments:read` | Lập plan nâng cấp với `{"installation_id": "...", "version": "2.0.0"}`. Bỏ `version` để lấy version mới nhất đã publish. Dùng `{"installation_id": "...", "rollback": true}` để quay lại. `variables` chỉ đặt các input mà installation chưa có giá trị |
| `GET /template-deployment-plans/{plan_id}` | thành viên, `deployments:read` | Plan, `kind` (`upgrade` hoặc `rollback`) và `status` |
| `POST /template-deployment-plans/{plan_id}/approve` | admin, `deployments:execute` | Phê duyệt `{plan_hash}` |
| `POST /template-installations/{installation_id}/upgrades` | admin, `deployments:execute` và `projects:write` (và `env:write` khi có secret) | Áp dụng `{plan_id, plan_hash, secrets}`. Cần header `Idempotency-Key` |
| `GET /template-installations/{installation_id}/upgrades` | thành viên, `deployments:read` | Các lần nâng cấp và rollback, mới nhất trước |
| `GET /template-installations[/{installation_id}]` | thành viên, `deployments:read` | Version, `version_status`, `health`, `rollback_to` và `next_actions` (`plan_upgrade`, `plan_rollback`). `?template_id=` tìm một app |

Các lỗi có thể gặp khi áp dụng:

| Mã | Ý nghĩa |
|----|---------|
| `409 PLAN_STALE` | Có gì thuộc hash đã thay đổi. Body có `changed` và `current_plan_hash` |
| `409 PLAN_BLOCKED` | Xuất hiện blocker mới (`402` khi ví trống) |
| `409 PLAN_CONSUMED` | Plan đã được áp dụng với key khác |
| `409 PLAN_NOT_FOR_INSTALLATION` | Plan thuộc installation khác |
| `409 PLAN_IS_UPGRADE` | Plan nâng cấp bị gửi tới `POST /template-installations` |
| `409 DEPLOYMENT_IN_PROGRESS` | Một lần chạy vẫn đang build hoặc deploy |
| `403 APPROVAL_REQUIRES_PERSON` | App MCP đã kết nối cố phê duyệt |

Thử lại với cùng key sẽ phát lại kết quả đầu tiên (`200`, `replayed: true`). Hợp đồng đầy đủ nằm trong tài liệu OpenAPI của nền tảng.

## MCP

Các tool MCP gọi cùng planner với REST và không đi xa hơn REST.

| Tool | Làm gì | Scope |
|------|--------|-------|
| `plan_template_deployment` | Với `installation_id` cùng `version` hoặc `rollback: true`, lập plan nâng cấp hoặc rollback tại chỗ. Trả về plan, `approval_required`, `approval_url` và `next_actions` | `deployments:read` |
| `get_template_deployment` | Một plan, một installation kèm version, health và `rollback_to`, và lần chạy gần nhất kèm đoạn log cuối đã che thông tin nhạy cảm | `deployments:read` |
| `deploy_template` | Thực thi plan cài, nâng cấp hoặc rollback đã được phê duyệt. Thử lại trả về kết quả đầu tiên | `deployments:execute` và `projects:write` |

Không tool nào phê duyệt plan. Mở `approval_url` (`/oauth/template-plans/{plan_id}` trên API) khi đã đăng nhập với tư cách owner hoặc admin của workspace, xem lại đúng plan đó rồi phê duyệt. Khi plan cần secret, bạn nhập giá trị ngay trên trang đó, trang sẽ phê duyệt và áp dụng plan dưới danh nghĩa bạn, nên giá trị không đi qua agent. Mọi lệnh gọi, kể cả bị từ chối, đều được ghi vào audit log MCP. Để kết nối client, xem [MCP clients](/vi/mcp/clients) và [Giao thức, OAuth và scope](/vi/mcp/oauth).

## Liên quan

- [File cấu hình](/vi/guide/configuration)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Runbook Dewee](/vi/guide/dewee-template)
- [Bảng giá](/vi/guide/pricing)
- [Tương thích client](/vi/mcp/clients)
