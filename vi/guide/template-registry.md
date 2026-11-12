# Template registry và manifest `tose.yaml`

Template registry lưu các template deploy có phiên bản, được mô tả bằng manifest `tose.yaml`. Trang này giải thích định dạng manifest, những gì dùng được hiện nay và những gì chưa có.

::: info Truy cập sớm
Registry đã được phát hành (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). Bạn có thể kiểm tra, tạo, sửa, validate và **xuất bản** template ngay trong workspace của mình qua [API registry](/vi/api/template-registry). Trên TOSE được lưu trữ, việc cài template của workspace và của cộng đồng vẫn bị cổng bảo mật build chặn, và thư mục công khai đang tắt. [Mẫu agent tuyển chọn](#curated-agent-templates) Pi, Claude Code và Codex đã được phát hành và triển khai được từ dashboard.
:::

## Tình trạng {#tinh-trang}

| Khả năng | Trạng thái |
|----------|------------|
| Định dạng manifest `tose.dev/v1` và validate nghiêm ngặt, có health probe tùy chọn | Có |
| Definition và version riêng tư trong workspace (REST): chạy thử, tạo, sửa bản nháp, validate | Có |
| Xuất bản một version bên trong workspace (bất biến từ đó), kèm `expected_manifest_hash` | Có. Xuất bản không liệt kê version ở nơi nào khác |
| Lưu lượt validate cho từng version | Có. Manifest hợp lệ vẫn trả `security_gate: pending` |
| Thu hồi version đã xuất bản | Có, cho owner và admin của workspace; admin nền tảng có thể gỡ một listing. `deprecated` được dành sẵn và chưa được đặt |
| [Thư mục template](/vi/guide/template-directory) công khai: tìm kiếm, gửi duyệt, TOSE phê duyệt (tose-app [#487](https://github.com/saasvn/tose-app/pull/487)) | Đã xây dựng, đang tắt trên production: cần bật cả `TEMPLATE_DIRECTORY_ENABLED` và `COMMUNITY_TEMPLATES_ENABLED` |
| Plan deploy, phê duyệt và cài template của workspace và của thư mục | Đã xây dựng. Trên TOSE được lưu trữ, mọi plan loại này bị chặn bởi `COMMUNITY_TEMPLATES_DISABLED` và `IMAGE_SCANNER_NOT_CONFIGURED` (nguồn Git còn bởi `BUILD_SANDBOX_NOT_HARDENED` và `PUSH_CREDENTIALS_NOT_SCOPED`) |
| Cài từ registry (build và chạy) | Bị chặn (gated). [Security gate](#install-security-gate-gated) fail-closed; tắt trừ khi operator bật community template (mặc định tắt) |
| Nâng cấp và rollback tại chỗ một bản cài từ registry (tose-app [#483](https://github.com/saasvn/tose-app/pull/483)) | Đã xây dựng, đi qua cùng loại plan và cùng cổng bảo mật |
| Công cụ MCP cho registry: `search_templates`, `get_template`, `validate_template`, `create_template_draft`, `publish_template`, `plan_template_deployment`, `get_template_deployment`, `deploy_template` | Có. Không công cụ nào phê duyệt plan, và lần deploy gặp cùng cổng bảo mật |
| Mẫu Pi, Claude Code và Codex tuyển chọn: triển khai trên một trang, cài đặt và console riêng tư | Đã phát hành: Codex 1.0.0, Claude Code 1.0.0, Pi 1.0.0 và 1.1.0 (mặc định cho Pi). Xem [bên dưới](#curated-agent-templates) |
| CLI `tose templates ...` | Có: [kiểm tra và push manifest, lập kế hoạch, triển khai và agent curated](/vi/commands/templates) |

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
    health:
      readiness:
        http:
          path: /healthz
      liveness:
        tcp: {}
      startupSeconds: 300
```

### Các trường

| Trường | Quy tắc |
|--------|---------|
| `apiVersion` | Phải là `tose.dev/v1`. Giá trị khác bị từ chối. |
| `metadata.name` | Slug chữ thường kiểu DNS (`a-z`, `0-9`, `-`, tối đa 63 ký tự). Trở thành slug của definition và không đổi được về sau. |
| `metadata.version` | Semantic version tối đa 64 ký tự, ví dụ `1.0.0` hoặc `1.2.0-rc.1`. Build metadata (`1.0.0+build`) bị từ chối, vì nó có cùng thứ tự ưu tiên với `1.0.0`. |
| `metadata.description` | Bắt buộc, không để trống, tối đa 1000 byte. |
| `metadata.category` | Slug chữ thường. Dùng cho bộ lọc `category` khi liệt kê. |
| `metadata.tags` | Tùy chọn, tối đa 20, mỗi tag là slug chữ thường. |
| `metadata.license` | Bắt buộc, không để trống, tối đa 100 byte. |
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
| `services[].health` | Tùy chọn. Probe `readiness`, probe `liveness` hoặc cả hai, mỗi probe là đúng một trong `http` (`path`, và `port` mặc định là cổng của service) hoặc `tcp` (`port`, cùng mặc định). `startupSeconds` (30-1800, mặc định 300) là thời gian container được phép chờ để vượt qua probe đầu tiên trước khi bị khởi động lại. Probe `exec` và `grpc`, cùng `host`, `scheme` hay header của probe HTTP, bị từ chối kèm thông điệp giải thích lý do. Path là đường dẫn URL tuyệt đối tối đa 200 ký tự, không có query, fragment, khoảng trắng hay đoạn `.`/`..`. |

Parser từ chối key lạ (và báo từng key theo đường dẫn, ví dụ `services[0].hostNetwork`), alias YAML và nhiều hơn một tài liệu YAML. Việc parse không bao giờ tải mã nguồn của bạn và không deploy gì cả.

### Version bất biến sau khi xuất bản

Mỗi cặp `(definition, version)` là duy nhất. **Bản nháp** có thể được thay thế khi `metadata.name` và `metadata.version` giữ nguyên. Version đã rời trạng thái `draft` không sửa được: hãy xuất bản số version mới. Vì `source` được ghim vào commit hoặc digest, mỗi version mô tả đúng một đầu vào build.

Các trạng thái version là `draft`, `validating`, `review`, `published`, `deprecated` và `revoked`. API tạo version ở trạng thái `draft`, và **xuất bản** chuyển nó sang `published`: đóng băng bên trong workspace, không bao giờ được sửa hay xóa nữa. Version đã xuất bản có thể bị thu hồi, và việc thu hồi là vĩnh viễn: version đó không bao giờ được build, deploy hay cài nữa. `validating`, `review` và `deprecated` được dành sẵn và API chưa đặt các trạng thái này. Các bản phát hành của [mẫu agent tuyển chọn](#curated-agent-templates) do chính máy chủ TOSE xuất bản.

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

## Quy trình tác giả

1. Viết `tose.yaml` ở máy, với commit hoặc image digest đã ghim.
2. Kiểm tra bằng `POST /api/workspaces/{slug}/template-manifests/validate`. Không có gì được lưu, và câu trả lời cho biết definition và version đã tồn tại chưa.
3. `POST /api/workspaces/{slug}/template-definitions` kèm manifest. Việc này tạo definition **riêng tư** và version **nháp** đầu tiên.
4. Sửa các lỗi `422 manifest_invalid` và thay bản nháp bằng `PUT .../versions/{version}`, gửi kèm `expected_manifest_hash` của bản nháp bạn đã đọc.
5. Ghi một lượt validate bằng `POST .../versions/{version}/validate`.
6. Xuất bản bằng `POST .../versions/{version}/publish` kèm `expected_manifest_hash` bạn đã xem lại. Từ đó version bị đóng băng.
7. Thêm version mới bằng `POST .../versions` khi mã nguồn đổi. Số version không bao giờ được dùng lại.

Chi tiết, scope, mã lỗi và ví dụ nằm ở [tham chiếu API registry](/vi/api/template-registry).

## Bảo mật và độ tin cậy

- Definition là **riêng tư** với workspace tạo ra nó. Workspace khác không liệt kê hay đọc được.
- Các kiểm tra khi cài đặt (credential push có phạm vi hẹp, quét digest kèm SBOM, source được ghim và pod đã hardening) được mô tả ở [Security gate khi cài đặt](#install-security-gate-gated).
- Validate chỉ kiểm tra cú pháp manifest và định dạng ghim. Nó không quét hay build mã nguồn. Phản hồi luôn ghi `security_gate: pending` kể cả khi manifest hợp lệ, và manifest không đáng tin sẽ không được đưa cho builder cho đến khi có và đạt một security gate riêng.
- Ghim vào commit hoặc digest bảo vệ người dùng khỏi nguồn bị đổi sau khi review. Nó không chứng minh mã nguồn an toàn.
- Không đặt giá trị bí mật trong manifest. Hãy khai báo tên biến với `secret: true`; người deploy sẽ cung cấp giá trị.
- Xuất bản giữ version riêng tư trong workspace. Thư mục công khai, với bước TOSE duyệt, các tín hiệu tin cậy, báo cáo và gỡ bỏ, đã được xây dựng nhưng đang tắt trên production; xem [Thư mục template](/vi/guide/template-directory).

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

## Mẫu agent tuyển chọn {#curated-agent-templates}

TOSE tự định nghĩa ba mẫu agent lập trình tuyển chọn: **Pi**, **Claude Code** và **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461) và [#502](https://github.com/saasvn/tose-app/pull/502), issue [#405](https://github.com/saasvn/tose-app/issues/405)). Chúng được lập kế hoạch qua cùng bộ planner triển khai như các version trong registry, không qua [catalog](/vi/guide/dewee-template) cũ.

::: info Đã phát hành
Mọi agent tuyển chọn đều có bản phát hành đã rà soát, tức image được ghim bằng digest `sha256` kèm phiên bản upstream, ngày và bằng chứng kiểm tra: **Codex 1.0.0**, **Claude Code 1.0.0**, cùng **Pi 1.0.0** và **1.1.0**. Pi 1.1.0 là mặc định cho agent Pi mới; bản này thêm bảy nhà cung cấp, Node.js kèm npm, uv cho Python và hướng dẫn mô tả container cho Pi. Máy chủ của bạn cung cấp agent và bản phát hành nào thì xem danh sách hiện hành (trên dashboard và `GET /curated-templates`). Việc còn mở: chính sách mạng riêng cho từng bản cài, ingress riêng tư và gia cố pod mới được kiểm thử trên cụm giả lập, vẫn cần chứng minh trên cụm production.
:::

### Một định nghĩa cố định những gì

| Phần | Quy tắc |
|------|---------|
| Khóa nhà cung cấp | **Dùng khóa của bạn (BYOK).** Một biến bí mật: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex, kèm `CODEX_PROVIDER` là `openai`) hoặc `PI_API_KEY` (Pi, kèm `PI_PROVIDER`: `anthropic`, `openai` hoặc `google` ở bản 1.0.0, mười nhà cung cấp từ bản 1.1.0; xem [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers)). Codex còn có lựa chọn **gói ChatGPT** và Claude Code có lựa chọn **gói Claude**: xem [Đăng nhập nhà cung cấp](#provider-sign-in). TOSE không tính phí sử dụng mô hình: nhà cung cấp tính trên khóa của bạn. |
| Mô hình | `AGENT_MODEL` tùy chọn, là tên mô hình của nhà cung cấp. Để trống thì agent dùng mặc định. |
| Cấu hình | Số nhân và GiB nguyên trong danh sách cho phép: Claude Code và Codex 1, 2 hoặc 4 nhân và 2, 4 hoặc 8 GiB; Pi 1 hoặc 2 nhân và 1, 2 hoặc 4 GiB. |
| Lưu trữ | Ổ đĩa bền vững gồm `/workspace` và `/home/agent` (1 GiB). Bạn chọn dung lượng `/workspace` khi cài: 5 GiB (mặc định), 10, 20 hoặc 50 GiB (`workspace_disk_gib`). Sau này chủ sở hữu hoặc quản trị viên có thể [tăng dung lượng](/vi/guide/deploy-coding-agent#grow-the-disk) trên trang của agent, nhưng không giảm được. Ổ đĩa giữ dữ liệu của bạn qua các lần khởi động lại, và bị tính phí khi còn tồn tại, kể cả khi đã dừng. |
| Mạng | Egress `approved` (**Hạn chế**, mặc định: máy chủ API và đăng nhập của nhà cung cấp cùng các máy chủ GitHub, npm, PyPI và Go đã rà soát, cổng 443) hoặc `internet` (**Internet công khai không giới hạn**). `development` của các kế hoạch trước đây vẫn được chấp nhận và truy cập cùng các máy chủ như `approved`; dashboard không còn cung cấp nó. Xem [Chế độ mạng](/vi/guide/agent-network-modes). Không có `none`, vì agent không gọi được nhà cung cấp nếu không có egress. Ingress luôn là `private`: console của agent không bao giờ công khai. |
| Thiết lập | Chỉ `image_entrypoint`: entrypoint đã rà soát của image phát hành. Không có bước build, lệnh khởi động, hook, đối tượng Kubernetes hay `privileged`; trường lạ bị từ chối. |
| Bản phát hành | Mỗi bản ghim image OCI bằng digest `sha256` và ghi phiên bản upstream, ngày và liên kết https tới bằng chứng. Nhà phát hành (TOSE) được đặt một lần trên định nghĩa. Bản này được chuyển thành manifest `tose.dev/v1` thông thường và được kiểm tra theo các quy tắc ở trên. |

### Đăng nhập nhà cung cấp {#provider-sign-in}

Khóa API (BYOK) dùng được với mọi agent tuyển chọn và không phụ thuộc cờ nào của máy chủ.

**Đăng nhập bằng gói được cung cấp ở máy chủ bật `CURATED_SUBSCRIPTION_LOGIN_ENABLED`.** Một cờ máy chủ này điều khiển cả hai đăng nhập bằng gói từ dashboard: **gói ChatGPT** của Codex và bảng **gói Claude** của Claude Code (**Kết nối Claude**). Chủ sản phẩm đã cho phép cả hai trên production từ 2026-11-09 (tose-app [#569](https://github.com/saasvn/tose-app/pull/569), [#587](https://github.com/saasvn/tose-app/pull/587); quyết định cho [Codex](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#codex-chatgpt-sign-in-in-production-owner-decision-2026-11-09) và [Claude](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#claude-code-dashboard-sign-in-in-production-owner-decision-2026-11-09)). Đây là quyết định của chủ sản phẩm, không phải sự chấp thuận của nhà cung cấp: OpenAI và Anthropic đều chưa chấp thuận bằng văn bản việc dùng trên hạ tầng lưu trữ này. Danh sách trên dashboard và `GET /curated-templates` cho biết máy chủ cung cấp những gì. Ở máy chủ tắt cờ, nhà cung cấp `chatgpt` của Codex được đánh dấu `available: false` kèm lý do, plan chọn nó bị chặn với `SUBSCRIPTION_LOGIN_DISABLED` (không có gì được tạo hay tính phí), và bảng gói Claude bị ẩn; `/login` riêng của Claude Code trong console vẫn dùng được.

Các cách đăng nhập của Claude Code dễ nhầm với nhau:

- **Khóa API (BYOK).** `CLAUDE_PROVIDER=anthropic` với `ANTHROPIC_API_KEY`. Không cần cờ và là đường không phụ thuộc quyết định của nhà cung cấp.
- **Gói Claude, đăng nhập từ dashboard.** Khi cờ bật, trang của app đã cài hiển thị bảng **Gói Claude**. **Kết nối Claude** hiện liên kết tới trang đăng nhập của chính Anthropic, bạn đăng nhập ở đó trong trình duyệt của mình rồi dán mã dùng một lần mà trang hiển thị vào bảng. TOSE chuyển mã đó một lần cho `claude auth login` của chính Claude Code, không lưu, không ghi log, không ghi audit và không trả lại. Đây là mã nhà cung cấp duy nhất mà một bề mặt của TOSE nhận. **Ngắt kết nối** đăng xuất agent. Khi cờ tắt, bảng bị ẩn và các route của nó trả `404`.
- **Gói Claude, đăng nhập từ terminal.** `CLAUDE_PROVIDER=claude` và `/login` trong console riêng của agent. TOSE không tham gia, và cờ không điều khiển đường này. Nó dùng được dù bảng trên dashboard bật hay tắt. Claude Code 1.0.0 đã được phát hành, nên cách đăng nhập này dùng được ở mọi nơi triển khai được Claude Code.

**Gói ChatGPT** của Codex (`CODEX_PROVIDER=chatgpt`, tose-app [#513](https://github.com/saasvn/tose-app/pull/513)) theo cùng cờ này. Khi bật, **Kết nối ChatGPT** trên trang app đã cài hiện mã thiết bị dùng một lần, và bạn nhập nó trên trang của chính OpenAI (`https://auth.openai.com/codex/device`) trong trình duyệt của bạn. Nhà cung cấp là một phần của plan đã duyệt, nên đổi một app đã cài giữa khóa API và gói ChatGPT nghĩa là cài một app mới.

**Rủi ro bạn chấp nhận khi dùng đăng nhập bằng gói** (như các quyết định đã ghi nhận):

- **Phiên dùng chung.** Đăng nhập không gắn với người đã bắt đầu nó. Bất kỳ owner hoặc admin nào của workspace mở được console đều dùng được phiên ChatGPT hoặc Claude của installation đó. Chỉ dùng trong workspace mà mọi owner và admin đều được phép dùng tài khoản đó.
- **Điều khoản nhà cung cấp.** OpenAI và Anthropic có thể từ chối hoặc hạn chế các tài khoản đăng nhập theo cách này, và thiệt hại thuộc về chủ tài khoản. Hãy dùng khóa API nếu không chấp nhận được điều đó.
- **Còn mở.** Canary thực với nhà cung cấp, sự chấp thuận bằng văn bản của OpenAI và Anthropic, cùng phê duyệt pháp lý và bảo mật chưa được ghi nhận là hoàn tất.

**Khôi phục (rollback).** Operator đặt `CURATED_SUBSCRIPTION_LOGIN_ENABLED` thành false và khởi động lại API với môi trường đã cập nhật; chỉ đổi giá trị thì chưa áp dụng. Khi đó cả hai đăng nhập từ dashboard biến mất cùng lúc: bảng Claude và đăng nhập gói ChatGPT của Codex. Plan Codex mới chọn gói ChatGPT bị chặn với `SUBSCRIPTION_LOGIN_DISABLED`, pipeline từ chối deploy bản cài Codex ở chế độ ChatGPT, và các route tài khoản trả `404`. Việc này **không** thu hồi các phiên nhà cung cấp đã có. Để kết thúc một phiên, hãy **Ngắt kết nối** (hoặc `/logout` với đăng nhập trong terminal) khi bảng còn bật, dừng hoặc xóa agent, hoặc thu hồi phiên trong tài khoản nhà cung cấp. `/login` riêng của Claude Code trong console không bị ảnh hưởng.

Với bất kỳ nhà cung cấp nào, **không bao giờ gửi cho TOSE hoặc bộ phận hỗ trợ phiên đăng nhập, token, cookie, tệp `auth.json` hay mã đăng nhập của ChatGPT, Claude hoặc nhà cung cấp khác**, dù qua chat, tin nhắn hỗ trợ, lệnh gọi API, biểu mẫu hay biến. Ngoại lệ duy nhất là bảng trên dashboard ở trên, nhận mã đăng nhập dùng một lần của Anthropic; còn mã thiết bị được nhập trên trang của OpenAI, không bao giờ nhập cho TOSE. Khóa nhà cung cấp gửi trong plan sẽ bị từ chối; bí mật của agent chỉ gồm khóa API bạn nhập trên trang triển khai và các biến môi trường bí mật bạn thêm ở đó. Hợp đồng route là [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml) do máy sở hữu, trang này không sao chép lại; lý do nằm ở [cổng xác thực nhà cung cấp](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md).

### Bản phát hành được xuất bản thế nào

Thêm bản phát hành là một thay đổi được rà soát trong định nghĩa, được biên dịch vào máy chủ TOSE. Khi máy chủ khởi động, mỗi bản phát hành được lưu thành một **version registry đã xuất bản và bất biến** dưới nhà phát hành nền tảng `tose-curated` (hiển thị là "TOSE"). Bước này idempotent, không bao giờ sửa version đã lưu và không cần thao tác của admin. Một bản phát hành có thể bị giữ lại bằng `hidden: true` trong định nghĩa; khi đó dashboard hiển thị lý do chưa triển khai được thay cho liên kết **Triển khai**, và API chỉ liệt kê nó khi có `include_hidden=true`.

### Triển khai từ dashboard {#deploy-from-the-dashboard}

Mỗi thẻ agent ở mục **Agent có sẵn** trong **Cloud Agents** (tose-app [#576](https://github.com/saasvn/tose-app/pull/576)) hiển thị những gì bạn cần để chọn: logo, tên agent và nhà cung cấp cùng nhãn **Sẵn sàng** hoặc **Chưa sẵn sàng**, **Đăng nhập bằng** (các nhà cung cấp; nhà cung cấp mà máy chủ này không cung cấp bị gạch ngang, lý do hiện khi rê chuột), **Cấu hình** (vCPU và GiB mặc định và lớn nhất), **Phiên bản** (bản TOSE và phiên bản upstream, hoặc "Chưa phát hành") và **Mã nguồn** (dự án upstream và giấy phép). Thẻ chỉ tóm tắt danh sách của máy chủ và không thay thế các kiểm tra theo workspace khi bạn lập plan: thẻ ghi **Sẵn sàng** vẫn có thể bị chặn với workspace của bạn.

Mở **Cloud Agents** ở thanh bên của workspace (`/w/<workspace>/agents`). Agent tuyển chọn được liệt kê ở mục **Agent có sẵn**; các trang mẫu không còn liệt kê chúng. Chọn **Triển khai** ở Codex, Pi hoặc Claude Code: agent được triển khai trên **một trang** (tose-app [#598](https://github.com/saasvn/tose-app/pull/598)) gồm các thẻ sau:

- **Ứng dụng**: tên ứng dụng.
- **Đăng nhập**: nhà cung cấp (với Pi là một trong các nhà cung cấp của Pi) và, khi cần, khóa API của bạn ngay tại đó. Đăng nhập bằng gói (gói ChatGPT hoặc gói Claude) không cần khóa và được thực hiện sau khi triển khai.
- **Cấu hình**: số nhân CPU và bộ nhớ trong các mức được đưa ra, **Ổ đĩa workspace** (mặc định 5 GiB, hoặc 10, 20 hay 50 GiB, mỗi mức kèm giá mỗi tháng), cùng **Tự động ngủ khi không hoạt động** (mặc định tắt).
- **Truy cập mạng**: **Hạn chế** (mặc định) hoặc **Internet công khai không giới hạn**, mỗi chế độ kèm mô tả agent kết nối được tới đâu.
- **Kho mã (không bắt buộc)**: một kho GitHub của workspace để tải vào `/workspace` khi agent khởi động lần đầu, và tùy chọn **Cho phép agent push lên kho mã này** ([push](/vi/guide/agent-repository-checkout#cho-agent-push-len-kho-ma), mặc định tắt).
- **Nâng cao: phiên bản, model và biến môi trường**: bản phát hành (mặc định Pi 1.1.0), model tùy chọn, cùng các biến và bí mật của riêng bạn.

Khi bạn thay đổi các ô nhập, trang tự lập plan và hiển thị plan hiện hành: mức trần chi phí, số giờ ví còn đủ, blocker và cảnh báo, bên cạnh một nút **Triển khai** duy nhất. Không có ô giới hạn chi phí. **Triển khai** phê duyệt đúng plan đó (theo hash của plan), cài đặt với khóa của bạn và một `Idempotency-Key`, rồi theo dõi bản cài cho tới khi agent chạy. Sau đó trang dẫn tới ứng dụng, nơi bước tiếp theo là **Mở agent**, **Kết nối** một gói, hoặc `/login`. Khóa của bạn chỉ được gửi cùng yêu cầu cài đặt, lưu ở dạng mã hóa và không hiển thị lại.

Chỉ **chủ sở hữu hoặc quản trị viên** workspace mới phê duyệt được một lần triển khai. Thành viên nhận một liên kết tới plan để gửi cho chủ sở hữu hoặc quản trị viên.

Cùng luồng này dùng được qua API: `POST /template-deployment-plans` với `curated_template`, một người phê duyệt hash của plan, rồi `POST /template-installations` kèm `Idempotency-Key`. Gửi lại cùng key và plan trả về cùng bản cài. Xem [tham chiếu API](/vi/api/template-registry#curated-agent-templates).

### Nguồn hiển thị trên ứng dụng đã cài

Ứng dụng cài từ một version trong registry hiển thị **Nguồn mẫu** của nó (trên trang của agent tuyển chọn, trong khối **Nâng cao** của tab **Cài đặt**). Với version dựa trên image (mọi agent tuyển chọn), đó là tham chiếu image đã ghim, `…@sha256:<digest>`, không phải URL Git; bản build từ Git giữ URL repository, và nguồn rỗng hiển thị `—` (tose-app [#568](https://github.com/saasvn/tose-app/pull/568)). Trường này chỉ hiển thị nguồn gốc của ứng dụng, không đổi thứ được chạy. API trả về cùng giá trị `template_source` (tham chiếu image hoặc URL Git, và `""` khi rỗng; `—` chỉ là cách trang hiển thị giá trị rỗng), nên đừng parse nó như một URL.

### Console riêng tư

Agent đã cài không có địa chỉ công khai, không có tên miền và có chính sách mạng chặn mặc định. Bạn mở console của nó qua TOSE:

- **Ai.** Chỉ **chủ sở hữu hoặc quản trị viên workspace đã đăng nhập** vào dashboard hoặc CLI. API key và ứng dụng đã kết nối (MCP) bị từ chối dù có scope nào: console là một shell tương tác đang giữ khóa nhà cung cấp của bạn, nên chỉ một người mới mở được. Đây là ngoại lệ được ghi rõ so với nguyên tắc "agent là người dùng hạng nhất".
- **Cách mở.** Ở trang của agent, chọn **Mở agent** (**Đánh thức và mở** khi agent đang ngủ). Console mở trong tab mới (hãy cho phép cửa sổ bật lên nếu trình duyệt chặn). Ứng dụng phải đang chạy; nếu không, nút sẽ báo console chưa khả dụng và yêu cầu khởi động ứng dụng. Yêu cầu được ghi nhật ký kiểm toán.
- **Phiên.** Địa chỉ console mang một token đã ký, có hiệu lực 8 giờ. Đó là thông tin xác thực duy nhất trong địa chỉ, nên đừng chia sẻ URL. TOSE proxy HTTP và WebSocket tới cổng 8080 của agent, nên pod không bao giờ bị phơi ra ngoài.
- **Thu hồi quyền truy cập sẽ đóng console.** Mỗi yêu cầu, và mỗi WebSocket đang mở cứ năm giây một lần, kiểm tra lại rằng phiên đăng nhập của bạn còn hiệu lực, bạn vẫn là chủ sở hữu hoặc quản trị viên của workspace và ứng dụng đang chạy. Đăng xuất, mất vai trò, bị xóa khỏi workspace hoặc dừng ứng dụng sẽ khiến yêu cầu kế tiếp bị từ chối và WebSocket đang mở bị đóng. Xoay khóa ký của máy chủ sẽ kết thúc mọi console đang mở. Mỗi lần mở WebSocket đều được ghi nhật ký kiểm toán.
- **Trang console không đáng tin.** Agent kiểm soát trang console và có thể chạy mã bất kỳ, nên TOSE phục vụ nó trong CSP sandbox (một origin mờ, không dùng được phiên đăng nhập TOSE của bạn), bỏ cookie và thông tin xác thực của bạn khỏi các yêu cầu tới agent, loại bỏ cookie do console đặt, không gửi referrer và che token trong nhật ký truy cập.

### Version bị thu hồi và nhà phát hành bị đình chỉ

Admin nền tảng có thể thu hồi một version phát hành hoặc đình chỉ nhà phát hành `tose-curated`. Danh sách trên dashboard và `GET /curated-templates` hiển thị blocker tương ứng thay cho liên kết **Triển khai**, và các plan, lần deploy sau đó bị từ chối:

- **Version bị thu hồi** chặn các plan sau đó với `VERSION_REVOKED`, và các lần deploy sau đó của nó.
- **Nhà phát hành bị đình chỉ** chặn mọi plan tuyển chọn (`CURATED_INSTALL_UNAVAILABLE`).
- Bản phát hành chưa được xuất bản, hoặc được lưu với manifest khác dưới cùng số version, cũng là `CURATED_INSTALL_UNAVAILABLE`: TOSE không bao giờ ghi đè version đã lưu.
- Nâng cấp tại chỗ một bản cài tuyển chọn bị từ chối (`409 CURATED_UPGRADE_UNAVAILABLE`). Hãy cài bản phát hành mới thành một bản cài mới và dừng bản cũ.

### Lập plan cho mẫu tuyển chọn

`POST /api/workspaces/{slug}/template-deployment-plans` nhận `curated_template` (`pi`, `claude-code` hoặc `codex`) **thay cho** `definition_slug`, cùng `network_mode` (`approved` hoặc `internet`; `development` của các kế hoạch trước đây vẫn được nhận và truy cập cùng các máy chủ như `approved`). `GET /api/workspaces/{slug}/curated-templates` liệt kê các trường nhập của biểu mẫu. Xem [tham chiếu API](/vi/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` không bắt buộc.** Plan luôn tính chi phí giờ cao nhất (compute cộng storage, theo mức giá được kiểm tra cho plan) và hiển thị mức trần đó để phê duyệt. Khi bạn đặt giới hạn, plan có mức trần vượt giới hạn sẽ bị chặn với `COST_CEILING_EXCEEDED`. Dashboard không hỏi trường này; hãy đặt qua API nếu muốn giới hạn một plan. Ví trống bị chặn với `INSUFFICIENT_BALANCE`. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing).
- **Khóa nhà cung cấp không bao giờ nằm trong plan.** Gửi trong `variables` sẽ nhận `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`, và lỗi không lặp lại giá trị. Khóa chỉ thuộc về `secrets` của yêu cầu cài đặt.
- Cấu hình phải nằm trong các mức được đưa ra, kể cả `workspace_disk_gib` (5, 10, 20 hoặc 50; bỏ trống là 5). Đầu vào không hợp lệ trả `422` kèm đường dẫn trường.
- Bản cài đặt mới của bản phát hành có trình chạy tác vụ bắt đầu với **Nhận tác vụ từ ứng dụng đã kết nối và khóa API** đang bật; xem [Giao tác vụ](/vi/guide/agent-tasks#bat-tinh-nang).

### Blocker

| Mã | Ý nghĩa | Gỡ khi |
|----|---------|--------|
| `CURATED_RELEASE_MISSING` | Định nghĩa chưa có image phát hành được ghim bằng digest. | Có bản phát hành đã rà soát trong định nghĩa. |
| `CURATED_TEMPLATE_HIDDEN` | Đã có bản phát hành nhưng việc triển khai đang bị giữ (`hidden: true`). | Gỡ việc giữ. |
| `SUBSCRIPTION_LOGIN_DISABLED` | Plan chọn **gói ChatGPT** của Codex trong khi máy chủ tắt `CURATED_SUBSCRIPTION_LOGIN_ENABLED`. **Gói Claude** của Claude Code không bao giờ bị chặn bởi mã này, vì đăng nhập trong terminal không phụ thuộc cờ. Xem [Đăng nhập nhà cung cấp](#provider-sign-in). | Chọn nhà cung cấp khóa API, hoặc operator bật cờ. |
| `CURATED_INSTALL_UNAVAILABLE` | Bản phát hành không cài được từ registry: chưa xuất bản, được lưu với manifest khác, hoặc nhà phát hành bị đình chỉ. | TOSE xuất bản bản phát hành, hoặc gỡ đình chỉ. |
| `VERSION_REVOKED` | Admin nền tảng đã thu hồi version này. | Một bản phát hành mới hơn đã rà soát (version sau). |
| `COMMUNITY_TEMPLATES_DISABLED` (hoặc `SECURITY_GATE_UNAVAILABLE`, `IMAGE_SCANNER_NOT_CONFIGURED`, tùy cấu hình) | Cổng bảo mật từ chối workload registry với cấu hình này. | Nhà vận hành bật cổng và bộ quét image. |
| `GITHUB_PERMISSION_MISSING` | Plan cho agent push, và GitHub App của TOSE thiếu **Contents: Read and write** (hoặc tài khoản chưa chấp nhận). Xem [push](/vi/guide/agent-repository-checkout#cho-agent-push-len-kho-ma). | Người vận hành cấp quyền và tài khoản chấp nhận, hoặc tắt push. |
| `NETWORK_POLICY_NOT_ENFORCED`, `INGRESS_MODE_NOT_ENFORCED` | Cụm đích không thực thi được chính sách mạng riêng của bản cài, nên không đảm bảo được giới hạn egress và console riêng tư. Không tạo gì và không tính phí. | Một cụm thực thi được chính sách này. |

Các blocker của workspace (không có cluster, trùng tên, mức trần chi phí, số dư) vẫn áp dụng. Plan bị chặn không phê duyệt được: phê duyệt trả `PLAN_BLOCKED` (`409`, hoặc `402` khi ví trống) và không tạo gì. Image được quét trước khi chạy, và deploy bị từ chối nếu có lỗ hổng mức cao hoặc nghiêm trọng.

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
- [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers)
- [Runbook template Dewee](/vi/guide/dewee-template) cho đường 1-click có sẵn
- [API key và scope](/vi/api/api-keys)
