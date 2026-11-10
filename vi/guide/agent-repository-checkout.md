# Kho mã GitHub cho coding agent

Một coding agent được TOSE tuyển chọn (**Pi**, **Codex** hoặc **Claude Code**) có thể khởi động với một kho mã GitHub của bạn, riêng tư hoặc công khai, đã nằm sẵn trong `/workspace` bền vững của agent. Bạn chọn kho mã và nhánh trong wizard cài đặt. Bạn không bao giờ phải dán URL, personal access token hay SSH key, và agent không bao giờ nhận credential nào.

Để cài một agent, mở **Template catalog** trong dashboard ([tổng quan dashboard](/vi/guide/getting-started)).

::: warning Chưa được xác minh trên cluster thật
Tính năng checkout đã được triển khai và có test, nhưng chưa được chứng minh trên cluster thật (theo dõi tại saasvn/tose-app #588 và #621). Hãy coi đây là tính năng mới: sau lần deploy đầu tiên, kiểm tra trạng thái **Tải kho mã** (Repository checkout).
:::

## Bạn cần gì

- Một GitHub App installation đã kết nối với workspace (**Settings → GitHub**), với kho mã được cho phép. Chỉ các kho mã mà tài khoản GitHub của workspace cho phép mới được hiển thị.
- Vai trò **owner** hoặc **admin** của workspace. Người khác gửi `repository` sẽ nhận `403 REPOSITORY_REQUIRES_ADMIN`.
- Một plan của agent được tuyển chọn. Plan template từ registry và nâng cấp không nhận kho mã.

## Chọn kho mã trong wizard

Bước **Cấu hình** có mục **Kho mã (không bắt buộc)**. Bỏ qua mục này thì agent bắt đầu với workspace trống.

1. Nếu workspace chưa kết nối tài khoản GitHub nào, chọn **Kết nối GitHub**. GitHub mở trong thẻ mới: cài ứng dụng TOSE trên tài khoản sở hữu kho mã và cho phép kho mã đó. Quay lại thẻ wizard và chọn **Kiểm tra lại**. Các câu trả lời của bạn trên trang vẫn được giữ.
2. Nếu tài khoản GitHub của bạn đã kết nối nhưng chưa gắn với workspace này, chọn **Gắn** bên cạnh tài khoản. Chỉ owner hoặc admin mới gắn được tài khoản.
3. Chọn một **Kho mã** trong danh sách (dùng bộ lọc để tìm theo `chủ sở hữu/tên`; mỗi mục hiện **Riêng tư** hoặc **Công khai**), rồi chọn **Nhánh**.
4. Wizard hiện "`<repo>` ở nhánh `<branch>` sẽ được tải về." Chọn **Bỏ kho mã** để quay lại workspace trống.

Không có ô nhập URL tự do. Kho mã không có trong danh sách sẽ bị từ chối.

## Plan hiển thị những gì

Khi bạn tạo plan, TOSE đọc kho mã qua installation bằng một token chỉ có quyền đọc nội dung của đúng kho mã đó. Token được dùng một lần rồi thu hồi. Ở bước **Xem và duyệt**, mục **Kho mã** hiển thị:

| Trường | Ý nghĩa |
|--------|---------|
| Kho mã và nhánh | Tên bạn đã chọn, và kho mã đó riêng tư hay không. |
| **Commit** | SHA commit đầy đủ mà nhánh trỏ tới lúc plan được tạo. |
| **Tải vào** | `/workspace/<repo>`. |
| **Quyền của TOSE** | Chỉ đọc nội dung kho mã (`contents:read`). |
| **Khi khởi động lần đầu** | Tác động của bước bootstrap, diễn đạt bằng lời. |

Mục `curated.repository` của plan chứa cùng dữ liệu: `installation_id`, `repo_id`, `full_name`, `private`, `branch`, `commit_sha`, `path`, `access` và `effects`. Nó không bao giờ chứa token hay URL có credential.

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
- **Agent không bao giờ nhận token hay credential remote có thể tái sử dụng.** URL `origin` giữ nguyên `https://github.com/<owner>/<repo>.git`. Agent có thể commit cục bộ nhưng **không thể push**. Ghi ngược lên GitHub sẽ là một hành động riêng mà bạn phải duyệt.
- Bản clone là commit đã ghim với lịch sử nông (depth 50). Submodule và đối tượng Git LFS không được tải.
- Bootstrap đã hoàn tất sẽ không chạy lại, và một lần chạy lặp không bao giờ ghi đè công việc trong checkout hiện có.
- Nếu `/workspace/<repo>` đã là một git checkout, nó được giữ nguyên. Nếu nó chứa thứ khác (một file, symlink, hoặc thư mục không rỗng không có `.git`), checkout bị từ chối với `WORKSPACE_NOT_EMPTY`.

## Trạng thái và các trường hợp lỗi

**Duyệt** và **cài đặt** kiểm tra lại kho mã. Nếu một điều dưới đây xảy ra, chúng từ chối với `409 PLAN_BLOCKED`, và plan mới có cùng vấn đề được lưu ở trạng thái bị chặn:

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
| **Đang tải** (`cloning`) | Bootstrap Job đang chạy. |
| **Sẵn sàng** (`ready`) | Kho mã đã nằm trong `/workspace/<repo>`. |
| **Thất bại** (`failed`) | Xem mã bên dưới. Deployment thất bại với `<CODE>: <lý do>` và **agent không được khởi động**. |

Đối tượng `repository` của installation có `status`, `error_code` (khi thất bại), `attempts`, `full_name`, `branch`, `commit` (7 ký tự), `commit_sha`, `path`, `description` và, khi thất bại, `retry_path`.

Một checkout thất bại mang một trong sáu mã ở trên, hoặc:

| Mã | Lý do |
|----|-------|
| `WORKSPACE_NOT_EMPTY` | `/workspace` đã có file ở chỗ kho mã sẽ nằm, nên không có gì bị ghi đè. |
| `BOOTSTRAP_FAILED` | Chính việc clone thất bại. Chỉ mã thoát được đọc lại, không bao giờ đọc output của git. |

### Thử lại checkout thất bại

Hãy sửa nguyên nhân (cho phép lại kho mã trên GitHub, kết nối lại tài khoản, chọn nhánh khác), rồi chọn **Thử lại tải kho mã**, hoặc gọi API với vai trò owner hoặc admin:

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

## Liên quan

- Nguồn chuẩn: `docs/curated-agent-templates.md` (mục "GitHub repository"), `docs/agent-runtime-security.md` (mục "Trusted repository bootstrap") và `internal/apispec/openapi.yaml` trong `saasvn/tose-app`.
