# Mã lỗi

Mọi response lỗi JSON của TOSE API đều có cùng một envelope.

```json
{
  "error": "Project not found",
  "code": "not_found",
  "message": "Project not found",
  "request_id": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "retryable": false,
  "doc_url": "https://docs.tose.sh/api/errors#not_found"
}
```

| Trường | Mô tả |
|--------|-------|
| `code` | Mã ổn định, đọc được bằng máy, dạng snake_case (deploy, rollback và bước kiểm tra số dư của redeploy dùng UPPER_SNAKE_CASE). Hãy xử lý theo trường này. |
| `message` | Nội dung cho người đọc. Câu chữ có thể đổi, đừng phân tích nó. |
| `request_id` | ID của request lỗi, bằng header `X-Request-ID` của response. Hãy gửi cho bộ phận hỗ trợ. |
| `retryable` | `true` khi gửi lại y nguyên request có thể thành công. |
| `details` | Ngữ cảnh bổ sung, chỉ có với một số mã. |
| `doc_url` | Liên kết tới mục của mã này trong trang này. |
| `error` | Cùng nội dung với `message`, giữ lại cho client cũ. |

Response thành công, stream và WebSocket upgrade không dùng envelope này.

```typescript
const res = await fetch(url, { headers: { 'X-API-Key': key } })
if (!res.ok) {
  const err = await res.json()
  if (err.retryable) {
    // chờ rồi thử lại với backoff
  } else if (err.code === 'credentials_in_url') {
    // sửa client: gửi key trong header X-API-Key
  }
  console.error(err.code, err.request_id)
}
```

## Mã lỗi REST API

Mỗi HTTP status có một mã mặc định. Handler có thể trả mã cụ thể hơn cho cùng status, ví dụ
`credentials_in_url` cho `400`.

### `invalid_request` {#invalid_request}

`400`. Request sai định dạng hoặc không qua được bước kiểm tra. Hãy sửa request. Không thử lại.

### `credentials_in_url` {#credentials_in_url}

`400`. Query string có tham số `api_key`, `apikey`, `x-api-key` hoặc `access_token`, hoặc một giá
trị bắt đầu bằng `tose_sk_`. API từ chối request trước khi xác thực và không bao giờ dùng secret
đó. Hãy gửi API key trong header `X-API-Key`, hoặc session token trong `Authorization: Bearer`.
Hãy xoay (rotate) mọi key đã bị gửi trong URL. Xem
[Xác thực](/vi/api/authentication#credentials-in-url).

### `unauthenticated` {#unauthenticated}

`401`. Không có credential, hoặc credential không hợp lệ, đã thu hồi hoặc hết hạn. Hãy gửi
credential hợp lệ.

### `payment_required` {#payment_required}

`402`. Ví của workspace không đủ số dư cho hành động này. Hãy nạp tiền rồi thử lại.

### `forbidden` {#forbidden}

`403`. Credential hợp lệ nhưng không được phép làm việc này. API key chỉ dùng được cho workspace
của nó, và một số hành động cần vai trò owner hoặc admin. Người dùng đăng nhập nhưng không phải thành viên
workspace sẽ nhận `404 not_found`.

### `insufficient_scope` {#insufficient_scope}

`403`. Key hoặc kết nối thiếu scope cần thiết. Response nêu scope đó trong `required_scope`. Một
key không thể tạo key khác với scope mà nó không có.

### `not_found` {#not_found}

`404`. Workspace, project hoặc tài nguyên khác không tồn tại, hoặc bạn không thấy được nó.

### `method_not_allowed` {#method_not_allowed}

`405`. Route không hỗ trợ HTTP method này.

### `timeout` {#timeout}

`408`. Server hết thời gian chờ request. Có thể thử lại.

### `conflict` {#conflict}

`409`. Request xung đột với trạng thái hiện tại, ví dụ một thao tác khác trên cùng project đang chạy.

### `gone` {#gone}

`410`. Tài nguyên từng tồn tại và đã bị xóa.

### `payload_too_large` {#payload_too_large}

`413`. Body request lớn hơn mức API chấp nhận.

### `validation_failed` {#validation_failed}

`422`. Body đúng định dạng nhưng một trường không được chấp nhận. Hãy đọc `message` và `details`.

### `locked` {#locked}

`423`. Tài nguyên đang bị khóa.

### `rate_limited` {#rate_limited}

`429`. Quá nhiều request. Hãy chờ rồi thử lại với backoff. Có thể thử lại.

### `internal_error` {#internal_error}

`500`. Lỗi server không mong đợi. Nếu lỗi kéo dài, hãy gửi `request_id`.

### `not_implemented` {#not_implemented}

`501`. Thao tác chưa khả dụng.

### `upstream_error` {#upstream_error}

`502`. Cụm Kubernetes hoặc một dịch vụ upstream khác từ chối hoặc làm hỏng thao tác. An toàn để
thử lại.

### `unavailable` {#unavailable}

`503`. Một tích hợp cần thiết, như GitHub App, chưa được cấu hình hoặc không kết nối được. Có thể
thử lại.

### `upstream_timeout` {#upstream_timeout}

`504`. Một dịch vụ upstream không trả lời kịp. Có thể thử lại.

Mọi status lỗi khác dùng mã `http_<status>`.

## Mã lỗi upstream của GitHub

Các route gọi GitHub thay bạn báo lỗi bằng một trong các mã dưới đây, thay cho `upstream_error` hoặc `unavailable` chung chung. Phản hồi không bao giờ chứa nội dung lỗi gốc của GitHub vì nó có thể có URL và ID installation. Hãy rẽ nhánh theo `code` và `details.reason`. Chúng áp dụng cho `GET /api/github/repos` (khi có `installation_id`), `GET /api/github/repos/{owner}/{repo}/branches`, và bước kiểm tra repository khi tạo project hoặc kết nối Git. Xem [GitHub API](/vi/api/github).

### `github_not_found` {#github_not_found}

`404`. `details.reason` cho biết cách sửa. `installation_not_found`: installation của GitHub App không còn tồn tại, hãy cài lại GitHub App của TOSE và gắn lại vào workspace. `repository_not_found`: repository không tồn tại hoặc App chưa được cấp quyền truy cập, hãy cấp cho App quyền vào repository. Không thể thử lại.

### `github_forbidden` {#github_forbidden}

`403`. GitHub từ chối yêu cầu, ví dụ vì GitHub App của TOSE thiếu quyền mà thao tác cần. Hãy kiểm tra quyền của App. Gửi lại y nguyên không giúp ích. Không thể thử lại.

### `github_rate_limited` {#github_rate_limited}

`429`. GitHub giới hạn tốc độ yêu cầu. Chờ số giây trong header `Retry-After` rồi thử lại. Có thể thử lại.

### `github_unavailable` {#github_unavailable}

`503`. GitHub không trả lời. Hãy thử lại sau ít lâu với backoff. Có thể thử lại.

### `github_app_misconfigured` {#github_app_misconfigured}

`500`. GitHub từ chối thông tin xác thực của chính GitHub App của TOSE. Đây là lỗi cấu hình phía máy chủ, bạn không sửa được từ client. Hãy liên hệ hỗ trợ và gửi kèm `request_id`. Không thể thử lại.

Khi lỗi xảy ra lúc kiểm tra repository ở bước tạo project hoặc kết nối Git, trạng thái là `400` cho mọi mã trên, `retryable` là `false`, và `message` bắt đầu bằng `Cannot access repository <owner/repo>` cho client cũ. Hãy dùng `code` và `details.reason`, không dùng message.

## Mã lỗi của hành động deploy

`POST .../deploy` và `POST .../deployments/{id}/rollback` trả mã riêng của hành động theo dạng UPPER_SNAKE_CASE, không phải mã suy ra từ HTTP status. `POST .../redeploy` chỉ làm vậy với `INSUFFICIENT_BALANCE`; các lỗi khác của redeploy giữ mã snake_case ở trên. Lỗi quyền truy cập ở cả ba route (`not_found`, `forbidden`) cũng là snake_case. Tool MCP `deploy_project` và `rollback_deployment` báo cùng các mã này. Envelope không đổi, nên `doc_url` của mỗi lỗi kết thúc bằng anchor bên dưới, ví dụ `https://docs.tose.sh/api/errors#INSUFFICIENT_BALANCE`.

Client từng so sánh `code` với `payment_required`, `unavailable`, `invalid_request`, `not_found` hoặc `internal_error` ở deploy và rollback phải đổi sang so sánh với các mã dưới đây. Ở redeploy chỉ `payment_required` đổi thành `INSUFFICIENT_BALANCE`. Mọi route khác vẫn dùng mã snake_case ở trên.

### `INSUFFICIENT_BALANCE` {#INSUFFICIENT_BALANCE}

`402`. Ví của workspace đã hết tiền (số dư bằng 0 hoặc âm) hoặc không có ví, nên deploy bị từ chối và không có deployment nào được tạo. Chủ workspace nạp tiền ở trang billing rồi gửi lại request. Không nên retry cho đến khi số dư dương. Xem [Bảng giá](/vi/guide/pricing).

### `UNAVAILABLE` {#UNAVAILABLE}

`503`. GitHub App chưa được cấu hình trên instance TOSE này, nên không đọc được commit đầu của nhánh. `retryable` là `true`. Chưa có gì được tạo. Hãy thử lại sau; với instance tự host, hãy cấu hình GitHub App.

### `NO_GIT_CONNECTION` {#NO_GIT_CONNECTION}

`400`. Project chưa kết nối repository Git nào nên không có gì để build. Hãy kết nối repository rồi deploy lại.

### `NO_SERVER` {#NO_SERVER}

`400`. Project chưa được gán server (cụm Kubernetes). Hãy gán server cho project rồi deploy hoặc rollback lại. Redeploy trả `400 invalid_request` trong trường hợp này.

### `INVALID_REPO` {#INVALID_REPO}

`400`. Tên repository đã kết nối không có dạng `owner/name`. Hãy ngắt kết nối và kết nối lại repository.

### `NO_IMAGE` {#NO_IMAGE}

`400`. Chỉ với rollback: deployment đích không có Docker image đã build, ví dụ vì build bị lỗi. Hãy chọn một deployment trước đó đã build thành công.

### `NOT_FOUND` {#NOT_FOUND}

`404`. Chỉ với rollback: id deployment không tồn tại trong project này. Project hoặc workspace mà bạn không xem được dùng mã snake_case `not_found`.

### `UPSTREAM_ERROR` {#UPSTREAM_ERROR}

`500`. GitHub không trả client hoặc commit đầu của nhánh, ví dụ do installation mất quyền truy cập. Hãy kiểm tra GitHub App còn đọc được repository, rồi thử lại. `retryable` là `false`.

### `INTERNAL` {#INTERNAL}

`500`. Lỗi bất ngờ của server khi ghi lại deployment hoặc rollback. Nếu lặp lại, hãy gửi `request_id` cho bộ phận hỗ trợ.

### `ROLLBACK_FAILED` {#ROLLBACK_FAILED}

`500`. Chỉ với rollback: khởi chạy image cũ thất bại. Message nêu lý do; lỗi có thể đến từ cụm hoặc từ một bước trước đó như đọc server, secret của project hoặc ổ đĩa. Hãy đọc message, sửa nguyên nhân rồi thử lại hoặc chọn deployment khác.

## Lỗi của tool MCP

MCP connector báo lỗi tool bằng mã dạng UPPER_SNAKE_CASE. Deploy và rollback dùng chung các mã ở mục hành động deploy ở trên; các mã còn lại tách biệt với mã REST.
Tool làm thay đổi hệ thống sẽ trả về một kế hoạch trước, và người dùng duyệt kế hoạch đó rồi nó mới
được chạy.

### Phê duyệt

| Mã | Ý nghĩa | Cách xử lý |
|----|---------|------------|
| `APPROVAL_PENDING` | Người dùng chưa duyệt kế hoạch. | Nhờ người dùng duyệt ở liên kết trong thông báo, rồi gọi lại. |
| `APPROVAL_EXPIRED` | Kế hoạch không được duyệt kịp. Không có gì thay đổi. | Gọi lại tool không kèm `approval_token` để nhận kế hoạch mới. |
| `APPROVAL_DECLINED` | Người dùng từ chối kế hoạch. Không có gì thay đổi. | Không thử lại trừ khi người dùng yêu cầu. |
| `APPROVAL_INVALID` | `approval_token` không hợp lệ hoặc được cấp cho hành động khác. | Gọi lại không kèm token để nhận kế hoạch mới. |
| `APPROVAL_USED` | Phê duyệt đã bị từ chối hoặc đã dùng mà không tạo ra deployment. | Yêu cầu kế hoạch mới. |

### Quyền truy cập

| Mã | Ý nghĩa | Cách xử lý |
|----|---------|------------|
| `INSUFFICIENT_SCOPE` | Kết nối thiếu scope cho tool này. Kết nối chỉ đọc không thể deploy hoặc rollback. | Kết nối lại và cho phép scope còn thiếu. |
| `FORBIDDEN` | Người dùng đã kết nối không được phép làm việc này, ví dụ không còn là thành viên workspace, hoặc không phải owner/admin khi deploy. | Dùng người dùng có đúng vai trò. |
| `UNAUTHENTICATED` | Kết nối không có credential hợp lệ. | Kết nối lại. |

### Deployment

| Mã | Ý nghĩa | Cách xử lý |
|----|---------|------------|
| `DEPLOY_FAILED` | Deployment kết thúc ở trạng thái thất bại. Thông báo nêu trạng thái và lý do. | Đọc log build bằng `read_logs` với `source=build`. |
| `DEPLOY_IN_PROGRESS` | Một deployment khác của project vẫn đang chạy. | Chờ bằng `get_deployment_status`. |
| `NO_GIT_CONNECTION` | Project chưa có repository Git. | Kết nối một repository trong dashboard. |
| `NO_SERVER` | Project chưa cấu hình server. | Cấu hình server trong dashboard. |
| `NO_IMAGE` | Deployment không có image đã build để rollback. | Chọn deployment mà `inspect_deployment` hiển thị `can_rollback_to=true`. |

### Chung

| Mã | Ý nghĩa |
|----|---------|
| `INVALID_ARGUMENT` | Thiếu hoặc sai một tham số của tool. |
| `NOT_FOUND` | Project hoặc deployment không tồn tại. |
| `CONFLICT` | Một thao tác khác trên project đang chạy. Hãy thử lại sau ít phút. |
| `UNAVAILABLE` | Một dependency không kết nối được. Không có gì thay đổi. Hãy thử lại. |
| `UPSTREAM_ERROR` | Một dịch vụ upstream, như Git host, bị lỗi. |
| `INTERNAL` | Lỗi server không mong đợi. |
