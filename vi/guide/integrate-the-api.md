---
title: "Tích hợp REST API của TOSE"
description: "Gọi REST API của TOSE từ script hoặc dịch vụ: lấy spec OpenAPI, xác thực bằng API key, bắt đầu deployment và theo dõi đến khi chạy."
---

# Tích hợp qua REST API

Dùng REST API của TOSE từ script hoặc dịch vụ: đọc hợp đồng API, xác thực, bắt đầu deployment và kiểm tra kết quả.

## Điều kiện cần

- API key của workspace (bắt đầu bằng `tose_sk_`). Tạo trong dashboard ở **Settings → API Keys**; xem [API key & Scope](/vi/api/api-keys).
- Slug của workspace và project, và một project đã kết nối Git và có server.
- `curl` hoặc bất kỳ HTTP client nào.

## Đầu vào

| Giá trị | Giá trị dùng |
|---------|--------------|
| Base URL | `https://api.tose.sh` |
| Hợp đồng | `https://api.tose.sh/api/openapi.yaml` (OpenAPI 3.1, công khai) |
| Thông tin xác thực | Header `X-API-Key: <key>`. Không bao giờ đặt trong URL |

## Các bước

1. Tải hợp đồng về và dùng nó làm tham chiếu cho đường dẫn, tham số và schema:

   ```bash
   curl -sS https://api.tose.sh/api/openapi.yaml -o tose-openapi.yaml
   ```

2. Giữ key trong biến môi trường và kiểm tra:

   ```bash
   export TOSE_API_KEY=tose_sk_xxxxxxxxxxxx
   curl -sS https://api.tose.sh/api/workspaces -H "X-API-Key: $TOSE_API_KEY"
   ```

3. Bắt đầu deployment từ commit mới nhất của nhánh đã kết nối (`deployProject`):

   ```bash
   curl -sS -X POST \
     https://api.tose.sh/api/workspaces/my-workspace/projects/my-app/deploy \
     -H "X-API-Key: $TOSE_API_KEY"
   ```

   Kết quả là `201` cùng deployment mới ở trạng thái `pending`. Ghi lại `id` của nó.

4. Hỏi trạng thái deployment (`getDeployment`) đến khi kết thúc:

   ```bash
   curl -sS \
     https://api.tose.sh/api/workspaces/my-workspace/projects/my-app/deployments/DEPLOYMENT_ID \
     -H "X-API-Key: $TOSE_API_KEY"
   ```

## Kết quả mong đợi

Trạng thái chuyển `pending` → `building` → `deploying` và kết thúc ở `running`, hoặc `failed` hay `stopped`. Log build ở `GET .../deployments/{id}/logs`.

## Kiểm tra

- `GET .../projects/{project_slug}/status` hiện project và các pod.
- `GET .../projects/{project_slug}/deployments` liệt kê deployment, mới nhất trước.
- Mọi response có header `X-Request-ID`; giữ lại khi cần liên hệ hỗ trợ.

## Quyền và bảo mật

- Một key thuộc về một workspace. Deploy cần vai trò owner hoặc admin, và với key có scope thì cần `deployments:execute`.
- Request đặt key trong query string bị từ chối với `credentials_in_url`. Hãy gửi trong header.
- Cấp cho tự động hóa một key có scope, lưu như secret và xoay vòng định kỳ; xem [Khuyến nghị](/vi/api/api-keys#khuyến-nghị).
- Thay đổi thực hiện bằng key được ghi vào [audit log](/vi/api/audit).

## Thử lại an toàn

`POST .../deploy` **không idempotent**: mỗi lần gọi tạo một deployment mới và xếp thêm một build. Trước khi thử lại một deploy mà bạn không nhận được phản hồi, hãy gọi `GET .../deployments` và tìm deployment mà lần gọi đầu có thể đã tạo. Các endpoint nhận header `Idempotency-Key`, như `deploy-image`, được ghi trong hợp đồng.

## Lỗi thường gặp

Mọi lỗi có cùng một envelope JSON với `code` ổn định. Rẽ nhánh theo `code`, không theo nội dung thông báo.

| Status | `code` | Cách xử lý |
|--------|--------|------------|
| 401 | `unauthenticated` | Thiếu key hoặc key sai. |
| 402 | `payment_required` | Nạp thêm tiền vào ví workspace. |
| 403 | `forbidden`, `insufficient_scope` | Vai trò hoặc scope của key không đủ. |
| 404 | `not_found` | Kiểm tra slug của workspace và project. |
| 409 | `conflict` | Ví dụ đang có deployment chạy; chờ rồi kiểm tra. |

Tất cả mã: [Mã lỗi](/vi/api/errors).

## Bước tiếp theo

- [Sinh client có kiểu](/vi/api/reference#sinh-client)
- [Xác thực](/vi/api/authentication)
- Để AI agent làm việc này với bước phê duyệt: [Kết nối AI agent](/vi/guide/connect-an-agent)
