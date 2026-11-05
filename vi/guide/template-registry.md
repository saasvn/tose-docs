# Template registry và manifest `tose.yaml`

Template registry lưu các template deploy có phiên bản, được mô tả bằng manifest `tose.yaml`. Trang này giải thích định dạng manifest, những gì dùng được hiện nay và những gì chưa có.

::: warning Truy cập sớm: chỉ có bản nháp riêng tư
Phần nền tảng của registry đã được phát hành (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). Bạn có thể tạo, sửa và validate template **bản nháp riêng tư** trong workspace của mình qua [API registry](/vi/api/template-registry). Xuất bản công khai, thư mục, CLI và MCP chưa bật, và trang này không mô tả chúng như đã có. [Mẫu agent tuyển chọn](#curated-agent-templates) đã được định nghĩa nhưng đang ẩn và bị chặn.
:::

## Tình trạng {#tinh-trang}

| Khả năng | Trạng thái |
|----------|------------|
| Định dạng manifest `tose.dev/v1` và validate nghiêm ngặt | Có |
| Definition và version bản nháp riêng tư trong workspace (REST) | Có |
| Lưu lượt validate cho từng version | Có. Manifest hợp lệ vẫn trả `security_gate: pending` |
| Xuất bản công khai, review để public, deprecate và revoke | Chưa có. Chế độ public giữ tắt cho đến khi security gate đạt |
| Thư mục template (tìm kiếm, lọc, sắp xếp) | Chưa có |
| Plan deploy, chi phí và blocker cho template trong registry | Đã có ở backend, chưa được tài liệu hóa ở đây ngoại trừ các mẫu tuyển chọn bên dưới |
| Mẫu Pi, Claude Code và Codex tuyển chọn: định nghĩa và hợp đồng plan | Đã định nghĩa, đang ẩn và bị chặn. Chưa ghim image đã rà soát nên mọi plan đều bị chặn |
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

## Mẫu agent tuyển chọn (đang ẩn và bị chặn) {#curated-agent-templates}

TOSE tự định nghĩa ba mẫu agent lập trình tuyển chọn: **Pi**, **Claude Code** và **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461), issue [#405](https://github.com/saasvn/tose-app/issues/405)). Chúng được lập kế hoạch qua cùng bộ planner triển khai như các version trong registry, không qua [catalog](/vi/guide/dewee-template) cũ.

::: warning Đang ẩn và chưa cài đặt được
Cả ba định nghĩa đều **bị ẩn**. TOSE chưa build và rà soát image nào được ghim bằng digest cho chúng, nên chưa có bản phát hành nào được liệt kê và mọi plan đều được lưu ở trạng thái `blocked`. Danh mục công khai, danh tính publisher, egress được thực thi, ingress riêng tư và gia cố pod agent (không token service account, không chạy root, hệ thống tệp gốc chỉ đọc) vẫn đang chờ. Không nội dung nào trên trang này có nghĩa là bạn chạy được agent hôm nay.
:::

### Một định nghĩa cố định những gì

| Phần | Quy tắc |
|------|---------|
| Khóa nhà cung cấp | **Chỉ dùng khóa của bạn (BYOK).** Một biến bí mật: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex) hoặc `PI_API_KEY` (Pi, kèm `PI_PROVIDER` là `anthropic`, `openai` hoặc `google`). Không hỗ trợ đăng nhập bằng gói thuê bao của nhà cung cấp. TOSE không tính phí sử dụng mô hình: nhà cung cấp tính trên khóa của bạn. |
| Mô hình | `AGENT_MODEL` tùy chọn, là tên mô hình của nhà cung cấp. Để trống thì agent dùng mặc định. |
| Cấu hình | Số nhân và GiB nguyên trong danh sách cho phép: Claude Code và Codex 1, 2 hoặc 4 nhân và 2, 4 hoặc 8 GiB; Pi 1 hoặc 2 nhân và 1, 2 hoặc 4 GiB. |
| Lưu trữ | Ổ đĩa bền vững gồm `/workspace` (5 GiB) và `/home/agent` (1 GiB), tính phí khi ổ đĩa còn tồn tại, kể cả khi đã dừng. |
| Mạng | Egress `approved` (chỉ máy chủ API của nhà cung cấp, mặc định; chưa được thực thi) hoặc `internet`. Không có `none`, vì agent không gọi được nhà cung cấp nếu không có egress. Ingress phải là `private`, nên bảng điều khiển của agent không có ý định công khai (chưa được thực thi: xem phần blocker). |
| Thiết lập | Chỉ `image_entrypoint`: entrypoint đã rà soát của image phát hành. Không có bước build, lệnh khởi động, hook, đối tượng Kubernetes hay `privileged`; trường lạ bị từ chối. |
| Bản phát hành | Mỗi bản ghim image OCI bằng digest `sha256` và ghi phiên bản upstream, ngày và liên kết https tới bằng chứng. Nhà phát hành (TOSE) được đặt một lần trên định nghĩa. Bản này được chuyển thành manifest `tose.dev/v1` thông thường và được kiểm tra theo các quy tắc ở trên. |

### Lập plan cho mẫu tuyển chọn

`POST /api/workspaces/{slug}/template-deployment-plans` nhận `curated_template` (`pi`, `claude-code` hoặc `codex`) **thay cho** `definition_slug`, cùng `network_mode`. `GET /api/workspaces/{slug}/curated-templates` liệt kê các trường nhập của biểu mẫu. Xem [tham chiếu API](/vi/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` là bắt buộc.** Đây là mức trần chi phí trả trước của bạn. Plan có chi phí giờ cao nhất (compute cộng storage, theo mức giá được kiểm tra cho plan) vượt mức này sẽ bị chặn với `COST_CEILING_EXCEEDED`; ví trống bị chặn với `INSUFFICIENT_BALANCE`. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing).
- **Khóa nhà cung cấp không bao giờ nằm trong plan.** Gửi trong `variables` sẽ nhận `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`, và lỗi không lặp lại giá trị. Khóa chỉ thuộc về `secrets` của yêu cầu cài đặt.
- Cấu hình phải nằm trong các mức được đưa ra. Đầu vào không hợp lệ trả `422` kèm đường dẫn trường.

### Blocker

Hiện mọi plan tuyển chọn đều mang `CURATED_RELEASE_MISSING`, `INGRESS_MODE_NOT_ENFORCED` và `CURATED_INSTALL_UNAVAILABLE`, cộng `NETWORK_POLICY_NOT_ENFORCED` với egress `approved` (chế độ `internet` nhận cảnh báo `INTERNET_EGRESS` thay vì blocker) và mã của cổng bảo mật do cấu hình máy chủ tạo ra. `CURATED_TEMPLATE_HIDDEN` chỉ xuất hiện khi đã có bản phát hành. Các blocker của workspace (không có cluster, trùng tên, mức trần chi phí, số dư) vẫn áp dụng.

| Mã | Ý nghĩa | Gỡ khi |
|----|---------|--------|
| `CURATED_RELEASE_MISSING` | Chưa có image phát hành đã rà soát được ghim bằng digest. | Có bản phát hành đã rà soát trong định nghĩa. |
| `CURATED_TEMPLATE_HIDDEN` | Chỉ khi đã có bản phát hành: việc triển khai đang bị giữ. | Gỡ việc giữ. |
| `COMMUNITY_TEMPLATES_DISABLED` (hoặc `SECURITY_GATE_UNAVAILABLE`, tùy cấu hình) | Cổng bảo mật từ chối workload registry với cấu hình này. | Bật cổng. |
| `NETWORK_POLICY_NOT_ENFORCED` | Egress `approved` chưa thể thực thi: workload mẫu chỉ có chính sách của workspace, vốn cho phép internet công cộng. | Có chính sách egress riêng cho từng bản cài. |
| `INGRESS_MODE_NOT_ENFORCED` | Pipeline đưa mọi bản cài lên tên miền công khai, còn agent cần ingress riêng tư. | Có ingress riêng tư cho bản cài mẫu. |
| `CURATED_INSTALL_UNAVAILABLE` | Cài đặt cần một nhà phát hành nền tảng trong registry, hiện chưa có. Lệnh cài cũng từ chối plan tuyển chọn. | Có nhà phát hành nền tảng. |

Plan bị chặn không phê duyệt được: phê duyệt trả `PLAN_BLOCKED` (`409`, hoặc `402` khi ví trống) và không tạo gì. Khi mẫu tuyển chọn chưa có bản phát hành, `template.version_status` là `draft`.

### Con người luôn nắm quyền

- Phê duyệt cần một người: chủ sở hữu hoặc quản trị viên workspace đã đăng nhập, hoặc API key của workspace có `deployments:execute`. Ứng dụng MCP đã kết nối không phê duyệt được plan.
- Chủ sở hữu hoặc quản trị viên luôn dừng được agent (`POST /templates/{template_slug}/stop`), gỡ khóa nhà cung cấp (`DELETE /templates/{template_slug}/envs/{KEY}`, có hiệu lực ở lần deploy sau nên hãy dừng agent luôn) hoặc xóa agent. API key cần `deployments:execute` để dừng và `env:write` để gỡ khóa. Dừng vẫn hoạt động khi ví trống.
- Agent không nhận thông tin xác thực API TOSE nào, nên không thể tự dừng, khởi động lại, đổi cấu hình hay khóa người dùng ra ngoài.
- Nếu khóa có thể đã lộ, hãy thu hồi cả ở phía nhà cung cấp.
- Hiện việc dừng cần chủ sở hữu hoặc quản trị viên; cho thành viên thường dừng là câu hỏi sản phẩm còn mở.

## Giá

Compute và storage được trừ từ ví. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing). Registry không tính thêm phí riêng.

## Bước tiếp theo

- [Tham chiếu API registry](/vi/api/template-registry)
- [Runbook template Dewee](/vi/guide/dewee-template) cho đường 1-click có sẵn
- [API key và scope](/vi/api/api-keys)
