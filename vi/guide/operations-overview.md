# Vận hành trên nhiều workspace

Trang **Operations** (`/operations`, mục **Platform** ở thanh bên) hiển thị mọi workspace bạn là thành viên trong một bảng, để bạn biết nên xem chỗ nào trước khi quản lý nhiều workspace.

## Trang hiển thị gì

Với mỗi workspace:

- vai trò của bạn;
- các dự án chưa bị lưu trữ hay xóa, đếm theo trạng thái của deployment mới nhất: đang chạy, thất bại, đang xử lý (pending, cloning, building, pushing hoặc deploying), đã dừng, chưa deploy và khác (ví dụ đã rollback);
- các ứng dụng (template) đã cài và chưa xóa, đếm theo trạng thái;
- sự cố đang mở, kèm mức nghiêm trọng cao nhất;
- `health`.

Workspace cần chú ý được xếp trước (sự cố đang mở theo mức nghiêm trọng, rồi deployment hoặc ứng dụng thất bại). Mỗi dòng liên kết tới Overview, Projects và Apps của workspace và, khi có sự cố đang mở, tới các sự cố đó.

::: info Ở đây health không bao giờ là "healthy"
`health` là `degraded` khi workspace có sự cố đang mở, còn lại là `unknown`. Bản tóm tắt không đọc kiểm tra uptime, nên `unknown` nghĩa là không có sự cố đang mở và không có bằng chứng uptime trong màn hình này, không phải "mọi thứ ổn". Hãy mở Overview của workspace để thấy trạng thái healthy. Số liệu thanh toán, ví và dự báo không nằm trong bản tóm tắt.
:::

Mọi số đếm lấy từ một ảnh chụp chỉ đọc tại `observed_at`. Tối đa 100 workspace được liệt kê, xếp theo tên; khi bạn thuộc nhiều hơn, phản hồi có `"truncated": true` và trang cũng nói rõ.

## API

```http
GET /api/operations/summary
```

- Người đã đăng nhập thấy đúng các workspace họ đang là thành viên.
- API key cần scope `deployments:read` (thiếu thì nhận `insufficient_scope`) và chỉ thấy workspace của chính nó, không thấy gì nếu người dùng của key đã rời workspace.
- Phản hồi chỉ gồm tên, slug, vai trò và số đếm, không bao giờ có bí mật.

Xem `getOperationsSummary` trong [hợp đồng OpenAPI](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) và [API keys](/vi/api/api-keys) về scope.
