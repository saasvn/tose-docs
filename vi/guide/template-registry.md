# Template registry và manifest `tose.yaml`

Template registry lưu các template deploy có phiên bản, được mô tả bằng manifest `tose.yaml`. Trang này giải thích định dạng manifest, những gì dùng được hiện nay và những gì chưa có.

::: warning Truy cập sớm: chỉ có bản nháp riêng tư
Mới chỉ có phần nền tảng được phát hành (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). Bạn có thể tạo, sửa và validate template **bản nháp riêng tư** trong workspace của mình qua [API registry](/vi/api/template-registry). Mọi thứ không nằm ở mục "Tình trạng" bên dưới là chưa bật, và trang này không mô tả chúng như đã có.
:::

## Tình trạng {#tinh-trang}

| Khả năng | Trạng thái |
|----------|------------|
| Định dạng manifest `tose.dev/v1` và validate nghiêm ngặt | Có |
| Definition và version bản nháp riêng tư trong workspace (REST) | Có |
| Lưu lượt validate cho từng version | Có. Manifest hợp lệ vẫn trả `security_gate: pending` |
| Xuất bản công khai, review để public, deprecate và revoke | Chưa có. Chế độ public giữ tắt cho đến khi security gate đạt |
| Thư mục template (tìm kiếm, lọc, sắp xếp) | Chưa có |
| Plan deploy, chi phí và blocker cho template trong registry | Chưa có |
| CLI `tose templates ...` | Chưa có |
| Công cụ MCP cho registry | Chưa có |

Template 1-click có sẵn (GoClaw, Dewee) không bị registry thay đổi. Chúng giữ nguyên [catalog, deploy và billing riêng](/vi/guide/dewee-template). Bản cài không đến từ registry không gắn với template version nào và được coi là bản cài legacy.

## Manifest

Manifest là một tài liệu YAML, tối đa 64 KiB.

```yaml
apiVersion: tose.dev/v1
metadata:
  name: sample
  version: 1.0.0
  description: Sample app
  category: productivity
  tags: [ai]
  license: MIT
source:
  git:
    url: https://github.com/example/sample
    commit: 0123456789abcdef0123456789abcdef01234567
services:
  - name: web
    port: 3000
    cpu: "1"
    memory: 1Gi
    variables:
      - name: API_TOKEN
        secret: true
        required: true
    storage:
      - mountPath: /data
        size: 1Gi
```

### Các trường

| Trường | Quy tắc |
|--------|---------|
| `apiVersion` | Phải là `tose.dev/v1`. Giá trị khác bị từ chối. |
| `metadata.name` | Slug chữ thường kiểu DNS (`a-z`, `0-9`, `-`, tối đa 63 ký tự). Trở thành slug của definition và không đổi được về sau. |
| `metadata.version` | Semantic version, ví dụ `1.0.0` hoặc `1.2.0-rc.1`. |
| `metadata.description` | Bắt buộc, không để trống. |
| `metadata.category` | Slug chữ thường. Dùng cho bộ lọc `category` khi liệt kê. |
| `metadata.tags` | Tùy chọn, tối đa 20, mỗi tag là slug chữ thường. |
| `metadata.license` | Bắt buộc, không để trống. |
| `source` | Đúng một trong `git` hoặc `oci`. |
| `source.git.url` | URL công khai `https://github.com/<owner>/<repo>`: không có thông tin đăng nhập, query, fragment hay cổng khác. |
| `source.git.commit` | Git SHA đầy đủ 40 ký tự chữ thường. Branch và tag bị từ chối, nên mỗi version luôn trỏ đến cùng một mã nguồn. |
| `source.oci.image` | Tham chiếu image được ghim bằng `@sha256:<64 ký tự hex thường>`. Tag bị từ chối. |
| `services` | Đúng một service. Template nhiều service chưa được hỗ trợ. |
| `services[].name` | Slug chữ thường. |
| `services[].port` | Cổng TCP 1-65535. |
| `services[].cpu`, `services[].memory` | Số lượng Kubernetes dương, ví dụ `"1"`, `500m`, `1Gi`. Đặt `cpu` trong dấu nháy để YAML đọc là chuỗi. |
| `services[].variables[]` | `name` (chữ hoa, chữ số, `_`; duy nhất trong service), cờ `secret` và `required`. Manifest chỉ khai báo **tên** biến, không bao giờ chứa giá trị. |
| `services[].storage[]` | `mountPath` (đường dẫn tuyệt đối, khác `/`, đã chuẩn hóa, không có `..`) và `size` (số lượng storage Kubernetes dương). |

Parser từ chối key lạ, alias YAML và nhiều hơn một tài liệu YAML. Việc parse không bao giờ tải mã nguồn của bạn và không deploy gì cả.

### Version bất biến sau khi xuất bản

Mỗi cặp `(definition, version)` là duy nhất. **Bản nháp** có thể được thay thế khi `metadata.name` và `metadata.version` giữ nguyên. Version đã rời trạng thái `draft` không sửa được: hãy xuất bản số version mới. Vì `source` được ghim vào commit hoặc digest, mỗi version mô tả đúng một đầu vào build.

Registry lưu các trạng thái version `draft`, `validating`, `review`, `published`, `deprecated` và `revoked`. Hiện API chỉ tạo version ở trạng thái `draft`; các trạng thái còn lại dành cho luồng xuất bản chưa có.

### Lỗi validate

Lỗi kèm đường dẫn trường để bạn sửa mà không phải đoán:

```json
{
  "errors": [
    { "path": "source.git.commit", "message": "use a full 40-character lowercase Git SHA" },
    { "path": "services[0].port", "message": "use a TCP port from 1 to 65535" }
  ]
}
```

Thông điệp lỗi do API trả về bằng tiếng Anh.

## Quy trình tác giả (dùng được hiện nay)

1. Viết `tose.yaml` ở máy, với commit hoặc image digest đã ghim.
2. `POST /api/workspaces/{slug}/template-definitions` kèm manifest. Việc này tạo definition **riêng tư** và version **nháp** đầu tiên.
3. Sửa các lỗi `422` và thay bản nháp bằng `PUT .../versions/{version}`.
4. Thêm version mới bằng `POST .../versions` khi mã nguồn đổi.
5. Gọi `POST .../validate` để ghi một lượt validate cho version mới nhất.

Chi tiết, scope và ví dụ nằm ở [tham chiếu API registry](/vi/api/template-registry).

## Bảo mật và độ tin cậy

- Definition là **riêng tư** với workspace tạo ra nó. Workspace khác không liệt kê hay đọc được.
- Validate chỉ kiểm tra cú pháp manifest và định dạng ghim. Nó không quét hay build mã nguồn. Phản hồi luôn ghi `security_gate: pending` kể cả khi manifest hợp lệ, và manifest không đáng tin sẽ không được đưa cho builder cho đến khi có và đạt một security gate riêng.
- Ghim vào commit hoặc digest bảo vệ người dùng khỏi nguồn bị đổi sau khi review. Nó không chứng minh mã nguồn an toàn.
- Không đặt giá trị bí mật trong manifest. Hãy khai báo tên biến với `secret: true`; người deploy sẽ cung cấp giá trị.
- Publisher đã xác minh, template version đã xác minh, chính sách review công khai, báo cáo và gỡ bỏ sẽ được tài liệu hóa khi xuất bản công khai ra mắt.

## Giá

Compute và storage được trừ từ ví. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing). Registry không tính thêm phí riêng.

## Bước tiếp theo

- [Tham chiếu API registry](/vi/api/template-registry)
- [Runbook template Dewee](/vi/guide/dewee-template) cho đường 1-click có sẵn
- [API key và scope](/vi/api/api-keys)
