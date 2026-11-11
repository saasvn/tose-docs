# Kho mã GitHub cho coding agent

Một coding agent được TOSE tuyển chọn (**Pi**, **Codex** hoặc **Claude Code**) có thể khởi động với một kho mã GitHub của bạn, riêng tư hoặc công khai, đã nằm sẵn trong `/workspace` bền vững của agent. Bạn chọn kho mã và nhánh trong thẻ **Kho mã (không bắt buộc)** của trang triển khai. Bạn không bao giờ phải dán URL, personal access token hay SSH key, và agent không bao giờ nhận credential GitHub nào. Bản checkout chỉ đọc, trừ khi bạn [cho agent push](#cho-agent-push-len-kho-ma).

Để cài một agent, mở **Cloud Agents** trong dashboard ([tổng quan dashboard](/vi/guide/getting-started)).

::: warning Chưa được xác minh trên cluster thật
Tính năng checkout đã được triển khai và có test, nhưng chưa được chứng minh trên cluster thật (theo dõi tại saasvn/tose-app #588; phần hardening tiếp theo ở #621). Hãy coi đây là tính năng mới: sau lần deploy đầu tiên, kiểm tra trạng thái **Tải kho mã** (Repository checkout).
:::

## Bạn cần gì

- Một GitHub App installation đã kết nối với workspace (**Cài đặt → GitHub**), với kho mã được cho phép. Chỉ các kho mã mà tài khoản GitHub của workspace cho phép mới được hiển thị.
- Vai trò **owner** hoặc **admin** của workspace. Người khác gửi `repository` sẽ nhận `403 REPOSITORY_REQUIRES_ADMIN`.
- Một plan của agent được tuyển chọn. Plan template từ registry và nâng cấp không nhận kho mã.

## Chọn kho mã trên trang triển khai

Trang triển khai của agent có thẻ **Kho mã (không bắt buộc)**. Chọn **Thêm kho mã GitHub** để mở thẻ. Bỏ qua mục này thì agent bắt đầu với workspace trống.

1. Nếu workspace chưa kết nối tài khoản GitHub nào, chọn **Kết nối GitHub**. GitHub mở trong thẻ mới: cài ứng dụng TOSE trên tài khoản sở hữu kho mã và cho phép kho mã đó, sau đó quay lại thẻ trình duyệt này và chọn **Kiểm tra lại**. Các câu trả lời của bạn trên trang này được giữ nguyên.
2. Nếu tài khoản GitHub của bạn đã kết nối nhưng chưa gắn với workspace này, chọn **Gắn** kèm tên tài khoản. Chỉ owner hoặc admin mới gắn được tài khoản.
3. Chọn một **Kho mã** trong danh sách (dùng bộ lọc để tìm theo `chủ sở hữu/tên`; mỗi mục hiện **Riêng tư** hoặc **Công khai**), rồi chọn **Nhánh**.
4. Thẻ hiện "`<repo>` ở nhánh `<branch>` sẽ được tải về." Chọn **Bỏ kho mã** để quay lại workspace trống.
5. Tùy chọn: bật **Cho phép agent push lên kho mã này** và chọn các nhánh agent được push. Mặc định push tắt. Xem [Cho agent push lên kho mã](#cho-agent-push-len-kho-ma).

Không có ô nhập URL tự do. Kho mã không có trong danh sách sẽ bị từ chối.

## Plan hiển thị những gì

Khi trang lập plan từ các ô bạn nhập, TOSE đọc kho mã qua installation bằng một token chỉ có quyền đọc nội dung của đúng kho mã đó. Token được dùng một lần rồi thu hồi. Phần tóm tắt plan bên cạnh nút **Triển khai** khi đó được tính giá cùng kho mã và liệt kê mọi lý do chặn liên quan tới kho mã trước khi bạn triển khai. Bản plan đầy đủ, mở được từ liên kết plan (ví dụ liên kết mà thành viên gửi cho owner hoặc admin), có mục **Kho mã** với:

| Trường | Ý nghĩa |
|--------|---------|
| Kho mã và nhánh | Tên bạn đã chọn, và kho mã đó riêng tư hay không. |
| **Commit** | SHA commit đầy đủ mà nhánh trỏ tới lúc plan được tạo. |
| **Tải vào** | `/workspace/<repo>`. |
| **Quyền của TOSE** | Chỉ đọc nội dung kho mã (`contents:read`), là quyền mà bước clone dùng. |
| **Push** | **Bật**, kèm các nhánh agent được push, hoặc **Tắt**. |
| **Khi khởi động lần đầu** | Tác động của bước bootstrap, diễn đạt bằng lời. |

Mục `curated.repository` của plan chứa cùng dữ liệu: `installation_id`, `repo_id`, `full_name`, `private`, `branch`, `commit_sha`, `path`, `access` (`contents:read`), `effects` và, khi agent được push, `push`, `push_branches`, `push_branch_pattern` và `push_remote` ([bên dưới](#plan-hien-thi-gi-khi-co-push)). Nó không bao giờ chứa token hay URL có credential.

**Nhánh di chuyển sau này không làm thay đổi plan đã duyệt.** Commit đã ghim là commit được clone. Commit khác hoặc kho mã khác là một plan khác, với plan hash khác, và bạn phải duyệt lại. Qua API, client có thể ghim một commit cũ hơn của nhánh bằng `commit_sha`, và kho mã mong đợi bằng `repo_id`.

## Cách checkout hoạt động

```json
{
  "curated_template": "codex",
  "name": "My agent",
  "variables": {"CODEX_PROVIDER": "openai"},
  "repository": {"installation_id": 12345678, "full_name": "acme/app", "branch": "main"}
}
```

- Việc clone diễn ra **trước khi agent khởi động**, trong một bootstrap Job chạy một lần riêng biệt, không phải trong pod của agent. Job dùng chính image đã được kiểm duyệt của agent, có thời hạn ngắn, và có network policy riêng chỉ cho phép tới `github.com` cổng 443.
- Job dùng một token GitHub App **ngắn hạn, chỉ đọc** cho đúng kho mã đó. Token đến Job dưới dạng một file chỉ Job đọc được, bị thu hồi khi Job kết thúc, và không bao giờ xuất hiện trong dòng lệnh, biến môi trường, URL clone, git config hay log.
- **Agent không bao giờ nhận token GitHub hay credential GitHub có thể tái sử dụng.** Khi không có push, URL `origin` giữ nguyên `https://github.com/<owner>/<repo>.git`, và agent có thể commit cục bộ nhưng **không thể push**. Khi có push, `origin` trỏ tới git proxy của TOSE; xem [Cho agent push lên kho mã](#cho-agent-push-len-kho-ma).
- Bản clone là commit đã ghim với lịch sử nông (depth 50). Submodule và đối tượng Git LFS không được tải.
- Bootstrap đã hoàn tất sẽ không chạy lại, và một lần chạy lặp không bao giờ ghi đè công việc trong checkout hiện có.
- Nếu `/workspace/<repo>` đã là một git checkout mà config không có credential, nó được giữ nguyên (dù có thay đổi chưa commit hay không). File, symlink, thư mục không rỗng không có `.git`, hoặc checkout có credential trong git config sẽ bị từ chối với `WORKSPACE_NOT_EMPTY`.

## Cho agent push lên kho mã {#cho-agent-push-len-kho-ma}

Agent có thể push commit của nó ngược lên kho mã đã ghim khi triển khai. Push **mặc định tắt**, và bạn chọn khi triển khai (tose-app [#704](https://github.com/saasvn/tose-app/pull/704)).

### Thiết lập

1. **GitHub App cần quyền ghi nội dung.** GitHub App của TOSE phải có quyền kho mã **Contents: Read and write**. Người vận hành nền tảng cấp quyền này trong phần cài đặt của App trên GitHub, rồi mọi tài khoản GitHub đã cài App phải chấp nhận quyền mới trên GitHub. Trước khi đó, plan có push bị chặn với `GITHUB_PERMISSION_MISSING`, khi lập plan, duyệt và cài đặt.
2. **Bật push.** Trong thẻ **Kho mã (không bắt buộc)**, bật **Cho phép agent push lên kho mã này**. Giống như kho mã, chỉ owner hoặc admin của workspace mới lập plan có push.
3. **Chọn nhánh.** Mặc định agent được push lên **mọi nhánh, kể cả nhánh mặc định**. Bật **Chỉ các nhánh tên tose/&lt;agent&gt;/…** để giới hạn vào các nhánh dưới `tose/<slug của bản cài>/`, ví dụ `tose/my-agent/fix-login`.

Qua API, gửi `push` và `push_branches` trong `repository`:

```json
{
  "curated_template": "codex",
  "name": "My agent",
  "variables": {"CODEX_PROVIDER": "openai"},
  "repository": {"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "push_branches": "agent"}
}
```

- `push` là `false` khi bỏ trống, giữ nguyên bản checkout chỉ đọc như trước.
- `push_branches` là `all` (mặc định: mọi nhánh của đúng kho mã đó, kể cả nhánh mặc định) hoặc `agent` (chỉ `tose/<slug của bản cài>/...`). Gửi trường này mà không có `push: true` trả `422` tại `repository.push_branches`.
- Máy chủ mà git proxy chưa có địa chỉ `https` công khai từ chối plan có push với `503 GIT_PROXY_NOT_CONFIGURED`. Hãy tắt push, hoặc liên hệ người vận hành nền tảng.

### Plan hiển thị gì khi có push {#plan-hien-thi-gi-khi-co-push}

Cả hai lựa chọn nằm trong plan hash, nên plan có push là một plan khác với plan không có push. Khi đó `curated.repository` có thêm:

| Trường | Ý nghĩa |
|--------|---------|
| `push` | `true`. Không có khi agent không được push. |
| `push_branches` | `all` hoặc `agent`. |
| `push_branch_pattern` | Các nhánh agent được push: `*`, hoặc `tose/<slug của bản cài>/*`. |
| `push_remote` | Git proxy của TOSE mà `origin` của checkout trỏ tới, ví dụ `https://api.tose.sh/api/git/<checkout_id>`. Không chứa credential. |

`access` vẫn là `contents:read`: trường này mô tả token dùng để clone. Danh sách `effects` mô tả bằng lời việc push cho phép làm gì. Khi bật push, network policy của agent còn cho phép máy chủ API của TOSE ở cổng 443, trong mọi chế độ mạng, và plan liệt kê nó trong `curated.network.destinations`. Sau khi cài, đối tượng `repository` của installation báo `push` và `push_branches`, và trang của agent hiển thị **Push** **Bật** hoặc **Tắt**.

### Cách hoạt động {#cach-hoat-dong-cua-push}

- Agent **không bao giờ nhận token GitHub**. `origin` của checkout trỏ tới git proxy của TOSE, `https://<máy chủ API>/api/git/<checkout_id>`.
- Agent xác thực với proxy bằng một bí mật riêng của checkout, `TOSE_GIT_TOKEN`, được đưa tới pod của agent theo cùng cách các biến bí mật khác. Một git credential helper do bootstrap tin cậy ghi vào kho mã đưa bí mật này cho git khi git hỏi; không token nào được ghi xuống đĩa. Đây không phải credential GitHub: nó chỉ mở được kho mã của đúng checkout này, và chỉ qua TOSE. TOSE chỉ lưu hash của nó, và mỗi lần deploy cấp một bí mật mới.
- Với mỗi thao tác git, proxy tạo một **token GitHub App ngắn hạn chỉ cho đúng kho mã này**: `contents:read` khi fetch và `contents:write` khi push. Proxy chuyển yêu cầu của git tới GitHub với token đó. Agent không bao giờ thấy token.
- **Bảo vệ nhánh và ruleset của GitHub vẫn áp dụng**, vì GitHub kiểm tra mọi lần push. Hãy bảo vệ nhánh mặc định, hoặc chọn nhánh `agent`, nếu agent không nên sửa trực tiếp nhánh đó.
- Với `push_branches: agent`, proxy đọc các nhánh mà một lần push cập nhật trước khi chuyển tiếp bất cứ thứ gì, và từ chối cả lần push khi có nhánh nằm ngoài `tose/<slug của bản cài>/`. Git hiển thị `[remote rejected] main -> main (only tose/<slug>/* branches may be pushed)`.
- **Mọi lần push đều được ghi nhật ký kiểm toán** là `template_installation.git_push`, kèm kho mã, các nhánh và kết quả (`ok`, `rejected` khi GitHub từ chối, `error`, hoặc `denied` kèm mã từ chối). Các yêu cầu git khác bị từ chối được ghi là `template_installation.git_refused`. Không mục nào chứa bí mật, token GitHub hay nội dung kho mã.
- Proxy chỉ hoạt động khi agent đang chạy, hoặc đang được deploy lại. Agent đã dừng, đang ngủ hoặc thất bại, installation đã bị xóa hoặc tạm ngưng, hay GitHub App installation đã bị ngắt khỏi workspace đều bị từ chối.

### Khi git từ chối {#khi-git-tu-choi}

Git hiển thị lần từ chối dưới dạng `remote error: <thông điệp> (<mã>)`:

| Mã | Lý do |
|----|-------|
| `PUSH_DISABLED` | Push đang tắt với agent này. |
| `PUSH_BRANCH_NOT_ALLOWED` | Lần push cập nhật một nhánh nằm ngoài `tose/<slug của bản cài>/`. |
| `GITHUB_PERMISSION_MISSING` | GitHub App của TOSE thiếu **Contents: Read and write**, hoặc tài khoản chưa chấp nhận quyền đó. |
| `INSTALLATION_NOT_RUNNING` | Agent đã dừng, đang ngủ, thất bại hoặc chưa được deploy. |
| `INSTALLATION_DELETED`, `INSTALLATION_SUSPENDED` | Installation đang bị xóa, hoặc bị tạm ngưng. |
| `SCOPE_REVOKED` | GitHub App installation không còn kết nối với workspace. |
| `NO_INSTALLATION`, `PERMISSION_DENIED`, `REPO_REMOVED` | Như trong [Trạng thái và các trường hợp lỗi](#trang-thai-va-cac-truong-hop-loi). `PERMISSION_DENIED` còn có nghĩa kho mã đã bị đổi tên hoặc chuyển giao trên GitHub; xem [Giới hạn](#gioi-han). |
| `GITHUB_UNAVAILABLE` | Không kết nối được tới GitHub. Hãy thử lại. |

Một lần push tối đa 1 GiB. Một checkout chạy được 4 yêu cầu git cùng lúc và gửi 60 yêu cầu mỗi phút; vượt quá thì git nhận `429` (`GIT_RATE_LIMITED`) và có thể thử lại sau.

### Mô hình bảo mật

::: warning Ai chạy được lệnh trong agent đều push được
Khi push bật, bất kỳ ai chạy được lệnh trong agent đều push được lên kho mã đó: bạn và các owner hoặc admin khác trong console của nó, một [tác vụ được giao](/vi/guide/agent-tasks), và một prompt injection mà agent làm theo. Chỉ bật push cho agent mà bạn sẵn sàng cho push, và bảo vệ các nhánh quan trọng trên GitHub.
:::

- Agent không giữ token GitHub nào, và bí mật proxy của nó chỉ mở được đúng một kho mã này qua TOSE.
- Bí mật hết hiệu lực khi agent bị dừng, khi installation bị xóa và khi GitHub App installation bị ngắt khỏi workspace.

### Giới hạn {#gioi-han}

- **Không đổi được push sau khi cài.** Deploy lại từ trang của agent vẫn giữ lựa chọn cũ. Muốn bật, tắt push hoặc đổi nhánh, hãy lập plan và cài một agent mới với lựa chọn mới. Đó là bản cài đặt mới với `/workspace` riêng, nên hãy push công việc trước hoặc chuyển sang bằng git.
- **Đổi tên kho mã làm proxy ngừng hoạt động.** Proxy dùng tên kho mã đã ghim khi cài và không đi theo chuyển hướng của GitHub, nên sau khi đổi tên hoặc chuyển giao kho trên GitHub, git hiển thị `PERMISSION_DENIED`. Deploy lại không khắc phục được: hãy lập plan và cài một agent mới cho tên mới của kho.
- **Agent không mở pull request.** Bạn tự mở trên GitHub từ nhánh mà agent đã push.

## Trạng thái và các trường hợp lỗi {#trang-thai-va-cac-truong-hop-loi}

Duyệt và cài đặt, hai việc mà **Triển khai** thực hiện, đều kiểm tra lại kho mã. Nếu một điều dưới đây xảy ra, chúng từ chối với `409 PLAN_BLOCKED`, và plan mới có cùng vấn đề được lưu ở trạng thái bị chặn:

| Mã | Lý do |
|----|-------|
| `NO_INSTALLATION` | GitHub App installation đã mất hoặc bị tạm ngưng. |
| `PERMISSION_DENIED` | Installation không đọc được nội dung kho mã. |
| `REPO_REMOVED` | Kho mã đã bị xóa hoặc bị gỡ khỏi installation. |
| `BRANCH_MISSING` | Nhánh không còn, hoặc commit đã ghim không còn trên nhánh (ví dụ sau force-push). |
| `SCOPE_REVOKED` | Installation không còn được kết nối với workspace. |
| `REPO_ID_CHANGED` | Một kho mã khác hiện mang tên này (bị xóa rồi tạo lại, hoặc được chuyển giao). Hãy chọn lại để ghim kho mã mới. |

Sau khi cài đặt, trang **Trạng thái** của installation hiển thị **Tải kho mã**:

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Đang chờ** (`pending`) | Checkout sẽ chạy ở lần deploy kế tiếp. |
| **Đang tải về** (`cloning`) | Bootstrap Job đang chạy. |
| **Sẵn sàng** (`ready`) | Kho mã đã nằm trong `/workspace/<repo>`. |
| **Thất bại** (`failed`) | Xem mã bên dưới. Deployment thất bại với `<CODE>: <lý do>` và **agent không được khởi động**. |

Đối tượng `repository` của installation có `status`, `error_code` (khi thất bại), `attempts`, `full_name`, `branch`, `commit` (7 ký tự), `commit_sha`, `path`, `description` và, khi thất bại, `retry_path`.

Một checkout thất bại mang một trong các mã ở trên trừ `REPO_ID_CHANGED` (chỉ là mã chặn khi lập plan), hoặc:

| Mã | Lý do |
|----|-------|
| `WORKSPACE_NOT_EMPTY` | `/workspace` đã có file ở chỗ kho mã sẽ nằm, nên không có gì bị ghi đè. |
| `BOOTSTRAP_FAILED` | Chính việc clone thất bại. Chỉ mã thoát được đọc lại, không bao giờ đọc output của git. |

### Thử lại checkout thất bại

Hãy sửa nguyên nhân (cho phép lại kho mã trên GitHub, hoặc kết nối lại tài khoản), rồi chọn **Thử tải lại**, hoặc gọi API với vai trò owner hoặc admin. Thử lại clone đúng commit đã ghim; nhánh hoặc commit khác cần một plan mới:

```text
POST /api/workspaces/{slug}/template-installations/{id}/repository/retry
```

API key cần `deployments:execute`. Checkout `failed` quay về `pending` và **chạy ở lần deploy kế tiếp**, vì vậy sau đó hãy redeploy agent từ trang của nó. Route trả về:

| Trạng thái | Khi nào |
|------------|---------|
| `200` | Checkout hiện là `pending`. Cũng trả `200`, không đổi, với checkout đã là `pending` hoặc `cloning`. |
| `409 REPOSITORY_READY` | Kho mã đã nằm trong workspace. |
| `409 SCOPE_REVOKED` | Installation chưa được kết nối với workspace. Hãy kết nối trước. |
| `409 INSTALLATION_DELETED` | Installation đã bị xóa. |
| `404 REPOSITORY_NOT_FOUND` | Installation không ghim kho mã nào. |

## Các lỗi khác khi lập plan

| Trạng thái và mã | Lý do |
|------------------|-------|
| `403 REPOSITORY_REQUIRES_ADMIN` | Chỉ owner hoặc admin mới lập plan với kho mã. |
| `422 PLAN_INPUT_INVALID` tại `repository.installation_id` | Installation không được kết nối với workspace này. Một id mà workspace khác đã kết nối cũng nhận cùng câu trả lời. |
| `503 GITHUB_APP_NOT_CONFIGURED` | Máy chủ này chưa có GitHub App. |
| `502 GITHUB_UNAVAILABLE` | Không thể kết nối tới GitHub. Hãy thử lại sau giây lát. |
| `422` tại `repository.push_branches` | Gửi `push_branches` mà không có `push: true`. |
| `503 GIT_PROXY_NOT_CONFIGURED` | Plan yêu cầu push, và git proxy của máy chủ này chưa có địa chỉ `https` công khai. |
| Blocker `GITHUB_PERMISSION_MISSING` | Plan yêu cầu push, và GitHub App của TOSE thiếu **Contents: Read and write** (hoặc tài khoản chưa chấp nhận). Plan được lưu ở trạng thái bị chặn. |

## Liên quan

- Nguồn chuẩn: `docs/curated-agent-templates.md` (mục "GitHub repository" và "Pushing to the repository"), `docs/agent-runtime-security.md` (mục "Trusted repository bootstrap") và `internal/apispec/openapi.yaml` trong `saasvn/tose-app`.
