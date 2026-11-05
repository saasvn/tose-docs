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
| Cài từ registry (build và chạy) | Bị chặn (gated). [Security gate](#install-security-gate-gated) fail-closed; tắt trừ khi operator bật community template (mặc định tắt) |
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
- Các kiểm tra khi cài đặt (credential push có phạm vi hẹp, quét digest kèm SBOM, source được ghim và pod đã hardening) được mô tả ở [Security gate khi cài đặt](#install-security-gate-gated).
- Validate chỉ kiểm tra cú pháp manifest và định dạng ghim. Nó không quét hay build mã nguồn. Phản hồi luôn ghi `security_gate: pending` kể cả khi manifest hợp lệ, và manifest không đáng tin sẽ không được đưa cho builder cho đến khi có và đạt một security gate riêng.
- Ghim vào commit hoặc digest bảo vệ người dùng khỏi nguồn bị đổi sau khi review. Nó không chứng minh mã nguồn an toàn.
- Không đặt giá trị bí mật trong manifest. Hãy khai báo tên biến với `secret: true`; người deploy sẽ cung cấp giá trị.
- Publisher đã xác minh, template version đã xác minh, chính sách review công khai, báo cáo và gỡ bỏ sẽ được tài liệu hóa khi xuất bản công khai ra mắt.

## Security gate khi cài đặt (đang bị chặn) {#install-security-gate-gated}

Việc cài template từ registry đang ở trạng thái **gated**. Nền tảng từ chối build hoặc chạy một version registry trừ khi mọi kiểm tra dưới đây đều đạt, và một thiết lập còn thiếu được tính là kiểm tra không đạt, không bao giờ là bỏ qua. Cờ bật community template (`COMMUNITY_TEMPLATES_ENABLED`) mặc định là `false`, nên trên nền tảng mà operator chưa bật thì không có lượt cài registry nào chạy, bất kể manifest ghi gì. Các kiểm tra này đã được phát hành trong tose-app [#484](https://github.com/saasvn/tose-app/pull/484). Các kiểm tra phát hành trực tiếp trên host đã hardening và cluster thật vẫn còn mở ở [#142](https://github.com/saasvn/tose-app/issues/142), vì vậy tính năng vẫn bị chặn.

Một lượt cài phải vượt qua:

- **Build từ source (`source.git`).** Build chạy trong sandbox đã hardening và chỉ push image bằng credential ngắn hạn được cấp riêng cho đúng lần push đó. Credential registry của nền tảng không bao giờ được dùng cho build không đáng tin. Commit được ghim phải nằm trên default branch của repository hoặc trên một tag của nó, nên commit chỉ tồn tại trong một fork sẽ bị từ chối.
- **Mọi lượt cài từ registry, dù build hay ghim (`source.oci`).** Image được ghim bằng digest và được quét tại digest đó trước khi workload được áp dụng. Mỗi lần quét, dù bị từ chối hay được chấp nhận, đều được ghi lại; khi scanner tạo ra SBOM, SBOM được lưu kèm một provenance statement. Một phát hiện có mức nghiêm trọng bằng hoặc cao hơn mức đã cấu hình (mặc định `HIGH`) sẽ từ chối deploy.
- **Pod khi chạy.** Pod chạy bằng user không phải root (uid 1000) với root filesystem chỉ đọc, bỏ mọi capability, không leo thang đặc quyền, dùng seccomp profile mặc định và không có service account token. Pod chỉ ghi được vào storage bạn đã khai báo và `/tmp`, vì vậy hãy xuất bản image không ghi ở nơi nào khác. Pod yếu hơn mức này bị từ chối khi tạo và ở mọi lần redeploy.

### Lỗi fail-closed

Khi một kiểm tra không đạt, lượt cài bị từ chối và không có gì được deploy. Plan deploy hiển thị lý do dưới dạng blocker kèm mã. Khi build hoặc deploy bị từ chối lúc chạy, build log ghi lý do bằng lời thường ở dòng `ERROR: template security gate refused the build`.

| Mã | Ý nghĩa | Cần làm |
|----|---------|---------|
| `COMMUNITY_TEMPLATES_DISABLED` | Template registry đang tắt trên nền tảng này. | Bạn không làm gì được. Chỉ operator mới bật được. |
| `IMAGE_SCANNER_NOT_CONFIGURED` | Chưa cấu hình image scanner nên không quét được image. | Thiết lập của operator. Deploy vẫn bị từ chối cho đến khi có scanner. |
| `BUILD_SANDBOX_NOT_HARDENED` | Build host chưa có sandbox đã hardening nên build từ source bị từ chối. | Thiết lập của operator. Image `source.oci` đã ghim không được build nên không cần sandbox. |
| `PUSH_CREDENTIALS_NOT_SCOPED` | Chưa cấu hình bên cấp credential push ngắn hạn. | Thiết lập của operator. Build từ source vẫn bị từ chối cho đến khi có. |
| `SOURCE_REFUSED` | Source không chấp nhận được: URL không phải dạng `https://github.com/<owner>/<repo>` thuần, commit không phải SHA đầy đủ, hoặc image không được ghim dạng `name@sha256:<digest>`. | Sửa manifest và tạo version mới. |
| `NETWORK_POLICY_NOT_ENFORCED` | Một installation có network mode cần network policy mà cluster không thực thi được. | Thiết lập của operator. |
| `INGRESS_MODE_NOT_ENFORCED` | Không gỡ được ingress công khai còn sót lại của một installation riêng tư. | Thiết lập của operator. |

Phần lớn các lần từ chối khác không có mã và hiện thành một câu ngắn trong build log, ví dụ: quét image thấy lỗ hổng bằng hoặc vượt ngưỡng, scanner bị lỗi hoặc không tạo được SBOM, không cấp được credential push hoặc credential sống lâu hơn mức cho phép, hoặc commit được ghim không nằm trên default branch hay tag của repository. Khi GitHub không truy cập được hoặc giới hạn tốc độ việc kiểm tra commit, build cũng bị từ chối; hãy thử lại sau.

Operator cấu hình sandbox, bên cấp credential, scanner và ngưỡng mức nghiêm trọng trong [runbook bảo mật template](https://github.com/saasvn/tose-app/blob/master/docs/template-security-gate.md) của app. Trang đó là tài liệu tham chiếu cho các thiết lập chính xác; trang này không lặp lại chúng.

## Giá

Compute và storage được trừ từ ví. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing). Registry không tính thêm phí riêng.

## Bước tiếp theo

- [Tham chiếu API registry](/vi/api/template-registry)
- [Runbook template Dewee](/vi/guide/dewee-template) cho đường 1-click có sẵn
- [API key và scope](/vi/api/api-keys)
