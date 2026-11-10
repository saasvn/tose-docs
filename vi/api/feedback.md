# Feedback API

Gửi báo lỗi hoặc đề xuất tính năng tới đội TOSE từ script, agent hay công cụ của bạn mà không cần tài khoản hay token GitHub. Báo cáo được kiểm tra, che dữ liệu nhạy cảm, định tuyến tới đúng repository của TOSE rồi đăng thành một GitHub issue.

::: warning Khả dụng
Không phải deployment nào cũng bật kênh nhận phản hồi. Khi tắt, `/api/feedback` không tồn tại và trả về `404`.
:::

## Gửi báo cáo

```http
POST /api/feedback
```

| Header | Ý nghĩa |
|--------|---------|
| `X-API-Key` hoặc `Authorization: Bearer` | [API key của workspace](/vi/api/api-keys) hoặc session token. Cần scope `workspace:write`, vì báo cáo sẽ trở thành issue công khai. |
| `Idempotency-Key` | Tùy chọn. Giống trường `idempotency_key`. |

```bash
curl -X POST https://api.tose.sh/api/feedback \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug",
    "component": "deployments",
    "title": "Deploy kẹt ở trạng thái building",
    "description": "Build xong nhưng deployment không thoát khỏi building.",
    "reproduction_steps": "1. tose deploy\n2. Chờ 10 phút",
    "correlation_id": "req_123",
    "include_diagnostics": true,
    "environment": { "client": "tose-cli", "client_version": "1.4.0", "os": "linux" },
    "error_codes": ["deployment_failed"],
    "idempotency_key": "build-stuck-2026-11-04"
  }'
```

### Body

| Trường | Bắt buộc | Ý nghĩa |
|--------|----------|---------|
| `type` | Có | `bug`, `feature`, `ux`, `docs` hoặc `billing`. |
| `component` | Có | Phần của TOSE mà báo cáo nói tới. Nó quyết định repository nào nhận báo cáo: `api`, `dashboard`, `mcp`, `auth`, `deployments`, `builds`, `domains`, `databases`, `logs`, `billing`, `desktop`, `github`, `cli`, `web`, `docs` hoặc `other`. |
| `title` | Có | Tối đa 200 ký tự. |
| `description` | Có | Tối đa 8000 ký tự. |
| `reproduction_steps` | Không | Tối đa 4000 ký tự. |
| `correlation_id` | Không | `request_id` của lệnh gọi bị lỗi (tối đa 128 ký tự), để người bảo trì tra cứu. |
| `include_diagnostics` | Không | Đặt `true` để đăng `environment` và `error_codes` trong issue. Không có nó, hai trường này bị bỏ qua. |
| `environment` | Không | Chỉ khi có `include_diagnostics`. Chuỗi thường tối đa 64 ký tự: `client`, `client_version`, `os`, `arch`, `api_version`. |
| `error_codes` | Không | Chỉ khi có `include_diagnostics`. Tối đa 10 mã máy, ví dụ `deployment_failed`. |
| `idempotency_key` | Không | Tối đa 128 ký tự. Xem [Gửi lại](#gui-lai). |
| `workspace` | Không | Chỉ với session: slug của một workspace bạn thuộc về. API key luôn gắn với workspace của chính nó. |

Bạn không chọn được repository, user hay ID workspace. Chúng được suy ra từ `component` và từ credential. Trường không có trong bảng bị từ chối với `400`, và không nhận tệp đính kèm. Body tối đa 64 KiB (vượt thì `413`). Trường có mặt nhưng không hợp lệ trả về `422`, với `details.field` chỉ ra trường đó.

### Phản hồi

Báo cáo được lưu trước và đăng sau, nên báo cáo mới trả về `202`.

```json
{
  "id": "fb_01HXEXAMPLE",
  "status": "triaged",
  "type": "bug",
  "component": "deployments",
  "title": "Deploy kẹt ở trạng thái building",
  "correlation_id": "req_123",
  "held_for_review": false,
  "created_at": "2026-11-04T04:40:00Z",
  "updated_at": "2026-11-04T04:40:00Z"
}
```

`issue_url` chỉ được thêm sau khi GitHub xác nhận issue đã tạo. Nó không bao giờ là giá trị đoán trước, nên hãy đọc lại báo cáo cho tới khi nó xuất hiện.

## Đọc báo cáo

```http
GET /api/feedback/{id}
```

Cần `workspace:read`. Chỉ người đã gửi báo cáo đọc được. Người khác, kể cả API key của workspace khác, nhận `404`. Phản hồi có cùng dạng như trên.

## Liệt kê báo cáo trong workspace {#liet-ke-bao-cao-trong-workspace}

```http
GET /api/workspaces/{slug}/feedback
```

Trả về các báo cáo bạn đã gửi trong workspace, mới nhất trước, mỗi báo cáo kèm lịch sử trạng thái. Cần là thành viên workspace và, với API key, scope `workspace:read`; API key chỉ thấy workspace của chính nó. Báo cáo là riêng tư với người gửi: báo cáo của đồng đội không bao giờ được liệt kê, và người không phải thành viên nhận `404`. Tham số `limit` tùy chọn từ 1 đến 100 (mặc định 100). Route chỉ tồn tại khi feedback được bật. Trang dashboard dùng route này được mô tả ở [Báo vấn đề ngay từ dashboard](/vi/guide/dashboard-feedback).

## Trạng thái {#trang-thai}

| `status` | Ý nghĩa |
|----------|---------|
| `received` | Đã lưu và đang chờ duyệt (`held_for_review: true`). Chỉ được đăng sau khi quản trị viên TOSE duyệt. |
| `triaged` | Đã định tuyến tới một repository và đang chờ đăng. |
| `duplicate` | Đã gộp với báo cáo hoặc issue có sẵn về cùng vấn đề. |
| `published` | GitHub issue đã tồn tại. Có `issue_url`. |
| `publication_failed` | GitHub từ chối hoặc không truy cập được. TOSE tiếp tục thử lại, và không hiện `issue_url`. |
| `rejected` | Quản trị viên TOSE đã từ chối báo cáo. Nó không bao giờ được đăng. |

## Báo cáo được xử lý thế nào

1. **Che dữ liệu nhạy cảm.** API key, bearer token, dòng dotenv, URL có credential, cookie, email, số điện thoại và số thẻ bị loại bỏ trước khi lưu hay gửi tới GitHub. Áp dụng cho tiêu đề, mô tả, các bước, chẩn đoán và correlation ID.
2. **Định tuyến.** `component` chọn một repository của TOSE. Nội dung báo cáo không thể chỉ sang repository khác.
3. **Duyệt.** Báo cáo chờ quản trị viên TOSE duyệt hoặc từ chối khi nó đã phải che dữ liệu, khi `type` là `billing` hoặc khi `component` là `other`.
4. **Chống trùng.** Các báo cáo cùng vấn đề trong cùng repository dùng chung một GitHub issue, và mỗi báo cáo vẫn giữ `id` riêng. Báo cáo về vấn đề mà issue đã đóng sẽ được liên kết với luồng cũ, không mở issue mới.
5. **Đăng.** Một worker nền tạo issue. Nội dung của bạn nằm trong khối trích dẫn có ghi chú là văn bản người dùng chưa xác minh, nên liên kết và mention trong đó không có tác dụng. Issue được gắn nhãn theo loại và không bao giờ giao cho agent tự động.

## Gửi lại {#gui-lai}

Gửi `idempotency_key` (trong body hoặc header `Idempotency-Key`) để gửi lại không tạo trùng báo cáo. Lần gửi lại của cùng user trả về báo cáo đầu tiên với status `200` và header `Idempotent-Replay: true`. Key chỉ có hiệu lực trong workspace của credential.

## Giới hạn

| Giới hạn | Giá trị |
|----------|---------|
| Báo cáo mỗi user | 20 mỗi giờ |
| Báo cáo mỗi workspace | 60 mỗi giờ |
| Kích thước request | 64 KiB |

Vượt giới hạn, API trả về `429`. Xem [Mã lỗi](/vi/api/errors) cho định dạng lỗi chung.

## Lỗi

| Status | Ý nghĩa |
|--------|---------|
| `400` | Body không phải JSON hợp lệ, hoặc có trường không được chấp nhận. |
| `401` | Thiếu hoặc sai credential. |
| `403` | Credential thiếu `workspace:write` (hoặc `workspace:read` khi đọc), hoặc vai trò quá thấp. |
| `404` | Deployment này chưa bật feedback, hoặc báo cáo không phải của bạn. |
| `413` | Body lớn hơn 64 KiB. |
| `422` | Một trường không hợp lệ. `details.field` chỉ ra trường đó. |
| `429` | Đã chạm giới hạn tốc độ. |
| `503` | Dịch vụ tạm thời không khả dụng. Gửi lại với cùng `idempotency_key`. |
