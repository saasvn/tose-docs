# API GitHub

Các endpoint để tìm repository, branch và GitHub App installation mà một workspace dùng được. Chúng cung cấp dữ liệu cho [kết nối Git của dự án](/vi/api/projects#git-connection).

Khác với đa số endpoint, các endpoint này nằm dưới `/api/github`, không nằm dưới workspace. Truyền workspace bằng tham số query `workspace_slug` (chấp nhận alias `workspace`).

## Ai gọi được gì

| Endpoint | User session | API key |
|----------|--------------|---------|
| `GET /api/github/repos` | có | cần scope `projects:read` |
| `GET /api/github/repos/{owner}/{repo}/branches` | có | cần scope `projects:read` |
| `GET /api/github/installations` | có | cần scope `projects:read` |
| `GET /api/github/available-installations` | có | cần scope `projects:read` |
| `POST /api/github/check-install` | có | bị từ chối `403` |
| `POST /api/github/workspace-installations` | có | bị từ chối `403` |
| `DELETE /api/github/workspace-installations/{installation_id}` | có | bị từ chối `403` |

API key nêu workspace khác workspace của chính nó trong `workspace_slug` nhận `403`. API key bỏ tham số này sẽ dùng các installation gắn với tài khoản của người tạo key. Ba endpoint ghi thay đổi tài khoản của người dùng hoặc mức tin cậy của workspace, nên chỉ dùng được với user session đã đăng nhập, không dùng với API key hay connected app. Xem [Xác thực](/vi/api/authentication).

## Endpoint đọc

Tất cả trả mảng JSON thuần, có thể rỗng, trừ `GET /api/github/repos` trả `400` khi không có GitHub App installation nào truy cập được. `503` nghĩa là GitHub App chưa được cấu hình trên hệ thống này.

### Liệt kê repository {#repos}

```http
GET /api/github/repos?workspace_slug={slug}
```

Các repository mà GitHub App của TOSE đọc được, loại trùng theo `full_name`. Với `workspace_slug`, chỉ tìm trong các installation đã gắn vào workspace đó và bạn phải là thành viên. Thêm `installation_id` để liệt kê một installation; khi đó lỗi trả `500`. Nếu không có, installation nào tải lỗi sẽ bị bỏ qua.

Thêm `fork_of=owner/repo` để chỉ nhận các repository mà GitHub báo là fork của repository đó, trực tiếp (`parent_full_name`) hoặc xa hơn trong mạng fork (`source_full_name`). Owner gồm chữ cái, chữ số và dấu gạch ngang đơn ở giữa (tối đa 39 ký tự). Tên repository gồm 1 đến 100 chữ cái, chữ số, dấu chấm, dấu gạch dưới và dấu gạch ngang, trừ `.` và `..`. Giá trị khác trả `400`. Các fork của mỗi installation được đọc lần lượt từng cái, những fork có tên giống repository đích được đọc trước, tối đa 10 fork cho mỗi installation; fork không đọc được sẽ bị bỏ qua.

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `full_name` | string | `owner/repo`. Dùng làm `repo_full_name` khi kết nối |
| `private` | boolean | Repository có private không |
| `fork` | boolean | GitHub có báo repository là một fork không |
| `default_branch` | string | Branch mặc định |
| `description`, `language` | string | Metadata của repository |
| `html_url`, `clone_url` | string | Liên kết GitHub |
| `installation_id` | integer | Installation đang cho thấy repository. Bỏ qua khi bằng `0` |
| `parent_full_name` | string | Chỉ có trong kết quả `fork_of`: repository mà fork này được tạo từ đó |
| `source_full_name` | string | Chỉ có trong kết quả `fork_of`: gốc của mạng fork này |

### Liệt kê branch {#branches}

```http
GET /api/github/repos/{owner}/{repo}/branches?workspace_slug={slug}
```

Các branch của repository, đọc qua một installation: `installation_id` nếu có; nếu không, với `workspace_slug` thì dùng installation duy nhất đã gắn vào workspace (`400` khi workspace không có hoặc có nhiều); nếu không nữa thì dùng installation mặc định của tài khoản. Kết quả có thể lấy từ cache ngắn hạn. Mỗi mục có `name`, `protected` và object `commit`.

### Liệt kê installation {#installations}

```http
GET /api/github/installations?workspace_slug={slug}
```

Các installation đã gắn vào workspace hoặc đang được dự án của nó dùng. Mỗi mục có `id`, `account_name`, `avatar_url` và `type` (`User` hoặc `Organization`). Không có `workspace_slug`, bạn thấy các installation gắn với tài khoản của mình.

### Liệt kê installation có thể gắn {#available-installations}

```http
GET /api/github/available-installations?workspace_slug={slug}
```

Các installation của workspace cùng các installation gắn với tài khoản của bạn, mỗi mục có cờ `attached`. Dùng để chọn `installation_id` cần gắn.

## Cài đặt và gắn (chỉ user session)

### Kiểm tra hoặc liên kết installation {#check-install}

```http
POST /api/github/check-install
```

| Request | Kết quả |
|---------|--------|
| Không có body | Trạng thái hiện tại: `installed`, kèm `install_url` khi app chưa được cài |
| `{ "installation_id": 123 }` | Liên kết một installation đã biết vào tài khoản của bạn, sau khi kiểm tra danh tính GitHub của chính bạn truy cập được nó (`403` nếu không, `400` khi GitHub không thấy nó) |
| `?poll=true&timeout=120` | Chờ tối đa `timeout` giây (1-300, mặc định 120) cho tới khi installation xuất hiện rồi trả về |

Với `workspace_slug`, câu trả lời được thu hẹp theo workspace đó và có thể đặt `needs_workspace_attach`. `install_url` chứa một token ngắn hạn định danh bạn: hãy mở nó trong trình duyệt, nhưng không ghi log hay chia sẻ.

### Gắn vào workspace {#attach}

```http
POST /api/github/workspace-installations
```

```json
{ "workspace_slug": "my-workspace", "installation_id": 12345678 }
```

Cho phép workspace dùng một installation đã liên kết với tài khoản của bạn. Cần vai trò `owner` hoặc `admin` của workspace. Gắn một installation hai lần vẫn thành công và làm mới thông tin tài khoản đã lưu. `workspace_slug` có thể gửi trong body hoặc dưới dạng tham số query.

### Gỡ khỏi workspace {#detach}

```http
DELETE /api/github/workspace-installations/{installation_id}?workspace_slug={slug}
```

Cần vai trò `owner` hoặc `admin`. Trả `409` khi bất kỳ dự án nào của workspace, kể cả dự án đã xóa và dự án đã gỡ kết nối Git, đang hoặc từng có kết nối qua installation đó; thông báo liệt kê slug các dự án.

## Liên quan

- [API dự án](/vi/api/projects)
- [Tích hợp Git](/vi/guide/git)
