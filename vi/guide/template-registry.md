# Template registry và manifest `tose.yaml`

Template registry lưu các template deploy có phiên bản, được mô tả bằng manifest `tose.yaml`. Trang này giải thích định dạng manifest, những gì dùng được hiện nay và những gì chưa có.

::: warning Truy cập sớm: chỉ có bản nháp riêng tư
Phần nền tảng của registry đã được phát hành (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). Bạn có thể tạo, sửa và validate template **bản nháp riêng tư** trong workspace của mình qua [API registry](/vi/api/template-registry). Xuất bản công khai, thư mục, CLI và MCP chưa bật, và trang này không mô tả chúng như đã có. [Mẫu agent tuyển chọn](#curated-agent-templates) vẫn bị ẩn cho tới khi TOSE phát hành bản đã rà soát.
:::

## Tình trạng {#tinh-trang}

| Khả năng | Trạng thái |
|----------|------------|
| Định dạng manifest `tose.dev/v1` và validate nghiêm ngặt | Có |
| Definition và version bản nháp riêng tư trong workspace (REST) | Có |
| Lưu lượt validate cho từng version | Có. Manifest hợp lệ vẫn trả `security_gate: pending` |
| Xuất bản công khai, review để public, deprecate và revoke do tác giả | Chưa có (chỉ admin nền tảng thu hồi được bản phát hành tuyển chọn). Chế độ public giữ tắt cho đến khi security gate đạt |
| Thư mục template (tìm kiếm, lọc, sắp xếp) | Chưa có |
| Plan deploy, chi phí và blocker cho template trong registry | Đã có ở backend, chưa được tài liệu hóa ở đây ngoại trừ các mẫu tuyển chọn bên dưới |
| Mẫu Pi, Claude Code và Codex tuyển chọn: plan, cài đặt và console riêng tư | Đã xây dựng nhưng đang ẩn. TOSE chưa phát hành bản đã rà soát được ghim bằng digest, nên mọi plan bị chặn cho tới khi có |
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

Registry lưu các trạng thái version `draft`, `validating`, `review`, `published`, `deprecated` và `revoked`. Hiện API chỉ tạo version ở trạng thái `draft`; các trạng thái còn lại dành cho luồng xuất bản chưa có, trừ các bản phát hành của [mẫu agent tuyển chọn](#curated-agent-templates) do chính máy chủ TOSE xuất bản.

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

## Mẫu agent tuyển chọn {#curated-agent-templates}

TOSE tự định nghĩa ba mẫu agent lập trình tuyển chọn: **Pi**, **Claude Code** và **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461) và [#502](https://github.com/saasvn/tose-app/pull/502), issue [#405](https://github.com/saasvn/tose-app/issues/405)). Chúng được lập kế hoạch qua cùng bộ planner triển khai như các version trong registry, không qua [catalog](/vi/guide/dewee-template) cũ.

::: warning Ẩn cho tới khi TOSE phát hành bản đã rà soát
Agent tuyển chọn vẫn **bị ẩn** và chưa cài được cho tới khi TOSE phát hành một bản đã rà soát: image được ghim bằng digest `sha256`, kèm phiên bản upstream, ngày và bằng chứng kiểm tra. #502 bổ sung luồng cài đặt và console nhưng **chưa phát hành bản nào cho Pi, Codex hay Claude Code**, nên mọi plan vẫn bị chặn với `CURATED_RELEASE_MISSING`. Trang này mô tả luồng bạn có khi đã có bản phát hành. Còn hai việc chưa xong: chính sách mạng riêng cho từng bản cài, ingress riêng tư và gia cố pod mới được kiểm thử trên cụm giả lập, chưa chứng minh trên cụm production; và với Claude Code, TOSE cần xác nhận pháp lý bằng văn bản trước khi phân phối binary trong image. Agent nào triển khai được tại một thời điểm do registry hiện hành quyết định (danh sách trên dashboard và `GET /curated-templates`), không phải trang này.
:::

### Một định nghĩa cố định những gì

| Phần | Quy tắc |
|------|---------|
| Khóa nhà cung cấp | **Chỉ dùng khóa của bạn (BYOK).** Một biến bí mật: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex, kèm `CODEX_PROVIDER` là `openai`) hoặc `PI_API_KEY` (Pi, kèm `PI_PROVIDER` là `anthropic`, `openai` hoặc `google`). Codex còn hiển thị lựa chọn **gói ChatGPT** và Claude Code lựa chọn **gói Claude**, hai lựa chọn này phụ thuộc vào máy chủ: xem [Đăng nhập nhà cung cấp](#provider-sign-in). TOSE không tính phí sử dụng mô hình: nhà cung cấp tính trên khóa của bạn. |
| Mô hình | `AGENT_MODEL` tùy chọn, là tên mô hình của nhà cung cấp. Để trống thì agent dùng mặc định. |
| Cấu hình | Số nhân và GiB nguyên trong danh sách cho phép: Claude Code và Codex 1, 2 hoặc 4 nhân và 2, 4 hoặc 8 GiB; Pi 1 hoặc 2 nhân và 1, 2 hoặc 4 GiB. |
| Lưu trữ | Ổ đĩa bền vững gồm `/workspace` (5 GiB) và `/home/agent` (1 GiB), tính phí khi ổ đĩa còn tồn tại, kể cả khi đã dừng. |
| Mạng | Egress `approved` (chỉ máy chủ API của nhà cung cấp, mặc định) hoặc `internet`. Không có `none`, vì agent không gọi được nhà cung cấp nếu không có egress. Ingress luôn là `private`: console của agent không bao giờ công khai. |
| Thiết lập | Chỉ `image_entrypoint`: entrypoint đã rà soát của image phát hành. Không có bước build, lệnh khởi động, hook, đối tượng Kubernetes hay `privileged`; trường lạ bị từ chối. |
| Bản phát hành | Mỗi bản ghim image OCI bằng digest `sha256` và ghi phiên bản upstream, ngày và liên kết https tới bằng chứng. Nhà phát hành (TOSE) được đặt một lần trên định nghĩa. Bản này được chuyển thành manifest `tose.dev/v1` thông thường và được kiểm tra theo các quy tắc ở trên. |

### Đăng nhập nhà cung cấp {#provider-sign-in}

Khóa API (BYOK) dùng được với mọi agent tuyển chọn và không phụ thuộc cờ nào của máy chủ. Hai cách đăng nhập bằng gói bên dưới phụ thuộc vào cấu hình máy chủ TOSE của bạn. Danh sách trên dashboard và `GET /curated-templates` cho biết điều đó: nhà cung cấp không chọn được được đánh dấu `available: false` kèm lý do, và plan chọn nó bị chặn với `SUBSCRIPTION_LOGIN_DISABLED`. Không có gì được tạo hay tính phí. Đừng mặc định rằng đăng nhập bằng gói đang bật chỉ vì sản phẩm có tính năng đó.

**Tính khả dụng phụ thuộc vào `CURATED_SUBSCRIPTION_LOGIN_ENABLED`.** Một cờ máy chủ này điều khiển cả hai đăng nhập gói từ dashboard: **gói ChatGPT** của Codex và **gói Claude** của Claude Code. Từ 2026-11-09, production không còn từ chối khởi động khi cờ này bật, và operator bật nó trong môi trường của API (tose-app [#569](https://github.com/saasvn/tose-app/pull/569), [#587](https://github.com/saasvn/tose-app/pull/587)). Đây là quyết định của chủ sản phẩm ([Codex](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#codex-chatgpt-sign-in-in-production-owner-decision-2026-11-09), [Claude](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#claude-code-dashboard-sign-in-in-production-owner-decision-2026-11-09)), không phải sự chấp thuận của nhà cung cấp: OpenAI và Anthropic đều chưa chấp thuận bằng văn bản việc lưu trữ này, và chưa có đăng nhập thực với nhà cung cấp được xác lập. Hãy coi nó có thể đang bật hoặc tắt trên máy chủ của bạn và kiểm tra danh sách.

Các cách đăng nhập của Claude Code dễ nhầm với nhau:

- **Khóa API (BYOK).** `CLAUDE_PROVIDER=anthropic` với `ANTHROPIC_API_KEY`. Không cần cờ và là đường không phụ thuộc quyết định của nhà cung cấp.
- **Gói Claude, đăng nhập từ dashboard (khi cờ bật).** Khi cờ bật, trang của app đã cài hiển thị bảng **gói Claude**. **Connect Claude** hiện liên kết tới trang đăng nhập của chính Anthropic, bạn đăng nhập ở đó trong trình duyệt của mình rồi dán mã dùng một lần mà trang hiển thị vào bảng. TOSE chuyển mã đó một lần cho `claude auth login` của chính Claude Code, không lưu, không ghi log, không ghi audit và không trả lại. Đây là mã nhà cung cấp duy nhất mà một bề mặt của TOSE nhận. **Disconnect** đăng xuất agent. Khi cờ tắt, bảng bị ẩn và các route của nó trả `404`.
- **Gói Claude, đăng nhập từ terminal.** `CLAUDE_PROVIDER=claude` và `/login` trong console riêng của agent. TOSE không tham gia, và cờ không điều khiển đường này. Nó dùng được dù bảng trên dashboard bật hay tắt, và vẫn phụ thuộc vào bản phát hành có thể cài đặt.

**Gói ChatGPT** của Codex (`CODEX_PROVIDER=chatgpt`, tose-app [#513](https://github.com/saasvn/tose-app/pull/513)) theo cùng cờ này. Khi bật, **Connect ChatGPT** trên trang app đã cài hiện mã thiết bị dùng một lần, và bạn nhập nó trên trang của chính OpenAI (`https://auth.openai.com/codex/device`) trong trình duyệt của bạn. Nhà cung cấp là một phần của plan đã duyệt, nên đổi một app đã cài giữa khóa API và gói ChatGPT nghĩa là cài một app mới.

**Rủi ro bạn chấp nhận khi dùng đăng nhập bằng gói** (như các quyết định đã ghi nhận):

- **Phiên dùng chung.** Đăng nhập không gắn với người đã bắt đầu nó. Bất kỳ owner hoặc admin nào của workspace mở được console đều dùng được phiên ChatGPT hoặc Claude của installation đó. Chỉ dùng trong workspace mà mọi owner và admin đều được phép dùng tài khoản đó.
- **Điều khoản nhà cung cấp.** OpenAI và Anthropic có thể từ chối hoặc hạn chế các tài khoản đăng nhập theo cách này, và thiệt hại thuộc về chủ tài khoản. Hãy dùng khóa API nếu không chấp nhận được điều đó.
- **Còn mở.** Canary thực với nhà cung cấp, sự chấp thuận bằng văn bản của OpenAI và Anthropic, cùng phê duyệt pháp lý và bảo mật chưa được ghi nhận là hoàn tất.

**Khôi phục (rollback).** Operator đặt `CURATED_SUBSCRIPTION_LOGIN_ENABLED` thành false và khởi động lại API với môi trường đã cập nhật; chỉ đổi giá trị thì chưa áp dụng. Khi đó cả hai đăng nhập từ dashboard biến mất cùng lúc: bảng Claude và đăng nhập gói ChatGPT của Codex, plan mới chọn đăng nhập bằng gói bị chặn với `SUBSCRIPTION_LOGIN_DISABLED`, và các route tài khoản trả `404`. Việc này **không** thu hồi các phiên nhà cung cấp đã có. Để kết thúc một phiên, hãy **Disconnect** (hoặc `/logout` với đăng nhập trong terminal) khi bảng còn bật, dừng hoặc xóa agent, hoặc thu hồi phiên trong tài khoản nhà cung cấp. `/login` riêng của Claude Code trong console không bị ảnh hưởng.

Với bất kỳ nhà cung cấp nào, **không bao giờ gửi cho TOSE hoặc bộ phận hỗ trợ phiên đăng nhập, token, cookie, tệp `auth.json` hay mã đăng nhập của ChatGPT, Claude hoặc nhà cung cấp khác**, dù qua chat, tin nhắn hỗ trợ, lệnh gọi API, biểu mẫu hay biến. Ngoại lệ duy nhất là bảng trên dashboard ở trên, nhận mã đăng nhập dùng một lần của Anthropic; còn mã thiết bị được nhập trên trang của OpenAI, không bao giờ nhập cho TOSE. Khóa nhà cung cấp gửi trong plan sẽ bị từ chối; bí mật duy nhất agent nhận là khóa API bạn nhập ở bước cài đặt. Hợp đồng route là [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml) do máy sở hữu, trang này không sao chép lại; lý do nằm ở [cổng xác thực nhà cung cấp](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md).

### Vì sao agent bị ẩn

Định nghĩa chưa có bản phát hành thì bị ẩn: dashboard hiển thị lý do chưa triển khai được thay vì liên kết **Triển khai**, và API chỉ liệt kê nó khi có `include_hidden=true`. Thêm bản phát hành là một thay đổi được rà soát trong định nghĩa, được biên dịch vào máy chủ TOSE. Khi máy chủ khởi động, mỗi bản phát hành được lưu thành một **version registry đã xuất bản và bất biến** dưới nhà phát hành nền tảng `tose-curated` (hiển thị là "TOSE"). Bước này idempotent, không bao giờ sửa version đã lưu và không cần thao tác của admin. Định nghĩa chưa có bản phát hành thì không xuất bản gì.

### Triển khai từ dashboard (khi đã có bản phát hành)

Mở **Mẫu** ở thanh bên của workspace, rồi **Mẫu của tôi**. Agent tuyển chọn nằm ở mục "Mẫu agent do TOSE tuyển chọn". Chọn **Triển khai** ở agent khả dụng; agent bị ẩn hiển thị các blocker thay cho liên kết này.

1. **Cấu hình.** Chọn **bản phát hành**, với Pi thì chọn thêm **nhà cung cấp**, rồi tùy chọn **mô hình**. Chọn CPU và bộ nhớ trong các mức được đưa ra, và quyền truy cập mạng: **Chỉ các máy chủ được duyệt** (API của nhà cung cấp, cổng 443) hoặc **Internet**. Nhập **giới hạn chi phí mỗi giờ** (bắt buộc): plan bị chặn nếu workload có thể tốn hơn mức này. Khóa API nhà cung cấp không được hỏi ở bước này và không bao giờ nằm trong plan.
2. **Xem và duyệt.** Bước xem lại hiển thị bản phát hành được ghim, chi phí, các đích mạng và mục "Con người luôn nắm quyền kiểm soát". Chủ sở hữu hoặc quản trị viên workspace phê duyệt hash của plan. Plan bị chặn không phê duyệt được.
3. **Cài đặt.** Nhập khóa API nhà cung cấp vào ô mật khẩu. Khóa chỉ được gửi cùng yêu cầu cài đặt, lưu ở dạng mã hóa và không hiển thị lại, và ô nhập được xóa sau khi cài xong. Cài đặt tạo ứng dụng và xếp hàng lần triển khai đầu tiên của **version registry đã ghim**: đúng digest đã được phê duyệt.
4. **Trạng thái.** Trang tự làm mới cho tới khi lần triển khai đầu tiên kết thúc. Bạn có thể rời đi; ứng dụng vẫn tiếp tục triển khai.

Cùng luồng này dùng được qua API: `POST /template-deployment-plans` với `curated_template`, một người phê duyệt hash của plan, rồi `POST /template-installations` kèm `Idempotency-Key`. Gửi lại cùng key và plan trả về cùng bản cài. Xem [tham chiếu API](/vi/api/template-registry#curated-agent-templates).

### Console riêng tư

Agent đã cài không có địa chỉ công khai, không có tên miền và có chính sách mạng chặn mặc định. Bạn mở console của nó qua TOSE:

- **Ai.** Chỉ **chủ sở hữu hoặc quản trị viên workspace đã đăng nhập** vào dashboard hoặc CLI. API key và ứng dụng đã kết nối (MCP) bị từ chối dù có scope nào: console là một shell tương tác đang giữ khóa nhà cung cấp của bạn, nên chỉ một người mới mở được. Đây là ngoại lệ được ghi rõ so với nguyên tắc "agent là người dùng hạng nhất".
- **Cách mở.** Ở trang của ứng dụng đã cài, chọn **Mở console**. Console mở trong tab mới (hãy cho phép cửa sổ bật lên nếu trình duyệt chặn). Ứng dụng phải đang chạy; nếu không, nút sẽ báo console chưa khả dụng và yêu cầu khởi động ứng dụng. Yêu cầu được ghi nhật ký kiểm toán.
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

`POST /api/workspaces/{slug}/template-deployment-plans` nhận `curated_template` (`pi`, `claude-code` hoặc `codex`) **thay cho** `definition_slug`, cùng `network_mode`. `GET /api/workspaces/{slug}/curated-templates` liệt kê các trường nhập của biểu mẫu. Xem [tham chiếu API](/vi/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` là bắt buộc.** Đây là mức trần chi phí trả trước của bạn. Plan có chi phí giờ cao nhất (compute cộng storage, theo mức giá được kiểm tra cho plan) vượt mức này sẽ bị chặn với `COST_CEILING_EXCEEDED`; ví trống bị chặn với `INSUFFICIENT_BALANCE`. Trang này không nhắc lại mức giá nào: xem [Bảng giá](/vi/guide/pricing).
- **Khóa nhà cung cấp không bao giờ nằm trong plan.** Gửi trong `variables` sẽ nhận `422 PLAN_INPUT_INVALID` kèm một mục `errors[]` là `SECRET_VALUE_IN_PLAN` tại `variables.<KEY>`, và lỗi không lặp lại giá trị. Khóa chỉ thuộc về `secrets` của yêu cầu cài đặt.
- Cấu hình phải nằm trong các mức được đưa ra. Đầu vào không hợp lệ trả `422` kèm đường dẫn trường.

### Blocker

| Mã | Ý nghĩa | Gỡ khi |
|----|---------|--------|
| `CURATED_RELEASE_MISSING` | Chưa có image phát hành đã rà soát được ghim bằng digest. | Có bản phát hành đã rà soát trong định nghĩa. |
| `CURATED_TEMPLATE_HIDDEN` | Đã có bản phát hành nhưng việc triển khai đang bị giữ. | Gỡ việc giữ. |
| `SUBSCRIPTION_LOGIN_DISABLED` | Plan chọn đăng nhập bằng gói (**gói ChatGPT** của Codex hoặc **gói Claude** của Claude Code) trong khi máy chủ tắt `CURATED_SUBSCRIPTION_LOGIN_ENABLED`. Xem [Đăng nhập nhà cung cấp](#provider-sign-in). | Chọn nhà cung cấp khóa API, hoặc hỏi operator cờ có bật không. |
| `CURATED_INSTALL_UNAVAILABLE` | Bản phát hành không cài được từ registry: chưa xuất bản, được lưu với manifest khác, hoặc nhà phát hành bị đình chỉ. | TOSE xuất bản bản phát hành, hoặc gỡ đình chỉ. |
| `VERSION_REVOKED` | Admin nền tảng đã thu hồi version này. | Một bản phát hành mới hơn đã rà soát (version sau). |
| `COMMUNITY_TEMPLATES_DISABLED` (hoặc `SECURITY_GATE_UNAVAILABLE`, `IMAGE_SCANNER_NOT_CONFIGURED`, tùy cấu hình) | Cổng bảo mật từ chối workload registry với cấu hình này. | Nhà vận hành bật cổng và bộ quét image. |
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
- [Runbook template Dewee](/vi/guide/dewee-template) cho đường 1-click có sẵn
- [API key và scope](/vi/api/api-keys)
