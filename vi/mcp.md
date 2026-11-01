# TOSE MCP Connector

TOSE MCP connector cho phép một MCP client như Claude kiểm tra deployment và đọc log trong một workspace TOSE. Khi bạn phê duyệt rõ ràng, client còn có thể deploy hoặc rollback project.

- **Server URL:** `https://<API host của TOSE>/mcp` (Streamable HTTP)
- **Xác thực:** OAuth 2.1 bằng tài khoản TOSE. Client tự tìm mọi thông tin từ server URL nên bạn không cần dán API key.
- **Bật/tắt:** đơn vị vận hành bật connector bằng `MCP_ENABLED=true`. Nếu `/mcp` trả về 404 thì instance TOSE đó chưa bật connector.

## Kết nối

1. Trong MCP client, thêm custom connector với server URL ở trên.
2. Client mở một trang TOSE trên trình duyệt. Đăng nhập nếu được hỏi.
3. Ở màn hình đồng ý, chọn **một workspace**. Kết nối chỉ thấy được workspace đó.
4. Nếu client xin quyền deploy, sẽ có ô **cho phép deploy và rollback**. Để trống nếu chỉ muốn quyền đọc. Chỉ owner và admin của workspace mới tick được ô này.
5. Bấm **Approve** để quay lại client và hoàn tất kết nối.

Muốn kết nối workspace khác thì thêm connector lần nữa và chọn workspace đó.

## Tools

| Tool | Chức năng | Có thay đổi gì không? |
|------|-----------|-----------------------|
| `list_projects` | Liệt kê project trong workspace kèm deployment mới nhất. Có thể truyền `query` và `limit` (tối đa 100). | Không |
| `get_deployment_status` | Trạng thái của một deployment (hoặc deployment mới nhất) và 5 deployment gần nhất. | Không |
| `inspect_deployment` | Commit, branch, tác giả, image, trigger, thời gian, URL và lỗi của một deployment. | Không |
| `read_logs` | `source=build` đọc build log của một deployment. `source=runtime` đọc log ứng dụng gần đây (tối đa 24 giờ, có thể lọc theo `level`). Trả về tối đa 500 dòng và 64 KB. | Không |
| `deploy_project` | Build và deploy commit đầu của branch đã kết nối, đúng commit hiển thị trong kế hoạch. | **Có**, cần phê duyệt |
| `rollback_deployment` | Đưa image của một deployment cũ lên chạy lại. | **Có**, cần phê duyệt |

Connector không có tool gọi API tùy ý. Nó không đọc hay sửa được biến môi trường, domain, database, thanh toán hay thành viên.

### Cơ chế phê duyệt

`deploy_project` và `rollback_deployment` luôn chạy hai bước:

1. Lần gọi đầu không thay đổi gì. Nó trả về một **kế hoạch**, một `approval_url` và một `approval_token` dùng một lần. Kế hoạch cho biết project, phiên bản đang chạy và tác động. Kế hoạch deploy còn cho biết repository, branch và commit sẽ được build. Kế hoạch rollback cho biết deployment đích.
2. Mở `approval_url` trên trình duyệt. TOSE hiển thị kế hoạch dưới tài khoản của bạn. Bấm **Approve** hoặc **Decline**.
3. Bảo client tiếp tục. Client gọi lại tool với token, và chỉ khi đó TOSE mới deploy hoặc rollback.

**Việc phê duyệt diễn ra trong trình duyệt của bạn, tại `approval_url`. Gõ "ok" hay "đồng ý" trong khung chat không phê duyệt được gì.** Client không thể phê duyệt thay bạn: token không có tác dụng cho tới khi bạn phê duyệt kế hoạch trên trang TOSE. Kế hoạch đã bị từ chối sẽ không bao giờ chạy được. Bạn cũng có thể mở lại link và rút lại phê duyệt khi client chưa dùng nó.

Phê duyệt deploy chỉ áp dụng cho commit hiển thị trong kế hoạch. Nếu có người push lên branch trước khi deploy bắt đầu, TOSE từ chối với `APPROVAL_STALE` và không build gì. Hãy yêu cầu kế hoạch mới để xem commit mới.

Token phê duyệt gắn với user, kết nối, project, hành động và deployment đích khi rollback. Token hết hạn sau 10 phút và chỉ dùng được một lần. Nếu client gửi lại một token đã dùng, TOSE trả về deployment ban đầu và không deploy lần nữa.

Mỗi lệnh ghi còn cần đủ các điều kiện sau:

- Kết nối được cấp quyền deploy ở màn hình đồng ý (scope `deployments:write`).
- Tại thời điểm gọi, bạn vẫn là owner hoặc admin của workspace.
- Project không có deployment nào khác đang chạy.

### Mã lỗi

Khi tool lỗi, nội dung trả về bắt đầu bằng một mã cố định:

| Mã | Ý nghĩa |
|----|---------|
| `NOT_FOUND` | Project hoặc deployment không nằm trong workspace đã kết nối. |
| `INVALID_ARGUMENT` | Thiếu tham số hoặc tham số ngoài phạm vi. |
| `INSUFFICIENT_SCOPE` | Kết nối chỉ có quyền đọc. Hãy kết nối lại và cho phép deploy. |
| `FORBIDDEN` | Vai trò của bạn không được deploy hay rollback. |
| `APPROVAL_PENDING` | Bạn chưa phê duyệt kế hoạch. Mở `approval_url`, phê duyệt, rồi bảo client tiếp tục. |
| `APPROVAL_STALE` | Branch có commit mới sau khi bạn phê duyệt. Chưa có gì được deploy. Yêu cầu kế hoạch mới và xem commit mới. |
| `APPROVAL_INVALID`, `APPROVAL_EXPIRED`, `APPROVAL_USED` | Phê duyệt sai, hết hạn, đã bị từ chối, đã rút lại hoặc đã dùng. Gọi tool không kèm `approval_token` để lấy kế hoạch mới. |
| `DEPLOY_IN_PROGRESS` | Theo dõi deployment đang chạy bằng `get_deployment_status`. |
| `NO_GIT_CONNECTION`, `NO_SERVER`, `NO_IMAGE` | Project chưa sẵn sàng cho thao tác này. Sửa trong dashboard. |
| `CONFLICT` | Project đang bị khóa, ví dụ khi chuyển môi trường. |
| `UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL` | Lỗi tạm thời. Thử lại sau. |

## Prompt mẫu

- "Project TOSE nào của tôi deploy lỗi lần gần nhất?"
- "Vì sao lần deploy mới nhất của `shop-api` lỗi? Cho tôi xem các dòng build log liên quan."
- "Cho xem log lỗi của `shop-api` trong 30 phút qua."
- "Deploy `marketing-site`." Client sẽ hiển thị kế hoạch và đường link để bạn phê duyệt.
- "Rollback `shop-api` về deployment trước bản hiện tại."

## Dữ liệu và quyền riêng tư

- **Connector đọc gì:** project, deployment, build log và runtime log của workspace bạn đã chọn, ngoài ra không đọc gì khác.
- **Không bao giờ trả về:** giá trị biến môi trường, thông tin đăng nhập database, registry hay cluster, và API key.
  - Trước khi trả log, commit message và thông báo lỗi, TOSE xóa giá trị biến môi trường của project và các dạng credential phổ biến: URL có mật khẩu, bearer token, private key, token cloud và GitHub, JWT.
  - Việc xóa này chỉ là best effort, vì vậy đừng in secret ra log ứng dụng.
- **TOSE lưu gì:**
  - Thông tin client đã đăng ký: tên và redirect URI.
  - Hash của token. Access token có hạn 1 giờ, refresh token có hạn 30 ngày.
  - Một bản ghi audit cho mỗi lần gọi tool, gồm user, client, workspace, project, deployment, tool, kết quả và mã lỗi. Deploy và rollback được ghi lại trước khi chạy.
  - Với mỗi kế hoạch deploy hoặc rollback: nội dung kế hoạch hiển thị trên trang phê duyệt và việc bạn có phê duyệt hay không.
  - Tham số và kết quả của tool không được lưu.

## Thu hồi quyền

Refresh token có hạn 30 ngày, vì vậy hãy thu hồi kết nối bạn không còn tin tưởng thay vì chờ nó hết hạn. Bạn có thể thu hồi theo các cách sau:

- Trong dashboard, mở **Settings** của workspace, rồi chọn **Agent access**. Trang này liệt kê các kết nối của bạn trong workspace đó. Bấm **Revoke** cạnh kết nối cần thu hồi: client bị đăng xuất ngay và phải kết nối lại. Bạn chỉ thấy và thu hồi được kết nối của chính mình.
- Gỡ connector trong MCP client. Client nào hỗ trợ thu hồi OAuth token sẽ thu hồi ngay.
- Từ phiên dashboard đã đăng nhập, gọi `DELETE /api/mcp/connections/{family_id}`. Dùng `GET /api/mcp/connections` để xem danh sách kết nối. API key không gọi được hai route này; xem [API key và scope](/vi/api/api-keys#route-tu-choi-api-key).
- Khi bạn mất quyền thành viên workspace, kết nối bị cắt ngay. Nếu bạn bị hạ xuống member, quyền deploy bị gỡ ngay.

## Hỗ trợ

Để được hỗ trợ hoặc báo lỗi connector, hãy liên hệ đơn vị vận hành instance TOSE của bạn và gửi kèm thời điểm gọi cùng mã lỗi.
