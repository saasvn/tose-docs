# API deploy và resume template

Các endpoint khởi động một instance template: deploy, và "issue token and resume" cho instance Dewee hoặc GoClaw đang bị `suspended`. Cả hai nằm dưới `/api/workspaces/{slug}/templates/{template_slug}`, dùng cùng cách [xác thực](/vi/api/authentication) với phần còn lại của API, và cần vai trò **owner** hoặc **admin** của workspace (và scope `deployments:execute` nếu dùng API key). Spec OpenAPI liệt kê đầy đủ trường request và response.

## Deploy template {#deploy}

`POST /api/workspaces/{slug}/templates/{template_slug}/deploy` xếp một deployment vào hàng đợi và trả về với trạng thái `pending`. Poll deployment hoặc stream log cho tới khi nó là `running` hoặc `failed`.

### Template bị `suspended` cần có số dư {#suspended-needs-balance}

Khi ví hết tiền, billing đặt template về `suspended`. Deploy khởi động lại compute, nên template đang `suspended` chỉ deploy được khi **số dư ví dương**.

| Status | Ý nghĩa |
|--------|---------|
| `402` | Template đang `suspended` và số dư ví không dương. Body có code `INSUFFICIENT_BALANCE`. Không có gateway token nào được cấp, không có gì được xếp hàng, và template vẫn `suspended`. Hãy nạp tiền rồi deploy lại. |
| `409` | Deploy đọc template trước khi billing tạm ngưng nó, nên bị chạy đua với việc tạm ngưng. Không có gì được xếp hàng; hãy gửi lại request, lần này sẽ được kiểm tra với số dư. |

Template ở trạng thái khác vẫn deploy như trước, bất kể số dư. Các lỗi khác của endpoint này (`400`, `404`, `409`) có trong spec OpenAPI.

## Issue token and resume {#resume}

`POST /api/workspaces/{slug}/templates/{template_slug}/resume` khởi động lại instance Dewee hoặc GoClaw đang **suspended** mà billing không thể đưa trở lại (xem [Instance Dewee và GoClaw sau khi nạp tiền](/vi/guide/pricing#suspended-gateway-templates)).

Endpoint nhận cùng body với [Deploy](#deploy), cần cùng vai trò và action (`deployment.execute`, nên request có trong nhật ký kiểm toán API), và chạy pipeline redeploy bình thường: gateway token được cấp hoặc giữ nguyên, Secret và Deployment của workload được pipeline ghi lại. Lịch sử deployment ghi trigger `resume_with_token` cùng người đã bắt đầu.

Sau đó, client phải gửi token mới được cấp, và các phiên đang hoạt động kết thúc khi pod khởi động lại. Admin workspace đọc được token trong mục biến của template.

| Status | Ý nghĩa |
|--------|---------|
| `201` | Deployment được xếp hàng, trả về với trạng thái `pending` như Deploy. |
| `400` | Template không phải Dewee hoặc GoClaw nên không có gateway token. |
| `402` | Số dư ví không dương (`INSUFFICIENT_BALANCE`). |
| `409` | Template không `suspended` (hãy dùng Deploy), hoặc một resume, deploy hay lần nạp tiền khác đã nhận nó trước. |
| `422`, `409`, `500` | Gateway token đã lưu không hợp lệ, xung đột hoặc không kiểm tra được; xem [Mã gateway token](#gateway-token-codes). |

## Mã gateway token {#gateway-token-codes}

Dewee và GoClaw không bao giờ được khởi động khi thiếu gateway token hợp lệ, vì instance không có token sẽ truy cập được mà không cần xác thực. Khi bước kiểm tra thất bại, instance không được khởi động lại; Deploy và Resume trả về mã (token bị thiếu không phải lỗi ở đó, vì chúng tự cấp token), còn billing ghi nó thành một mục `system` thất bại trong lịch sử deployment khi từ chối resume. Không mã, thông báo hay dòng log nào chứa token.

| Mã | HTTP | Ý nghĩa | Cách xử lý |
|----|------|---------|-----------|
| `GATEWAY_TOKEN_MISSING` | không có (chỉ lịch sử) | Chưa lưu token, hoặc workload đang chạy không đọc Secret `<deployment>-env`, hoặc Secret đó không có `GOCLAW_GATEWAY_TOKEN` hợp lệ. Token đã lưu trong biến nhưng chưa deploy thì không được tính. | Dùng **Issue token and resume**, hoặc redeploy. |
| `GATEWAY_TOKEN_INVALID` | 422 | Token đã lưu rỗng, là placeholder, ngắn hơn 32 ký tự, dài hơn 256, hoặc sai định dạng. | Đặt `GOCLAW_GATEWAY_TOKEN` mới (từ 32 ký tự ngẫu nhiên trở lên) rồi redeploy. |
| `GATEWAY_TOKEN_CONFLICT` | 409 | `GOCLAW_GATEWAY_TOKEN` và `DEWEE_GATEWAY_TOKEN` cùng được đặt nhưng khác giá trị. | Đặt cả hai cùng giá trị, hoặc chỉ giữ một. |
| `GATEWAY_TOKEN_UNAVAILABLE` | 500 | Không thể kiểm tra hoặc lưu token. | Thử lại; liên hệ hỗ trợ nếu còn lỗi. |

`GATEWAY_TOKEN_REQUIRED` (409) là trường hợp khác: việc xóa biến `GOCLAW_GATEWAY_TOKEN` của instance Dewee hoặc GoClaw bị từ chối. Hãy đặt giá trị mới để xoay token.

Khi billing để instance ở trạng thái suspended, chủ workspace cũng nhận một email kèm liên kết tới instance. Mục lịch sử và email không lặp lại cho cùng instance và cùng lý do trong vòng 24 giờ.
