# API Browsers

::: info Trên TOSE cloud
Route browser đã chạy trên TOSE cloud. Bản tự host chỉ phục vụ chúng khi đặt `BROWSER_ENABLED=true`.
Các route Site API map bên dưới đã bật trên TOSE cloud, mỗi workspace cần admin thiết lập; xem
[những gì đã có](/vi/guide/agent-browser#status).
:::

Endpoint REST cho phiên [agent browser](/vi/guide/agent-browser). Mọi đường dẫn tính từ workspace:

```
https://api-v2.tose.sh/api/workspaces/{workspace_slug}
```

Xác thực bằng API key trong header `X-API-Key` (xem [Xác thực](/vi/api/authentication)). Credential
của workspace cần đồng ý rõ ràng `browser:read` để đọc và `browser:control` để điều khiển phiên;
`browsers:read` và `browsers:write` vẫn được nhận như bí danh. Phiên ngoài workspace của bên gọi trả
`404`.

## Phiên

| Method | Đường dẫn | Phản hồi |
|--------|------|----------|
| `POST` | `/browsers` | `202` phiên, hoặc `200` phiên cũ khi lặp lại cùng `Idempotency-Key` |
| `GET` | `/browsers` | `200` danh sách phiên |
| `GET` | `/browsers/{browser_id}` | `200` phiên |
| `DELETE` | `/browsers/{browser_id}` | `202` đã nhận yêu cầu kết thúc |
| `POST` | `/browsers/{browser_id}/suspend` | `202` (xóa pod) |
| `POST` | `/browsers/{browser_id}/resume` | `202` (mở pod mới) |
| `GET` | `/browsers/{browser_id}/events?limit=` | `200` sự kiện audit về vòng đời, lease và thao tác |

Body khi tạo:

```json
{"name": "web", "server_id": "<server-id>", "cpu": "1", "ram": "2Gi"}
```

`name` (bắt buộc) gồm 1 tới 40 chữ thường, chữ số hoặc dấu gạch ngang; `cpu` và `ram` là quantity
của Kubernetes. Tạo và chạy lại trả `402` khi ví trống và `429` khi workspace chạm trần số phiên đồng
thời.

## Lease

| Method | Đường dẫn | Phản hồi |
|--------|------|----------|
| `POST` | `/browsers/{browser_id}/leases` | `201` lease, token dùng một lần và thông tin luồng quan sát |
| `GET` | `/browsers/{browser_id}/leases` | `200` danh sách lease, không kèm token |
| `DELETE` | `/browsers/{browser_id}/leases/{lease_id}` | `204` đã thu hồi; lease cũ hơn bị chặn |
| `POST` | `/browsers/{browser_id}/heartbeat` | `200` lease được gia hạn trong mức tuổi tối đa (header `X-Browser-Lease`) |

Body lease: `controller` (`human` hoặc `agent`; mặc định `human` cho người đã đăng nhập và `agent`
cho API key), `scopes` (`observe`, `act`) và `takeover`. Credential chỉ giữ được lease agent. Xem
[Lease](/vi/guide/agent-browser#leases).

## Thao tác

`POST /browsers/{browser_id}/actions` với token lease trong `X-Browser-Lease`.

| Trường | Dùng cho |
|---|---|
| `type` | `navigate`, `snapshot`, `click`, `fill`, `press`, `screenshot`, `extract`, `wait`, `tab`, `fetch` |
| `url` | `navigate`; với `fetch` là URL chuẩn của endpoint đã bật |
| `locator` | đúng một trong `css`, `role`, `text`, `label`; tùy chọn `name`, `exact`, `nth` |
| `value` | `fill` |
| `key` | `press` |
| `kind`, `attr`, `all` | `extract` (`text`, `attr`, `value`) |
| `until`, `text` | `wait` (`load`, `visible`, `hidden`, `url_contains`, `text`, `delay`) |
| `full_page` | `screenshot` |
| `tab`, `tab_id` | `tab` (`list`, `new`, `close`, `switch`) |
| `timeout_ms` | mọi thao tác, 0 tới 30000 |
| `interactive_only`, `format`, `return_snapshot` | định dạng snapshot; không thuộc phần được phê duyệt |
| `approval` | token cho `click`, `fill` hoặc `press` do API key hay ứng dụng đã kết nối chạy |

```bash
curl -X POST "$TOSE_API/api/workspaces/acme/browsers/$BROWSER_ID/actions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "X-Browser-Lease: $LEASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "snapshot", "format": "compact"}'
```

Lỗi dùng khuôn chung `error`, `code`, `next_step`, `details`; xem [Lỗi](/vi/guide/agent-browser#errors).

## Phê duyệt

`POST /browsers/{browser_id}/approvals`, chỉ owner hoặc admin đã đăng nhập:

```json
{"lease_id": "<agent lease>", "action": {"type": "click", "locator": {"role": "button", "name": "Buy", "exact": true}},
 "origin": "https://shop.example.com", "ttl_seconds": 600}
```

`action` là đúng body mà agent sẽ gửi, không kèm `approval`. `ttl_seconds` mặc định 600, tối đa 900.
Phản hồi `{"approval": {id, token, executor, session_id, action, origin, expires_at}}` chỉ hiện token
một lần. API key và ứng dụng đã kết nối nhận `403 HUMAN_APPROVAL_REQUIRED`; lease của chính người đó
không cần phê duyệt (`400`).

## Site được phép

| Method | Đường dẫn | Ai |
|--------|------|-----|
| `GET` | `/browser-origins` | `browser:read`: công tắc và mọi origin |
| `POST` | `/browser-origins` `{origin}` | ai được điều khiển browser; ở trạng thái `pending` |
| `POST` | `/browser-origins/{origin_id}/confirm` | owner hoặc admin đã đăng nhập |
| `DELETE` | `/browser-origins/{origin_id}` | owner hoặc admin đã đăng nhập |
| `PUT` | `/browser-egress` `{allowlist_enabled}` | owner hoặc admin đã đăng nhập |

## Site API map

Chỉ có khi bật `BROWSER_API_MAP_ENABLED`, cờ này đã bật trên TOSE cloud; mỗi workspace cần admin thiết lập. Xem [Site API map](/vi/guide/agent-browser#site-api-map).

| Method | Đường dẫn | Ai |
|--------|------|-----|
| `GET` | `/browser-api-endpoints?origin=` | `browser:read`: endpoint chưa hết hạn |
| `GET` | `/browser-api-endpoints?url=<url>` | `browser:read`: endpoint `GET` đã biết của origin đó, mẫu khớp đứng đầu |
| `POST` | `/browser-api-endpoints/{endpoint_id}/enable` | owner hoặc admin đã đăng nhập |
| `POST` | `/browser-api-endpoints/{endpoint_id}/disable` | owner hoặc admin đã đăng nhập |

Lỗi của `fetch`: `FETCH_METHOD_NOT_ALLOWED` (400), `API_ENDPOINT_NOT_ENABLED` (403),
`FETCH_URL_NOT_CANONICAL` (400 hoặc 403), `FETCH_CROSS_ORIGIN` (403), `fetch_failed` (422).
