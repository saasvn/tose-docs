# Tài liệu REST API

TOSE API được mô tả bằng một hợp đồng OpenAPI 3.1 có đánh phiên bản. API tự phục vụ file này,
đồng thời TOSE CLI và MCP connector đều đối chiếu với cùng một file. Trang này
không liệt kê endpoint bằng tay, vì bản chép tay sẽ lệch khỏi router. Hãy đọc spec.

## Spec OpenAPI

```
https://api.tose.sh/api/openapi.yaml
```

Spec công khai, không cần credential và được cache 5 phút. Spec bao gồm workspace, project,
deployment, log, biến môi trường, domain, database và ví. Một contract test trong repo API sẽ fail
khi có operation được ghi trong spec mà chưa có route, nên mọi operation trong spec đều tồn tại.
File nguồn là
[`internal/apispec/openapi.yaml`](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
trong `saasvn/tose-app`.

```bash
curl -sS https://api.tose.sh/api/openapi.yaml -o tose-openapi.yaml
```

Mở file bằng bất kỳ trình xem OpenAPI nào (Swagger UI, Redoc, Scalar, Postman hoặc Insomnia) để
duyệt operation, schema và ví dụ.

## Sinh client

Mọi bộ sinh code hỗ trợ OpenAPI 3.1 đều dùng được. Trỏ nó tới URL spec hoặc bản đã tải về.

```bash
# Kiểu TypeScript
npx openapi-typescript https://api.tose.sh/api/openapi.yaml -o tose-api.d.ts

# Client đầy đủ cho ngôn ngữ khác
npx @openapitools/openapi-generator-cli generate \
  -i https://api.tose.sh/api/openapi.yaml \
  -g python -o ./tose-client
```

Hãy ghi lại phiên bản spec (`info.version`) mà client được sinh ra và sinh lại khi nó đổi. Thay
đổi phá vỡ hợp đồng sẽ tăng `info.version`.

## Xác thực

Mỗi request gửi đúng một credential, trong header hoặc cookie. API không bao giờ nhận credential
trong URL.

```http
X-API-Key: tose_sk_your_api_key_here
```

Xem [Xác thực](/vi/api/authentication) về API key, session token và quy tắc về URL.

## Lỗi

Mọi lỗi JSON đều có cùng một envelope với `code` ổn định. Hãy xử lý theo `code`, đừng dựa vào nội
dung `message`. Xem [Mã lỗi](/vi/api/errors) để có danh sách đầy đủ, gồm cả mã lỗi của các tool MCP.

## Request ID

Mọi response có header `X-Request-ID`. Gửi ID của bạn để server trả lại nguyên giá trị. Body lỗi
lặp lại ID trong `request_id`. Hãy cung cấp ID này khi liên hệ hỗ trợ.

## Phân trang

Các list endpoint có phân trang nhận `page` (bắt đầu từ 1) và `limit`, response lặp lại `page`,
`limit` và `total`. Giá trị ngoài phạm vi sẽ dùng mặc định. Truy vấn log của project phân trang
bằng `cursor`. Spec ghi rõ endpoint nào có phân trang.

## Tác vụ bất đồng bộ

`POST .../deploy` chỉ xếp hàng một lần build và trả về deployment ở trạng thái `pending`. Hãy poll
deployment đến khi nó là `running`, `failed` hoặc `stopped`. Không endpoint nào nhận idempotency
key, nên gọi lại deploy sẽ tạo thêm một deployment. Hãy kiểm tra danh sách deployment trước khi
thử lại.

## Dừng triển khai

```http
POST /api/workspaces/:slug/projects/:projectSlug/deployments/:id/stop
```

Yêu cầu vai trò owner hoặc admin. Trạng thái khác `pending`, `cloning`, `building`, `pushing`, `deploying` hoặc `running` trả về `400`. Phản hồi là triển khai với trạng thái `stopped`.

**Dừng một triển khai `running` sẽ dừng toàn bộ dự án.** Trong một lần ghi có khoá, TOSE đánh dấu `stopped` cho:

- mọi triển khai của dự án đang `running` hoặc `deploying`, và
- mọi triển khai của dự án còn ở trước bước deploy (`pending`, `cloning`, `building` hoặc `pushing`).

Ứng dụng được scale về 0 replica và giữ nguyên cho đến khi bạn deploy lại. Chỉ các triển khai được tạo trước khi Stop bắt đầu bị ảnh hưởng. Deploy được yêu cầu sau Stop vẫn build và phát hành bình thường. Bản build bị dừng không có deploy, không gửi email và không có sự kiện thành công hay thất bại. Redeploy sau đó không bao giờ chọn image của rollout đã bị huỷ.

**Dừng một triển khai `deploying` hoàn tất bất đồng bộ.** Pipeline build huỷ rollout rồi khôi phục phiên bản phục vụ gần nhất, nếu có. Nếu không có, workload được scale về 0. Nếu image của chính triển khai đó vẫn đang phục vụ, bản ghi kết thúc ở `running` kèm lý do trong `error_message`. Hãy đọc lại triển khai bằng `GET` sau khi Stop thay vì tin vào trạng thái trong phản hồi.

**Phản hồi:**

```json
{
  "id": "dep_xyz789",
  "status": "stopped"
}
```

**Lỗi:**

| Trạng thái | Ý nghĩa |
|--------|---------|
| `400` | Triển khai không ở trạng thái có thể dừng |
| `502` | Cụm không đưa ứng dụng về 0 replica nên chưa có gì được ghi là `stopped`. Message là `Failed to stop deployment. See the server log for details.` và không bao giờ chứa lỗi của cụm. Hãy thử lại |
| `503` | Chưa có gì bị dừng: không lấy được khoá workload của dự án trong 60 giây vì một bước deploy đang kết thúc, hoặc không kết nối được cơ sở dữ liệu. Phản hồi có header `Retry-After` |

Stop phản hồi trong khoảng 100 giây. Khi gặp `503`, chờ số giây trong `Retry-After` rồi gửi lại yêu cầu. Việc thử lại là an toàn vì chưa có gì bị dừng.

## Tài liệu liên quan

- [Xác thực](/vi/api/authentication)
- [Mã lỗi](/vi/api/errors)
- [Ổ đĩa, Volume & Bảng giá](/vi/api/disks)
- [Tự host](/vi/guide/self-hosting)
