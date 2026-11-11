# Cloud Harness

Cloud Harness là một template chạy các coding agent và công cụ trên Docker host riêng của bạn, truy
cập qua MCP và đăng nhập bằng TOSE. Bạn tạo một instance trong workspace, thêm endpoint MCP của nó
vào MCP client, rồi đăng nhập bằng tài khoản TOSE. Các job cần Docker chạy trên **docker host**
riêng của instance, và docker host không tốn tiền khi đang rảnh.

::: info Tính khả dụng
Cloud Harness được bật theo từng bản cài đặt TOSE. Nếu Cloud Harness không có trong danh mục
template và các endpoint `runtimes` trả về 404 cho workspace của bạn, tính năng này chưa được bật.
:::

## Cách hoạt động {#how-it-works}

Mỗi instance có:

- **Pod của instance**: runner của Cloud Harness và các container chạy cạnh nó. Pod chạy từ lần
  triển khai đầu tiên cho tới khi bạn dừng hoặc xóa instance.
- **Một docker host**: một Docker engine trong pod được cách ly (sandbox), chỉ instance này dùng.
  Trong API, đây là [runtime](/vi/api/runtimes) của instance. Docker host tự thức dậy khi một job
  cần Docker và tự tạm dừng khi rảnh một thời gian, nên không có nút đánh thức.
- **Hai ổ đĩa**: ổ đĩa trạng thái của instance và ổ đĩa của docker host. Cả hai được giữ nguyên khi
  docker host tạm dừng và khi instance đang dừng. Chúng bị xóa cùng với instance.

### Các trạng thái của docker host {#docker-host-states}

| Trạng thái | Ý nghĩa |
|------------|---------|
| `cold` | Đang nghỉ: đã giải phóng tài nguyên tính toán, giữ ổ đĩa, không tính phí tính toán |
| `waking` | Đang khởi động trên ổ đĩa của nó |
| `ready` | Đang chạy job; tính phí tính toán theo giây |
| `suspending` | Đang dừng tài nguyên tính toán |
| `suspend_failed` | Lần tạm dừng chưa hoàn tất; hãy tạm dừng lại |
| `error` | Có lỗi xảy ra; xem `last_error` và danh sách thao tác |
| `deleting` | Đang xóa docker host và ổ đĩa của nó |

Mỗi thay đổi (tạo, đánh thức, tạm dừng, xóa) là một **operation** có trạng thái riêng. Trang
instance liệt kê các thao tác gần đây, kèm người khởi tạo: một người dùng, một API key, hoặc chính
TOSE.

## Tạo instance {#create-an-instance}

Bạn cần:

- vai trò **owner** hoặc **admin** trong workspace;
- số dư ví lớn hơn 0 (không có phí mở khóa, nhưng ví trống không thể phát sinh chi phí mới);
- workspace còn chỗ trong [giới hạn số instance](#instance-limit).

Trên dashboard:

1. Mở **Ứng dụng đã cài** (Installed apps, nhóm **Ứng dụng & mẫu**) trong workspace và chọn **Tạo mẫu**.
2. Chọn **Cloud Harness**. Thẻ này hiển thị chi phí của instance và số
   instance workspace đang có.
3. Nhập tên và chọn kích thước: 1 hoặc 2 vCPU, RAM 2 GB hoặc 4 GB. Cloud Harness chỉ chấp nhận các
   kích thước này.
4. Điền các thiết lập bắt buộc:

   | Thiết lập | Cần nhập |
   |-----------|----------|
   | `MODEL_GATEWAY_PROVIDER_API_KEY` | API key của nhà cung cấp mô hình. Chỉ model gateway trên docker host nhận key này. |
   | `MODEL_GATEWAY_PROFILES` | Các profile của model gateway, dạng JSON: `{"version":1,"mode":"production","profiles":[...]}` |
   | `RUNNER_TOKEN` | Một chuỗi bí mật ngẫu nhiên dài ít nhất 32 ký tự, ví dụ tạo bằng `openssl rand -hex 32` |

   Provider key và runner token luôn được lưu mã hóa và hiển thị dưới dạng che.
5. Chọn **Tạo & Triển khai**. TOSE tạo instance và docker host của nó, lưu các thiết lập, rồi triển
   khai instance. Bạn được chuyển tới nhật ký triển khai.

URL của instance được cấp ở lần triển khai đầu tiên và hiển thị trên trang instance, trong mục
**Kết nối**.

## Chi phí {#what-it-costs}

Instance tính phí theo mức sử dụng, không có phí mở khóa:

- **Instance** tính phí khi đang chạy, theo giá tính toán cho kích thước của nó cộng với phần tài
  nguyên cố định dành cho các container chạy cạnh runner. Instance đang dừng không tính phí tính
  toán.
- **Docker host** tính phí **theo giây khi đang thức** và **$0 khi đang nghỉ (cold)**.
- **Cả hai ổ đĩa** tính phí theo giá lưu trữ chừng nào instance còn tồn tại, kể cả khi đang dừng.

Giá dùng mức compute tiêu chuẩn. Danh mục template tính sẵn các mức giá này, và
dashboard hiển thị chúng trên thẻ Cloud Harness, còn giá docker host thì hiển thị trên trang
instance. Xem [Bảng giá](/vi/guide/pricing#cloud-harness) để biết cách tính từng phần.

Nếu ví hết tiền, TOSE dừng các instance đang chạy và tạm dừng docker host của chúng. Ổ đĩa và dữ
liệu được giữ lại.

### Giới hạn số instance {#instance-limit}

Mỗi workspace chỉ có một số lượng instance Cloud Harness giới hạn. Giới hạn mặc định là 5; bản cài
đặt TOSE của bạn có thể đặt giá trị khác. Trường `max_instances` trong danh mục và thẻ Cloud Harness
hiển thị giới hạn hiện tại. Hãy xóa một instance để có chỗ; instance đang bị xóa vẫn được tính cho
đến khi docker host của nó được xóa xong.

## Đăng nhập vào instance {#sign-in-to-an-instance}

1. Mở trang instance và tìm mục **Kết nối**. Mục này hiển thị **URL của instance** và **Endpoint
   MCP**, tức URL của instance cộng thêm `/mcp`.
2. Thêm endpoint MCP vào MCP client của bạn dưới dạng máy chủ từ xa.
3. Client chuyển bạn sang TOSE. Đăng nhập bằng tài khoản TOSE và chấp thuận kết nối.

Chỉ những thành viên workspace sau được đăng nhập:

- **owner** và **admin** của workspace;
- thành viên đã **tạo** instance;
- các thành viên được owner hoặc admin [cấp quyền truy cập](#grant-workspace-members-access).

Đăng nhập chỉ hoạt động qua URL mặc định của instance, tức URL hiển thị trong mục **Kết nối**. Tên
miền tùy chỉnh gắn vào instance không chấp nhận đăng nhập bằng TOSE. Người ngoài workspace không
đăng nhập được.

## Cấp quyền truy cập cho thành viên workspace {#grant-workspace-members-access}

Owner và admin quản lý những ai khác được đăng nhập, trong tab **Quyền truy cập** của trang
instance:

- **Luôn được phép** liệt kê owner, admin và người tạo instance. Quyền của họ đến từ vai trò và
  không gỡ được ở đây.
- **Thành viên được cấp quyền** liệt kê các thành viên khác được đăng nhập. Chọn một thành viên rồi
  chọn **Thêm thành viên** để cấp quyền, hoặc **Gỡ** để thu hồi.

Gỡ quyền một người sẽ chặn đăng nhập mới ngay lập tức. Access token đã cấp vẫn dùng được tối đa 10
phút. Xóa một thành viên khỏi workspace cũng gỡ quyền của họ trên mọi instance, và thành viên được
mời lại sau đó sẽ bắt đầu mà không có quyền truy cập.

Mọi thành viên đều xem được tab Quyền truy cập; chỉ owner và admin mới thay đổi được.

Danh sách này cũng có qua API:

| Method | Path | Vai trò | Phản hồi |
|--------|------|---------|----------|
| `GET` | `/templates/{template_slug}/access` | member | `200` `{grants: [...]}` |
| `POST` | `/templates/{template_slug}/access` | admin | `201` grant, hoặc `200` nếu thành viên đã có quyền |
| `DELETE` | `/templates/{template_slug}/access/{user_id}` | admin | `204` |

Các path tính từ `https://api-v2.tose.sh/api/workspaces/{workspace_slug}`. Khi cấp quyền, gửi
`{"user_id": "<user-id>"}`, và người dùng phải là thành viên của workspace. API key cần scope
`workspace:read` để đọc danh sách và `members:manage` để thay đổi.

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=ws_your_api_key
export WS=my-workspace

curl -X POST "$TOSE_API/api/workspaces/$WS/templates/my-harness/access" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"user_id": "<user-id>"}'
```

## Docker host {#the-docker-host}

Khung **Docker host** trên trang instance hiển thị trạng thái, hoạt động gần nhất, giá khi sẵn
sàng, CPU và RAM, cùng các thao tác gần đây.

- Docker host **tự thức dậy** khi một job cần Docker. Việc đánh thức cần số dư ví lớn hơn 0.
- Docker host **tự tạm dừng** sau một khoảng thời gian không có hoạt động. Các container đang chạy
  trên đó sẽ dừng; ổ đĩa được giữ nguyên.
- **Tạm dừng** dừng docker host ngay, ví dụ để dừng phí tính toán ngay lập tức. Nó sẽ thức dậy lại
  khi một job cần Docker.

Để quản lý docker host bằng script, xem [API Runtimes](/vi/api/runtimes).

## Xóa instance {#delete-an-instance}

Owner và admin có thể xóa instance từ trang của nó. Việc xóa dừng tính phí tính toán ngay lập tức,
sau đó xóa dần trong nền pod, docker host và cả hai ổ đĩa, danh sách quyền truy cập và các kết nối
đã đăng nhập vào instance. Ổ đĩa đã xóa không khôi phục được.

## Liên quan {#related}

- [API Runtimes](/vi/api/runtimes)
- [Bảng giá](/vi/guide/pricing#cloud-harness)
