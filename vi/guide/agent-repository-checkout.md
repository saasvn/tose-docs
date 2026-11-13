# Kho mã GitHub cho coding agent

Một coding agent được TOSE tuyển chọn (**Pi**, **Codex** hoặc **Claude Code**) có thể khởi động với một kho mã GitHub của bạn, riêng tư hoặc công khai, đã nằm sẵn trong `/workspace` bền vững của agent. Bạn chọn kho mã và nhánh trong thẻ **Kho mã (không bắt buộc)** của trang triển khai. Sau khi cài, một agent có thể có [tối đa 10 kho mã](#nhieu-kho-ma-cho-mot-agent), mỗi kho trong thư mục riêng `/workspace/<tên>`. Bạn không bao giờ phải dán URL, personal access token hay SSH key, và agent không bao giờ nhận credential GitHub nào. Bản checkout chỉ đọc, trừ khi bạn [cho agent push](#cho-agent-push-len-kho-ma). Sau khi cài, bạn cũng có thể [cho agent quản lý issue và pull request của kho](#cho-agent-quan-ly-issue-va-pull-request). Bạn cũng có thể [thêm, cấu hình lại hoặc gỡ kho mã sau khi cài](#gan-hoac-doi-kho-ma-sau-khi-cai).

Để cài một agent, mở **Cloud Agents** trong dashboard ([tổng quan dashboard](/vi/guide/getting-started#lam-quen-voi-dashboard)).

::: warning Chưa được xác minh trên cluster thật
Tính năng checkout đã được triển khai và có test, nhưng chưa được chứng minh trên cluster thật (theo dõi tại saasvn/tose-app #588; phần hardening tiếp theo ở #621). Hãy coi đây là tính năng mới: sau lần deploy đầu tiên, kiểm tra trạng thái **Tải kho mã** (Repository checkout).
:::

## Bạn cần gì

- Một GitHub App installation đã kết nối với workspace (**Cài đặt → GitHub**), với kho mã được cho phép. Chỉ các kho mã mà tài khoản GitHub của workspace cho phép mới được hiển thị.
- Vai trò **owner** hoặc **admin** của workspace. Người khác gửi `repository` sẽ nhận `403 REPOSITORY_REQUIRES_ADMIN`.
- Một plan của agent được tuyển chọn. Plan template từ registry và nâng cấp không nhận kho mã.

## Chọn kho mã trên trang triển khai {#chon-kho-ma-tren-trang-trien-khai}

Trang triển khai của agent có thẻ **Kho mã (không bắt buộc)**. Chọn **Thêm kho mã GitHub** để mở thẻ. Bỏ qua mục này thì agent bắt đầu với workspace trống.

1. Nếu workspace chưa kết nối tài khoản GitHub nào, chọn **Kết nối GitHub**. GitHub mở trong thẻ mới: cài ứng dụng TOSE trên tài khoản sở hữu kho mã và cho phép kho mã đó, sau đó quay lại thẻ trình duyệt này và chọn **Kiểm tra lại**. Các câu trả lời của bạn trên trang này được giữ nguyên.
2. Nếu tài khoản GitHub của bạn đã kết nối nhưng chưa gắn với workspace này, chọn **Gắn** kèm tên tài khoản. Chỉ owner hoặc admin mới gắn được tài khoản.
3. Chọn một **Kho mã**, rồi chọn **Nhánh**. Cả hai đều là ô chọn có tìm kiếm: bấm vào ô, gõ một phần `chủ sở hữu/tên` (hoặc tên nhánh) để thu hẹp danh sách, rồi chọn mục khớp. Mỗi kho mã hiện **Riêng tư** hoặc **Công khai**. Phím mũi tên để di chuyển giữa các mục khớp, Enter để chọn và Escape để đóng (tose-app [#785](https://github.com/saasvn/tose-app/pull/785)); không còn ô lọc riêng.
4. Thẻ hiện "`<repo>` ở nhánh `<branch>` sẽ được tải về." Chọn **Bỏ kho mã** để quay lại workspace trống.
5. Tùy chọn: bật **Cho phép agent push lên kho mã này** và chọn các nhánh agent được push. Mặc định push tắt. Xem [Cho agent push lên kho mã](#cho-agent-push-len-kho-ma).

Không có ô nhập URL tự do. Kho mã không có trong danh sách sẽ bị từ chối.

### Kho mã của một tài khoản GitHub khác {#kho-ma-cua-mot-tai-khoan-github-khac}

Danh sách chỉ hiện kho mã của các tài khoản GitHub đã gắn với workspace. Một workspace có thể gắn nhiều tài khoản: ví dụ một tổ chức và tài khoản cá nhân của bạn, hoặc hai tổ chức. Khi kho mã bạn cần thuộc một tài khoản chưa gắn, hãy dùng khối dưới danh sách, "Không thấy kho mã trong danh sách? Có thể nó thuộc một tài khoản GitHub khác." (tose-app [#784](https://github.com/saasvn/tose-app/pull/784)). Khối này có trên trang triển khai và trong biểu mẫu **+ Thêm kho mã** của agent, khi workspace đã gắn ít nhất một tài khoản GitHub.

- **Gắn `<tài khoản>`**: mỗi tài khoản GitHub của bạn đã cài ứng dụng TOSE nhưng chưa gắn với workspace này có một nút. Tổ chức hiện dạng `<tài khoản> (tổ chức)`. Chọn nút đó, danh sách tải lại kèm kho mã của tài khoản ấy. Chỉ owner hoặc admin mới gắn được tài khoản.
- **Kết nối tài khoản GitHub khác**: GitHub mở trong thẻ mới. Cài ứng dụng TOSE trên tài khoản kia (tài khoản cá nhân hoặc một tổ chức khác) và cho phép kho mã, sau đó quay lại thẻ này. Trang đọc lại các danh sách, và tài khoản mới hiện kèm nút **Gắn**; chọn nút đó để thêm kho mã của nó.

Gắn một tài khoản chỉ cho workspace dùng tài khoản đó; các tài khoản đã gắn vẫn giữ nguyên. Muốn gỡ một tài khoản, dùng [Gỡ khỏi workspace](/vi/api/github#detach) trong API.

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

Agent có thể push commit của nó ngược lên kho mã đã ghim khi triển khai, và lên từng kho bạn [thêm sau](#gan-hoac-doi-kho-ma-sau-khi-cai) với push bật. Push được đặt riêng cho từng kho. Trên trang triển khai, push **mặc định tắt**, và bạn chọn cho kho đầu tiên khi triển khai (tose-app [#704](https://github.com/saasvn/tose-app/pull/704)). Từ tose-app [#770](https://github.com/saasvn/tose-app/pull/770), **+ Thêm kho mã** trên trang của agent bắt đầu với push **bật**, cho mọi nhánh; hãy tắt trước khi lưu nếu agent chỉ nên đọc kho đó.

### Thiết lập {#thiet-lap}

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
| `push_remote` | Git proxy của TOSE mà `origin` của checkout trỏ tới, ví dụ `https://api.tose.sh/api/git/<checkout_id>`. Không chứa credential. Checkout tạo từ tose-app [#741](https://github.com/saasvn/tose-app/pull/741) trở đi ghi rõ kho mã trong checkout id: `<template id>r<repository id>`. |

`access` vẫn là `contents:read`: trường này mô tả token dùng để clone. Danh sách `effects` mô tả bằng lời việc push cho phép làm gì. Khi bật push, network policy của agent còn cho phép máy chủ API của TOSE ở cổng 443, trong mọi chế độ mạng, và plan liệt kê nó trong `curated.network.destinations`. Sau khi cài, mỗi phần tử của `repositories` trong installation (và `repository`, phần tử đầu tiên) báo `push` và `push_branches`, và trang của agent hiển thị nhãn **Push** trên mỗi kho mà agent được push. Bạn có thể đổi cả hai về sau; xem [Gắn hoặc đổi kho mã của agent sau khi cài](#gan-hoac-doi-kho-ma-sau-khi-cai).

### Cách hoạt động {#cach-hoat-dong-cua-push}

- Agent **không bao giờ nhận token GitHub**. `origin` của checkout trỏ tới git proxy của TOSE, `https://<máy chủ API>/api/git/<checkout_id>`.
- Agent xác thực với proxy bằng một bí mật riêng của checkout, `TOSE_GIT_TOKEN`, được đưa tới pod của agent theo cùng cách các biến bí mật khác. Một git credential helper do bootstrap tin cậy ghi vào kho mã đưa bí mật này cho git khi git hỏi; không token nào được ghi xuống đĩa. Đây không phải credential GitHub: chỉ qua TOSE, nó chỉ mở được các kho mã mà agent được push. Agent có [nhiều kho mã](#nhieu-kho-ma-cho-mot-agent) giữ một bí mật như vậy cho tất cả các kho đó. TOSE chỉ lưu hash của nó, và mỗi lần deploy cấp một bí mật mới.
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
Khi push bật, bất kỳ ai chạy được lệnh trong agent đều push được lên các kho mã cho phép push: bạn và các owner hoặc admin khác trong console của nó, một [tác vụ được giao](/vi/guide/agent-tasks), và một prompt injection mà agent làm theo. Chỉ bật push cho agent mà bạn sẵn sàng cho push, và bảo vệ các nhánh quan trọng trên GitHub.
:::

- Agent không giữ token GitHub nào, và bí mật proxy của nó chỉ mở được, qua TOSE, các kho mã mà nó được push.
- Bí mật hết hiệu lực khi agent bị dừng, khi installation bị xóa, khi GitHub App installation bị ngắt khỏi workspace, và ngay lập tức khi bạn tắt push cho một kho hoặc gỡ một kho [sau khi cài](#gan-hoac-doi-kho-ma-sau-khi-cai). Lần deploy kế tiếp cấp bí mật mới cho các kho vẫn cho push.

### Giới hạn {#gioi-han}

- **Đổi push trên trang của agent, không phải bằng deploy lại thông thường.** Deploy lại từ trang của agent vẫn giữ lựa chọn cũ. Muốn bật, tắt push hoặc đổi nhánh được push, hãy dùng **Quyền** trên dòng của kho đó trong tab **Kho mã**; xem [Gắn hoặc đổi kho mã của agent sau khi cài](#gan-hoac-doi-kho-ma-sau-khi-cai).
- **Đổi tên kho mã làm proxy ngừng hoạt động.** Proxy dùng tên kho mã đã ghim khi cài (hoặc ở lần đổi kho mã gần nhất) và không đi theo chuyển hướng của GitHub, nên sau khi đổi tên hoặc chuyển giao kho trên GitHub, git hiển thị `PERMISSION_DENIED`. Deploy lại không khắc phục được: trong tab **Kho mã** của agent, hãy [gỡ mục cũ rồi thêm kho mã](#gan-hoac-doi-kho-ma-sau-khi-cai) theo tên mới. Nếu `/workspace/<tên>` vẫn còn bản clone cũ và TOSE không nhận ra đó là cùng một kho, checkout thất bại với `WORKSPACE_NOT_EMPTY`; hãy chuyển thư mục đó sang chỗ khác trong agent trước.
- **Chỉ có push thì agent không mở pull request.** Bạn tự mở trên GitHub từ nhánh mà agent đã push, hoặc [cho agent quản lý issue và pull request](#cho-agent-quan-ly-issue-va-pull-request) để nó tự mở.

## Cho agent quản lý issue và pull request {#cho-agent-quan-ly-issue-va-pull-request}

Agent đã cài có thể tạo và cập nhật issue và pull request của các kho mã của nó qua TOSE, vẫn không giữ token GitHub nào (tose-app [#753](https://github.com/saasvn/tose-app/pull/753)). Tính năng được đặt **riêng cho từng kho**, và chỉ dành cho agent đã cài: plan không thể yêu cầu tính năng này, nên mọi kho chọn khi triển khai đều bắt đầu với tính năng tắt. Kho thêm sau bằng **+ Thêm kho mã** bắt đầu với tính năng **bật** (tose-app [#770](https://github.com/saasvn/tose-app/pull/770)); bỏ chọn ô trước khi lưu để giữ tắt.

### Bật tính năng {#bat-tinh-nang-issue-va-pull-request}

1. **GitHub App cần quyền Issues và Pull requests.** GitHub App của TOSE phải có quyền kho **Issues: Read and write** và **Pull requests: Read and write**. Người vận hành nền tảng cấp các quyền này trong cài đặt của App trên GitHub, sau đó mọi tài khoản GitHub đã cài App phải chấp nhận chúng trên installation của mình. Cho tới lúc đó, mọi lần lưu với tính năng đang bật đều bị từ chối với `409 GITHUB_PERMISSION_MISSING`.
2. **Bật cho một kho.** Trên trang của agent, chọn **Quyền** trên dòng của kho trong tab **Kho mã** và bật **Cho phép agent quản lý issue và pull request**. Chỉ owner hoặc admin của workspace đổi được. Chọn **Lưu và khởi động lại**: thay đổi tới agent ở lần deploy kế tiếp.
3. Sau đó dòng của kho có nhãn **Issues/PR**, và dấu **?** cạnh dòng ghi "Issue và pull request qua TOSE".

Qua API, gửi `github_api: true` trong body của [`PUT .../repository`](#qua-api):

```json
{"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "github_api": true}
```

- `github_api` là `false` khi bỏ trống. Body thay toàn bộ thiết lập của kho, nên bỏ trường này là tắt tính năng.
- Tính năng không cần `push`: agent có thể quản lý issue và pull request của kho mà nó không được push, và bí mật cấp chỉ cho tính năng này không bao giờ mở được `git push`.
- Gửi `repository.github_api` trong plan trả `422`. Hãy cài agent trước, rồi mới bật.
- Mỗi phần tử trong `repositories` của installation có `github_api` và, khi bật, `api_path` (`/api/gh/<checkout_id>`), đường dẫn proxy của kho đó trên API của TOSE.

### Agent dùng tính năng thế nào

Ở lần deploy kế tiếp, pod của agent nhận hai biến:

| Biến | Giá trị |
|------|---------|
| `TOSE_GIT_TOKEN` | Bí mật proxy của agent, cũng là bí mật dùng cho git push. Gửi nó làm bearer token. |
| `TOSE_GITHUB_API` | Mỗi kho đã bật có một mục `owner/name=URL`, các mục cách nhau bằng dấu cách. Mỗi URL có dạng `https://<API host>/api/gh/<checkout_id>`. |

Đường dẫn sau URL tính từ kho, nên `POST $URL/issues` tương ứng `POST /repos/<owner>/<name>/issues` của GitHub. Yêu cầu và câu trả lời là của chính GitHub REST API:

```bash
# URL proxy của acme/app
URL=$(printf '%s\n' $TOSE_GITHUB_API | sed -n 's#^acme/app=##p')

# Mở một issue
curl -sS -H "Authorization: Bearer $TOSE_GIT_TOKEN" \
  -d '{"title":"Login fails on Safari","body":"Steps to reproduce…","labels":["bug"]}' \
  "$URL/issues"

# Mở pull request từ nhánh agent đã push
curl -sS -H "Authorization: Bearer $TOSE_GIT_TOKEN" \
  -d '{"title":"Fix login on Safari","head":"tose/my-agent/fix-login","base":"main"}' \
  "$URL/pulls"
```

Body phải là JSON, tối đa 1 MiB. Các liên kết phân trang của GitHub (`Link`) được viết lại để trỏ về proxy, nên client đi theo được.

### Agent được và không được làm gì {#agent-duoc-va-khong-duoc-lam-gi}

| Được phép | Yêu cầu |
|-----------|---------|
| Issue | Tạo, đọc, sửa và đóng (`issues`, `issues/{n}`); bình luận (`issues/{n}/comments`, `issues/comments/{id}`); nhãn (`issues/{n}/labels`); người được gán (`issues/{n}/assignees`); sự kiện (`issues/{n}/events`). |
| Kho mã | Đọc thông tin kho, nhãn, người có thể được gán và milestone (`labels`, `assignees`, `milestones`). |
| Pull request | Tạo, đọc và sửa (`pulls`, `pulls/{n}`); tệp và commit; bình luận review (`pulls/{n}/comments`); review (`pulls/{n}/reviews`); người được mời review. |

**Mọi thứ khác bị từ chối** với `403 GITHUB_API_ENDPOINT_NOT_ALLOWED`: merge pull request, nội dung kho, cài đặt, webhook, Actions, deployment và mọi kho khác. Để đổi tệp, agent [push](#cho-agent-push-len-kho-ma) một nhánh; một người merge pull request trên GitHub.

GitHub gán issue cho **username GitHub** của collaborator của kho, không gán theo địa chỉ email.

### Cách hoạt động và bảo mật

- Agent **không bao giờ giữ token GitHub**. Với mỗi yêu cầu, proxy dùng một **token GitHub App ngắn hạn chỉ cho đúng kho đó**, chỉ có `issues: write`, `pull_requests: write` và `metadata: read` (không có quyền nội dung), và dùng lại token cho tới năm phút trước khi hết hạn.
- Proxy không đi theo chuyển hướng và chỉ chuyển một tập header phản hồi cố định.
- **Mọi thao tác ghi và mọi yêu cầu bị từ chối đều được ghi nhật ký kiểm toán** là `template_installation.github_api`, kèm kho mã, phương thức, đường dẫn và kết quả; bí mật sai được ghi tối đa một lần mỗi phút cho mỗi kho. Không mục nào chứa bí mật hay token GitHub.
- Proxy chỉ trả lời khi agent đang chạy, GitHub App installation vẫn kết nối với workspace và kho vẫn cho phép. Tắt tính năng, hoặc gỡ kho, làm bí mật của agent hết hiệu lực ngay; lần deploy kế tiếp cấp bí mật mới cho các kho vẫn cho push hoặc API.
- Khi còn kho nào cho push hoặc API, mạng của agent cho phép máy chủ API của TOSE ở cổng 443, trong mọi chế độ mạng.
- Proxy có cùng giới hạn với git proxy nhưng đếm riêng với git: 4 yêu cầu cùng lúc và 60 yêu cầu mỗi phút cho mỗi kho, vượt quá thì `429 GIT_RATE_LIMITED`.

::: warning Bất kỳ ai chạy được lệnh trong agent đều ghi được issue và pull request
Gồm bạn và các owner hoặc admin khác trong console của agent, một [tác vụ được giao](/vi/guide/agent-tasks), và một prompt injection mà agent làm theo. Cách này không merge hay đổi tệp được, nhưng mở, sửa, đóng và bình luận được. Chỉ bật cho agent mà bạn tin tưởng với những việc đó, và giữ branch protection cho các nhánh quan trọng.
:::

### Khi proxy từ chối

Proxy trả JSON `{"code": "…", "message": "…"}`:

| Mã trạng thái và mã lỗi | Lý do |
|-------------------------|-------|
| `401 GIT_TOKEN_INVALID` | Không có bearer token, hoặc không phải `TOSE_GIT_TOKEN` hiện tại của agent. Mỗi lần deploy cấp bí mật mới, và bí mật cũ hết hiệu lực một lúc sau đó. |
| `403 GITHUB_API_DISABLED` | Tính năng đang tắt cho kho này. Owner hoặc admin bật nó trong **Quyền** ở tab **Kho mã**. |
| `403 GITHUB_API_ENDPOINT_NOT_ALLOWED` | Yêu cầu không nằm trong [danh sách được phép](#agent-duoc-va-khong-duoc-lam-gi). |
| `403 INSTALLATION_NOT_RUNNING`, `INSTALLATION_DELETED`, `INSTALLATION_SUSPENDED`, `SCOPE_REVOKED` | Như trong [Khi git từ chối](#khi-git-tu-choi). |
| `400 GIT_REQUEST_INVALID` | Body không phải JSON. |
| `413`/`414 GIT_REQUEST_TOO_LARGE` | Body vượt 1 MiB, hoặc query quá dài. |
| `429 GIT_RATE_LIMITED` | Quá 4 yêu cầu cùng lúc hoặc 60 yêu cầu mỗi phút cho kho này. Hãy thử lại sau. |
| `502 GITHUB_PERMISSION_MISSING` | GitHub App của TOSE thiếu **Issues** hoặc **Pull requests: Read and write**, hoặc installation này chưa chấp nhận. |
| `502 NO_INSTALLATION`, `PERMISSION_DENIED`, `REPO_REMOVED` | GitHub từ chối cấp token cho kho, như trong [Trạng thái và các trường hợp lỗi](#trang-thai-va-cac-truong-hop-loi). |
| `502 GITHUB_UNAVAILABLE` | Không kết nối được tới GitHub. Hãy thử lại. |
| `503 GITHUB_UNAVAILABLE` | TOSE không đọc được bản ghi kho của agent. Hãy thử lại. |
| `503 GIT_PROXY_NOT_CONFIGURED` | Máy chủ này chưa có GitHub API proxy. |

Mọi mã trạng thái khác là câu trả lời của chính GitHub, được chuyển nguyên: ví dụ `422` khi người được gán hoặc nhãn không hợp lệ, hay `404` khi issue không tồn tại.

## Gắn hoặc đổi kho mã của agent sau khi cài {#gan-hoac-doi-kho-ma-sau-khi-cai}

Bạn không phải cài lại agent để thêm hay đổi kho mã (tose-app [#741](https://github.com/saasvn/tose-app/pull/741), [#746](https://github.com/saasvn/tose-app/pull/746)). Trên trang của agent (**Cloud Agents**, rồi chọn agent, tại `/w/<workspace>/templates/<agent>`), tab **Kho mã** liệt kê mọi kho mã của agent và cho **owner** hoặc **admin** của workspace:

- **thêm** kho mã, tối đa 10 kho;
- **bật hoặc tắt push** cho từng kho, và chọn nhánh được push (mọi nhánh, hoặc chỉ `tose/<slug của bản cài>/…`);
- cho agent [quản lý issue và pull request](#cho-agent-quan-ly-issue-va-pull-request) của từng kho;
- **thử tải lại** một checkout thất bại;
- **gỡ** từng kho mã.

### Nhiều kho mã cho một agent {#nhieu-kho-ma-cho-mot-agent}

- Một agent có **tối đa 10 kho mã**. Mỗi kho được clone vào thư mục riêng, `/workspace/<tên>`, trong đó `<tên>` là tên kho không kèm owner.
- Hai kho cùng tên (không phân biệt hoa thường) không dùng chung được một thư mục: thêm `other-org/app` vào agent đã có `acme/app` bị từ chối với `REPOSITORY_FOLDER_TAKEN`. Hãy gỡ kho thứ nhất rồi thêm kho kia.
- Các kho được clone **lần lượt, kho cũ nhất trước**, trước khi agent khởi động. **Lần clone thất bại đầu tiên dừng cả lần deploy**: các kho sau đó không được clone. Agent đang chạy được khởi động lại như trước, với các kho đã clone xong; agent chưa chạy thì vẫn dừng. Hãy sửa nguyên nhân rồi [thử lại](#thu-lai-checkout-that-bai).
- **Push và issue/pull request được đặt riêng cho từng kho.** Agent giữ **một** bí mật, `TOSE_GIT_TOKEN`, cho mọi kho mà nó được push hoặc quản lý issue và pull request. Tắt một trong hai cho một kho, hoặc gỡ một kho, làm bí mật đó hết hiệu lực ngay; lần deploy kế tiếp cấp bí mật mới cho các kho vẫn cho phép. Khi không còn kho nào cho push hay API nữa, lần deploy kế tiếp cũng bỏ máy chủ API của TOSE khỏi mạng của agent.
- Kho chọn lúc triển khai là kho đầu tiên. Installation vẫn có `repository`, chính là phần tử đầu của `repositories`, nên các client chỉ biết một kho vẫn hoạt động.

### Dùng tab Kho mã {#dung-tab-kho-ma}

1. Mở trang của agent và chọn tab **Kho mã** (hoặc ô **Kho mã** ở **Tổng quan**). Agent chưa có kho mã hiển thị "Chưa có kho mã." Mỗi kho là một dòng với tên, nhánh, trạng thái checkout và, khi agent được push, nhãn **Push**, cùng nhãn **Issues/PR** khi agent được quản lý issue và pull request. Dấu **?** cạnh mỗi dòng cho xem thư mục, nhánh, commit, thiết lập push và việc issue và pull request có đi qua TOSE hay không.
2. Để thêm, chọn **+ Thêm kho mã**. Bộ chọn giống trang triển khai sẽ mở ra: tài khoản GitHub, **Kho mã**, **Nhánh**, và **Cho phép agent push lên kho mã này** cùng lựa chọn nhánh ([Chọn kho mã trên trang triển khai](#chon-kho-ma-tren-trang-trien-khai) giải thích từng bước; với kho mã của tài khoản cá nhân hoặc của tổ chức thứ hai, xem [Kho mã của một tài khoản GitHub khác](#kho-ma-cua-mot-tai-khoan-github-khac)), tiếp theo là **Cho phép agent quản lý issue và pull request**. Ở đây mọi quyền đều bắt đầu **bật**: push được phép lên mọi nhánh, kể cả nhánh mặc định, và ô issue và pull request đã được chọn, để agent làm việc với kho ngay. Tắt bớt trước khi lưu nếu bạn muốn ít quyền hơn. Trang triển khai vẫn bắt đầu với push tắt. Nếu lưu bị từ chối với `409 GITHUB_PERMISSION_MISSING`, GitHub App đang thiếu **Contents: Read and write** (cần cho push) hoặc **Issues** và **Pull requests** (cần cho ô issue và pull request): hãy tắt quyền mà người vận hành chưa cấp rồi lưu lại. Trên máy chủ không có git proxy, lưu khi bật một trong hai sẽ bị từ chối với `503 GIT_PROXY_NOT_CONFIGURED`; tắt cả hai để thêm kho chỉ đọc. Nút bị vô hiệu khi agent đã có 10 kho.
3. Để đổi push, hoặc issue và pull request, của một kho, chọn **Quyền** trên dòng của kho đó. Kho đang chờ hoặc đang được clone chưa có **Quyền** cho tới khi checkout xong.
4. Chọn **Lưu và khởi động lại**. Thẻ hiển thị "Đã lưu. Đang khởi động lại agent…", rồi "Đã lưu. Agent đang khởi động lại; kho mã sẽ có trong /workspace khi agent chạy lại." Nếu bạn lưu mà không đổi gì, thẻ hiển thị "Không có gì thay đổi." và agent không khởi động lại.
5. Để bỏ một kho, chọn **Gỡ** trên dòng của kho rồi xác nhận. Agent sẽ khởi động lại. Checkout thất bại còn có nút **Thử tải lại** trên dòng của nó.

**Khi lưu, agent khởi động lại**, vì thay đổi chỉ tới agent qua một lần deploy. **Các tệp đã có trong `/workspace` không bao giờ bị xoá.** Nếu chính việc khởi động lại thất bại, thay đổi vẫn được lưu và thẻ báo "Đã lưu nhưng không khởi động lại được agent (…). Hãy triển khai lại agent để áp dụng." Hãy deploy agent từ trang của nó để áp dụng.

### Điều gì xảy ra khi lưu

| Bạn đổi | Điều xảy ra trong `/workspace` |
|---------|--------------------------------|
| Thêm kho mã | Kho được clone vào `/workspace/<tên>` trước khi agent khởi động, như lúc cài. Thư mục cùng tên đã chứa tệp khác hoặc bản clone của một kho GitHub khác không bao giờ bị ghi đè: checkout thất bại với `WORKSPACE_NOT_EMPTY` (xem [Trạng thái và các trường hợp lỗi](#trang-thai-va-cac-truong-hop-loi)). Thư mục của các kho khác không bị động tới. |
| Bật hoặc tắt push cho kho đã clone | Bản clone giữ nguyên tệp. Chỉ `origin` của nó được chuyển: sang git proxy của TOSE khi có push, về lại `https://github.com/<owner>/<repo>.git` khi không. `origin` do bạn tự đặt được giữ nguyên. |
| Đổi nhánh được push của một kho | Quy tắc nhánh (`all` hoặc `agent`) có hiệu lực ngay; không có gì trong `/workspace` thay đổi. |
| Chọn nhánh khác của kho đã clone | Bị từ chối với `REPOSITORY_ALREADY_CLONED`. Hãy đổi nhánh bằng git ngay trong agent (`git fetch`, `git switch`). Bản clone chưa thành công (đang chờ hoặc thất bại) vẫn đổi nhánh được. |
| Gỡ một kho | Tệp của kho vẫn nằm trong `/workspace`, nhưng agent không thể fetch hay push kho đó qua TOSE nữa. |

**Bản clone còn sót lại không push được vào kho khác.** Mọi checkout tạo từ tose-app #741 trở đi có proxy remote ghi rõ kho mã, `https://<máy chủ API>/api/git/<template id>r<repository id>`. Proxy từ chối remote của kho khác, và từ chối remote trần `/api/git/<template id>` của checkout đó. Vì vậy thư mục mà một kho đã gỡ để lại trong `/workspace` không fetch được từ các kho hiện tại của agent, cũng không push được vào đó. Checkout cũ hơn mà kho chưa từng đổi vẫn giữ remote trần và vẫn hoạt động.

### Clone và agent đang chạy

Việc clone chạy trong một Job chạy một lần riêng. **Nếu agent đang chạy, lần deploy dừng nó trước**, để Job gắn được ổ đĩa của agent trên bất kỳ node nào còn chỗ, rồi lần deploy khởi động lại agent. Nếu clone thất bại, agent được khởi động lại như trước. Điều này sửa lỗi deploy bị kẹt ở "deploying" tới khi `DeadlineExceeded` khi node của agent đã đầy (tose-app [#745](https://github.com/saasvn/tose-app/pull/745)). Job ưu tiên node mà agent vừa chạy, nơi ổ đĩa của nó vẫn đang được gắn, nên ổ đĩa không phải di chuyển; đây chỉ là ưu tiên, không phải bắt buộc, nên node đã đầy hoặc không còn cũng không làm kẹt việc checkout. Điều này sửa lỗi `BOOTSTRAP_FAILED` (Job bị `DeadlineExceeded` trong lúc ổ đĩa chuyển sang node khác) khi thêm kho mã cho một agent đang chạy (tose-app [#764](https://github.com/saasvn/tose-app/pull/764)).

### Qua API

Các route cần **owner** hoặc **admin** của workspace, đăng nhập hoặc dùng API key có `deployments:execute`. Ứng dụng MCP đã kết nối bị từ chối với `403 REPOSITORY_REQUIRES_PERSON`; hãy đổi kho mã trên dashboard.

```text
PUT    /api/workspaces/{slug}/template-installations/{id}/repository
DELETE /api/workspaces/{slug}/template-installations/{id}/repositories/{repo_id}
DELETE /api/workspaces/{slug}/template-installations/{id}/repository
```

`PUT` thêm một kho mà agent chưa có, hoặc đổi push hay issue và pull request cho một kho agent đã có. Kho được so khớp theo `repo_id` khi bạn gửi trường này, nếu không thì theo `full_name`. Body giống `repository` của plan: bắt buộc `installation_id`, `full_name` và `branch`; tùy chọn `commit_sha`, `repo_id`, `push` (mặc định `false`), `push_branches` (`all`, mặc định, hoặc `agent`, chỉ đi kèm `push`) và `github_api` (mặc định `false`, xem [Cho agent quản lý issue và pull request](#cho-agent-quan-ly-issue-va-pull-request)). Không cần plan mới. Body thay toàn bộ thiết lập của kho đó, nên bỏ `push` hoặc `github_api` là tắt mục đó cho kho.

```json
{"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "push_branches": "agent"}
```

`DELETE .../repositories/{repo_id}` gỡ một kho, xác định bằng id GitHub của nó (`repo_id` trong `repositories`). `DELETE .../repository` gỡ **tất cả**. Cả hai không có body, đều xoá bản ghi checkout và làm bí mật git hết hiệu lực; tệp vẫn được giữ.

Cả ba trả `200` với:

```json
{
  "installation": {
    "id": "…",
    "repository": {"full_name": "acme/app", "repo_id": 1296269, "branch": "main", "status": "ready", "push": true, "push_branches": "agent"},
    "repositories": [
      {"full_name": "acme/app", "repo_id": 1296269, "branch": "main", "status": "ready", "push": true, "push_branches": "agent"},
      {"full_name": "acme/docs", "repo_id": 1296270, "branch": "main", "status": "pending", "push": false, "github_api": true, "api_path": "/api/gh/<checkout_id>"}
    ]
  },
  "restart_required": true,
  "deploy_path": "/api/workspaces/acme/templates/claude-code-1/deploy"
}
```

Khi `restart_required` là `true`, hãy áp dụng thay đổi bằng cách deploy lại agent:

```text
POST {deploy_path}
{"mode": "image"}
```

`restart_required` là `false` khi `PUT` không đổi gì. Hai route `DELETE` luôn trả `true`.

| Trạng thái và mã | Lý do |
|------------------|-------|
| `403` | Bạn không phải owner hoặc admin của workspace, hoặc API key thiếu `deployments:execute`. |
| `403 REPOSITORY_REQUIRES_PERSON` | Một ứng dụng đã kết nối gửi yêu cầu. Hãy dùng dashboard. |
| `404 INSTALLATION_NOT_FOUND` | Không có installation với id này trong workspace. |
| `404 REPOSITORY_NOT_FOUND` | `DELETE` với agent không có kho mã, hoặc không có kho được nêu. |
| `409 REPOSITORY_LIMIT` | Agent đã có 10 kho mã. Hãy gỡ bớt một kho trước. |
| `409 REPOSITORY_FOLDER_TAKEN` | Một kho khác của agent có cùng tên, nên sẽ dùng chung thư mục `/workspace/<tên>`. Hãy gỡ kho đó trước. |
| `409 REPOSITORY_ALREADY_CLONED` | Nhánh khác của kho đã clone. Hãy đổi nhánh bằng git ngay trong agent. |
| `409 REPOSITORY_CLONING` | Đang clone. Đợi lần deploy xong rồi thử lại. |
| `409 REPOSITORY_CHANGED` | Người khác vừa đổi kho mã của agent. Tải lại rồi thử lại. |
| `409 NOT_A_CLOUD_AGENT` | Chỉ agent Claude Code, Codex và Pi mới có kho mã. |
| `409 INSTALLATION_DELETED` | Installation đã hoặc đang bị xoá. |
| `409` `BRANCH_MISSING`, `PERMISSION_DENIED`, `REPO_REMOVED`, `NO_INSTALLATION`, `REPO_ID_CHANGED`, `GITHUB_PERMISSION_MISSING` | Câu trả lời của GitHub về kho mã, như trong [Trạng thái và các trường hợp lỗi](#trang-thai-va-cac-truong-hop-loi) và [Thiết lập](#thiet-lap). `GITHUB_PERMISSION_MISSING` khi có `github_api` nghĩa là App thiếu **Issues** hoặc **Pull requests: Read and write** ([Bật tính năng](#bat-tinh-nang-issue-va-pull-request)). |
| `422` tại `repository.installation_id` | GitHub App installation không được kết nối với workspace này. |
| `503 GITHUB_APP_NOT_CONFIGURED`, `503 GIT_PROXY_NOT_CONFIGURED` | Máy chủ này chưa có GitHub App, hoặc chưa có địa chỉ git proxy công khai cho push hay issue và pull request. |
| `502 GITHUB_UNAVAILABLE` | Không kết nối được tới GitHub. Hãy thử lại. |

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

Sau khi cài đặt, trang **Trạng thái** của installation hiển thị **Tải kho mã**, và tab **Kho mã** của agent hiển thị cùng trạng thái trên dòng của mỗi kho:

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Đang chờ** (`pending`) | Checkout sẽ chạy ở lần deploy kế tiếp. |
| **Đang tải về** (`cloning`) | Bootstrap Job đang chạy. |
| **Sẵn sàng** (`ready`) | Kho mã đã nằm trong `/workspace/<repo>`. |
| **Thất bại** (`failed`) | Xem mã bên dưới. Deployment thất bại với `<CODE>: <lý do>`. Agent chưa chạy thì **không được khởi động**; agent đang chạy được khởi động lại như trước. |

Mảng `repositories` của installation liệt kê mọi kho mã của agent, kho cũ nhất trước (tối đa 10; không có khi agent chưa có kho). `repository` là phần tử đầu tiên, giữ lại cho client chỉ biết một kho. Mỗi phần tử có `status`, `error_code` (khi thất bại), `attempts`, `full_name`, `branch`, `commit` (7 ký tự), `commit_sha`, `path`, `description`, `push` (và `push_branches` khi có push), `installation_id`, `repo_id` và, khi thất bại, `retry_path`.

Một checkout thất bại mang một trong các mã ở trên trừ `REPO_ID_CHANGED` (chỉ là mã chặn khi lập plan), hoặc:

| Mã | Lý do |
|----|-------|
| `WORKSPACE_NOT_EMPTY` | `/workspace` đã có file ở chỗ kho mã sẽ nằm, nên không có gì bị ghi đè. |
| `BOOTSTRAP_FAILED` | Chính việc clone thất bại. Chỉ mã thoát được đọc lại, không bao giờ đọc output của git. |

### Thử lại checkout thất bại {#thu-lai-checkout-that-bai}

Hãy sửa nguyên nhân (cho phép lại kho mã trên GitHub, hoặc kết nối lại tài khoản), rồi chọn **Thử tải lại**, hoặc gọi API với vai trò owner hoặc admin. Thử lại clone đúng các commit đã ghim; muốn nhánh hoặc commit khác của một kho chưa clone được, hãy [lưu lại kho đó với nhánh mới](#gan-hoac-doi-kho-ma-sau-khi-cai):

```text
POST /api/workspaces/{slug}/template-installations/{id}/repository/retry
```

API key cần `deployments:execute`. **Mọi** checkout `failed` của agent quay về `pending` và **chạy ở lần deploy kế tiếp**; các kho đã `ready` không bị clone lại. Nút **Thử tải lại** trong tab **Kho mã** của trang agent tự khởi động lại agent; nếu thử lại qua API (hoặc từ trang trạng thái triển khai), hãy tự deploy lại agent (`POST .../templates/{agent}/deploy` với `{"mode":"image"}`, hoặc từ trang của agent). Route trả về:

| Trạng thái | Khi nào |
|------------|---------|
| `200` | Các checkout thất bại hiện là `pending`. Cũng trả `200`, không đổi, khi các checkout chưa sẵn sàng đã là `pending` hoặc `cloning`. |
| `409 REPOSITORY_READY` | Mọi kho mã của agent đã nằm trong workspace. |
| `409 SCOPE_REVOKED` | GitHub App installation của một kho thất bại chưa được kết nối với workspace. Hãy kết nối trước. |
| `409 INSTALLATION_DELETED` | Installation đã bị xóa. |
| `404 REPOSITORY_NOT_FOUND` | Agent không có kho mã nào. |

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

- Nguồn chuẩn: `docs/curated-agent-templates.md` (mục "GitHub repository", "Pushing to the repository" và "After install: several repositories, each in its own folder"), `docs/agent-runtime-security.md` (mục "Trusted repository bootstrap") và `internal/apispec/openapi.yaml` trong `saasvn/tose-app`.
